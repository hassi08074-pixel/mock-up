import { promises as fs } from 'fs';
import path from 'path';
import { ResponseEntry, ScoreBreakdownItem, ScoreCard } from '../types';

interface BaseRule {
  id: string;
  type: 'choice' | 'keyword';
  stepId: string;
  weight: number;
  description: string;
}

interface ChoiceRule extends BaseRule {
  type: 'choice';
  choiceId: string;
}

interface KeywordRule extends BaseRule {
  type: 'keyword';
  keywords: string[];
}

interface ScoreDefinition {
  name: string;
  label: string;
  maxScore?: number;
  rules: (ChoiceRule | KeywordRule)[];
}

interface ScoringConfig {
  templateId: string;
  scores: ScoreDefinition[];
}

const cache = new Map<string, ScoringConfig>();

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

const loadConfig = async (configPath: string): Promise<ScoringConfig> => {
  if (cache.has(configPath)) {
    return cache.get(configPath)!;
  }
  const absolutePath = path.isAbsolute(configPath)
    ? configPath
    : path.join(process.cwd(), configPath);
  const content = await fs.readFile(absolutePath, 'utf-8');
  const parsed = JSON.parse(content) as ScoringConfig;
  cache.set(configPath, parsed);
  return parsed;
};

export const calculateScores = async (
  responses: ResponseEntry[],
  configPath: string,
): Promise<ScoreCard[]> => {
  const config = await loadConfig(configPath);
  return config.scores.map((scoreDef) => {
    let total = 0;
    const breakdown: ScoreBreakdownItem[] = [];

    for (const rule of scoreDef.rules) {
      const response = findResponse(responses, rule.stepId);
      if (!response) {
        continue;
      }
      if (rule.type === 'choice') {
        if (typeof response.answer === 'string' && response.answer === rule.choiceId) {
          total += rule.weight;
          breakdown.push({ ruleId: rule.id, description: rule.description, score: rule.weight });
        }
      } else if (rule.type === 'keyword') {
        if (typeof response.answer === 'string' && matchKeyword(response.answer, rule.keywords)) {
          total += rule.weight;
          breakdown.push({ ruleId: rule.id, description: rule.description, score: rule.weight });
        }
      }
    }

    return {
      name: scoreDef.name,
      label: scoreDef.label,
      score: total,
      maxScore: scoreDef.maxScore,
      breakdown,
    };
  });
};

const findResponse = (responses: ResponseEntry[], stepId: string): ResponseEntry | undefined =>
  [...responses].reverse().find((entry) => entry.stepId === stepId);
