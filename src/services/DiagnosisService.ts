import { randomUUID } from 'crypto';
import { dataStore } from '../store/DataStore';
import { DiagnosisRecord, ScenarioDefinition } from '../types';
import { getTemplateById } from './TemplateService';
import { validateScenario } from '../utils/ScenarioValidator';

interface CreateDiagnosisInput {
  userId: string;
  title: string;
  templateId?: string;
}

interface UpdateDiagnosisInput {
  title?: string;
  status?: 'draft' | 'published';
  scenarioData?: ScenarioDefinition;
}

export const listDiagnoses = (userId: string): Array<DiagnosisRecord & { responseCount: number }> => {
  return dataStore.getDiagnosesByUser(userId).map((diagnosis) => ({
    ...diagnosis,
    responseCount: dataStore.listResults(diagnosis.id).length,
  }));
};

export const createDiagnosis = (input: CreateDiagnosisInput): DiagnosisRecord => {
  const now = new Date().toISOString();
  let scenarioData: ScenarioDefinition | undefined;
  if (input.templateId) {
    const template = getTemplateById(input.templateId);
    if (!template) {
      throw new Error('Template not found');
    }
    scenarioData = template.scenario;
  } else {
    throw new Error('Template is required for MVP');
  }
  const validatedScenario = validateScenario(scenarioData);

  const diagnosis: DiagnosisRecord = {
    id: randomUUID(),
    userId: input.userId,
    title: input.title,
    status: 'draft',
    scenarioData: validatedScenario,
    templateId: input.templateId,
    createdAt: now,
    updatedAt: now,
  };
  dataStore.addDiagnosis(diagnosis);
  return diagnosis;
};

export const updateDiagnosis = (id: string, input: UpdateDiagnosisInput): DiagnosisRecord => {
  const diagnosis = dataStore.getDiagnosis(id);
  if (!diagnosis) {
    throw new Error('Diagnosis not found');
  }
  const now = new Date().toISOString();
  if (input.title) {
    diagnosis.title = input.title;
  }
  if (input.status) {
    diagnosis.status = input.status;
  }
  if (input.scenarioData) {
    diagnosis.scenarioData = validateScenario(input.scenarioData);
  }
  diagnosis.updatedAt = now;
  dataStore.updateDiagnosis(diagnosis);
  return diagnosis;
};

export const deleteDiagnosis = (id: string): void => {
  dataStore.deleteDiagnosis(id);
};

export const getDiagnosisById = (id: string): DiagnosisRecord | undefined => dataStore.getDiagnosis(id);
