import { randomUUID } from 'crypto';
import { dataStore } from '../store/DataStore';
import {
  DiagnosisRecord,
  ResponseEntry,
  ResponseSession,
  ResultRecord,
  StepDefinition,
} from '../types';
import { determineNextStepId, StepAnswerPayload } from '../utils/BranchingEngine';
import { asyncQueue } from '../utils/AsyncQueue';
import { calculateScores } from '../utils/ScoringEngine';
import { getTemplateById } from './TemplateService';

interface PlayerResponseInput {
  diagnosisId: string;
  sessionId?: string;
  currentStepId: string;
  answer: unknown;
  respondentEmail?: string;
}

interface PlayerResponseOutput {
  sessionId: string;
  nextStep: StepDefinition | null;
  isComplete: boolean;
}

interface SessionCompletionInput {
  diagnosisId: string;
  sessionId: string;
  respondentEmail?: string;
}

const extractAnswerPayload = (step: StepDefinition, answer: unknown): { stored: unknown; payload: StepAnswerPayload } => {
  if (step.type === 'multiple_choice') {
    if (typeof answer === 'string') {
      validateChoice(step, answer);
      return { stored: answer, payload: { choiceId: answer } };
    }
    if (typeof answer === 'object' && answer !== null && 'choiceId' in answer) {
      const choiceId = String((answer as Record<string, unknown>).choiceId);
      validateChoice(step, choiceId);
      return { stored: choiceId, payload: { choiceId } };
    }
    throw new Error('Invalid choice answer');
  }
  if (step.type === 'text') {
    let text: string | undefined;
    if (typeof answer === 'string') {
      text = answer;
    } else if (typeof answer === 'object' && answer !== null && 'text' in answer) {
      text = String((answer as Record<string, unknown>).text ?? '');
    }
    if (typeof text !== 'string') {
      throw new Error('Invalid text answer');
    }
    return { stored: text, payload: { text } };
  }
  throw new Error('Unsupported step type');
};

const validateChoice = (step: StepDefinition, choiceId: string): void => {
  const exists = step.choices?.some((choice) => choice.id === choiceId);
  if (!exists) {
    throw new Error('Unknown choice');
  }
};

const ensureDiagnosis = (diagnosisId: string): DiagnosisRecord => {
  const diagnosis = dataStore.getDiagnosis(diagnosisId);
  if (!diagnosis) {
    throw new Error('Diagnosis not found');
  }
  return diagnosis;
};

const getStep = (diagnosis: DiagnosisRecord, stepId: string): StepDefinition => {
  const step = diagnosis.scenarioData.steps[stepId];
  if (!step) {
    throw new Error(`Step ${stepId} not found`);
  }
  return step;
};

const ensureSession = (diagnosisId: string, sessionId?: string): ResponseSession | undefined => {
  if (!sessionId) {
    return undefined;
  }
  const session = dataStore.getSession(sessionId);
  if (!session || session.diagnosisId !== diagnosisId) {
    throw new Error('Session not found');
  }
  return session;
};

export const handlePlayerResponse = (input: PlayerResponseInput): PlayerResponseOutput => {
  const diagnosis = ensureDiagnosis(input.diagnosisId);
  const now = new Date().toISOString();
  let session = ensureSession(input.diagnosisId, input.sessionId);

  if (!session) {
    session = {
      id: randomUUID(),
      diagnosisId: input.diagnosisId,
      currentStepId: input.currentStepId,
      responses: [],
      completed: false,
      createdAt: now,
      updatedAt: now,
    };
  }

  if (session.completed) {
    throw new Error('Session already completed');
  }

  const step = getStep(diagnosis, input.currentStepId);
  const { stored, payload } = extractAnswerPayload(step, input.answer);

  const entry: ResponseEntry = {
    stepId: step.id,
    answer: stored,
    createdAt: now,
  };

  session.responses.push(entry);
  if (input.respondentEmail) {
    session.respondentEmail = input.respondentEmail;
  }

  const nextStepId = determineNextStepId(step, payload);
  session.currentStepId = nextStepId;
  session.updatedAt = now;
  dataStore.upsertSession(session);

  asyncQueue.enqueue(async () => {
    await dataStore.queuePersist();
  });

  const nextStep = nextStepId ? getStep(diagnosis, nextStepId) : null;
  const isComplete = !nextStepId;
  return { sessionId: session.id, nextStep, isComplete };
};

export const completeSession = (input: SessionCompletionInput): ResultRecord => {
  const diagnosis = ensureDiagnosis(input.diagnosisId);
  const session = ensureSession(input.diagnosisId, input.sessionId);
  if (!session) {
    throw new Error('Session not found');
  }
  if (session.completed) {
    const existingResult = dataStore.listResults(input.diagnosisId).find((item) => item.sessionId === session.id);
    if (!existingResult) {
      throw new Error('Result already processed');
    }
    return existingResult;
  }
  const now = new Date().toISOString();
  session.completed = true;
  session.updatedAt = now;
  if (input.respondentEmail) {
    session.respondentEmail = input.respondentEmail;
  }
  dataStore.upsertSession(session);

  const result: ResultRecord = {
    id: randomUUID(),
    diagnosisId: diagnosis.id,
    sessionId: session.id,
    respondentEmail: session.respondentEmail,
    responses: [...session.responses],
    createdAt: now,
    updatedAt: now,
  };
  dataStore.addResult(result);

  asyncQueue.enqueue(async () => {
    try {
      const templateId = diagnosis.templateId;
      if (templateId) {
        const template = getTemplateById(templateId);
        if (template) {
          const scores = await calculateScores(result.responses, template.scoringConfig);
          result.scores = scores;
          result.updatedAt = new Date().toISOString();
          dataStore.updateResult(result);
        }
      }
    } catch (error) {
      console.error('Scoring job failed', error);
    } finally {
      await dataStore.queuePersist();
    }
  });

  asyncQueue.enqueue(async () => {
    await dataStore.queuePersist();
  });

  return result;
};
