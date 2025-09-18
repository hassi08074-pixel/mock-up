import { BranchingRule, StepDefinition } from '../types';

export interface StepAnswerPayload {
  choiceId?: string;
  text?: string;
}

const matchKeyword = (text: string | undefined, keywords: string[]): boolean => {
  if (!text) {
    return false;
  }
  const normalized = text.toLowerCase();
  return keywords.some((keyword) => {
    const pattern = keyword.toLowerCase();
    const regex = new RegExp(`\\b${pattern.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')}\\b`, 'i');
    return regex.test(normalized);
  });
};

export const determineNextStepId = (
  step: StepDefinition,
  answer: StepAnswerPayload,
): string | null => {
  if (step.branchingRules && step.branchingRules.length > 0) {
    for (const rule of step.branchingRules) {
      if (evaluateRule(rule, answer)) {
        return rule.nextStepId ?? null;
      }
    }
  }
  if (step.choices && answer.choiceId) {
    const choice = step.choices.find((item) => item.id === answer.choiceId);
    if (choice && choice.nextStepId !== undefined) {
      return choice.nextStepId;
    }
  }
  return step.defaultNextStepId ?? null;
};

const evaluateRule = (rule: BranchingRule, answer: StepAnswerPayload): boolean => {
  if (rule.type === 'choice') {
    return answer.choiceId === rule.choiceId;
  }
  if (rule.type === 'keyword') {
    return matchKeyword(answer.text, rule.keywords);
  }
  return false;
};
