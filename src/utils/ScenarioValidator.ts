import { z } from 'zod';
import { ScenarioDefinition } from '../types';

const branchingRuleSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('choice'),
    choiceId: z.string(),
    nextStepId: z.string().nullable(),
  }),
  z.object({
    type: z.literal('keyword'),
    keywords: z.array(z.string()),
    nextStepId: z.string().nullable(),
  }),
]);

const choiceSchema = z.object({
  id: z.string(),
  label: z.string(),
  nextStepId: z.string().nullable().optional(),
});

const stepSchema = z.object({
  id: z.string(),
  title: z.string().optional(),
  prompt: z.string(),
  type: z.enum(['multiple_choice', 'text']),
  choices: z.array(choiceSchema).optional(),
  branchingRules: z.array(branchingRuleSchema).optional(),
  defaultNextStepId: z.string().nullable().optional(),
  isTerminal: z.boolean().optional(),
});

const scenarioSchema = z.object({
  firstStepId: z.string(),
  steps: z.record(z.string(), stepSchema),
});

export const validateScenario = (scenario: unknown): ScenarioDefinition => {
  return scenarioSchema.parse(scenario) as ScenarioDefinition;
};
