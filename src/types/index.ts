export type StepType = 'multiple_choice' | 'text';

export interface ChoiceOption {
  id: string;
  label: string;
  nextStepId?: string | null;
}

export interface KeywordBranchingRule {
  type: 'keyword';
  keywords: string[];
  nextStepId: string | null;
}

export interface ChoiceBranchingRule {
  type: 'choice';
  choiceId: string;
  nextStepId: string | null;
}

export type BranchingRule = KeywordBranchingRule | ChoiceBranchingRule;

export interface StepDefinition {
  id: string;
  title?: string;
  prompt: string;
  type: StepType;
  choices?: ChoiceOption[];
  branchingRules?: BranchingRule[];
  defaultNextStepId?: string | null;
  isTerminal?: boolean;
}

export interface ScenarioDefinition {
  firstStepId: string;
  steps: Record<string, StepDefinition>;
}

export interface TemplateDefinition {
  id: string;
  name: string;
  description: string;
  scenario: ScenarioDefinition;
  scoringConfig: string;
  createdAt: string;
  updatedAt: string;
}

export interface DiagnosisRecord {
  id: string;
  userId: string;
  title: string;
  status: 'draft' | 'published';
  scenarioData: ScenarioDefinition;
  templateId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserRecord {
  id: string;
  email: string;
  passwordHash: string;
  createdAt: string;
  updatedAt: string;
}

export interface ResponseEntry {
  stepId: string;
  answer: unknown;
  createdAt: string;
}

export interface ResponseSession {
  id: string;
  diagnosisId: string;
  respondentEmail?: string;
  currentStepId: string | null;
  responses: ResponseEntry[];
  completed: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ScoreBreakdownItem {
  ruleId: string;
  description: string;
  score: number;
}

export interface ScoreCard {
  name: string;
  label: string;
  score: number;
  maxScore?: number;
  breakdown: ScoreBreakdownItem[];
}

export interface ResultRecord {
  id: string;
  diagnosisId: string;
  sessionId: string;
  respondentEmail?: string;
  responses: ResponseEntry[];
  scores?: ScoreCard[];
  createdAt: string;
  updatedAt: string;
}

export interface DatabaseState {
  users: UserRecord[];
  diagnoses: DiagnosisRecord[];
  sessions: ResponseSession[];
  results: ResultRecord[];
}
