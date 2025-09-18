import { Parser } from 'json2csv';
import { dataStore } from '../store/DataStore';
import { ResultRecord } from '../types';

export const listResults = (diagnosisId?: string): ResultRecord[] => {
  return dataStore.listResults(diagnosisId).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
};

export const getResultById = (id: string): ResultRecord | undefined => {
  return dataStore.getResult(id);
};

export const exportResultCsv = (diagnosisId?: string): string => {
  const results = listResults(diagnosisId);
  const records = results.map((result) => ({
    resultId: result.id,
    diagnosisId: result.diagnosisId,
    respondentEmail: result.respondentEmail ?? '',
    createdAt: result.createdAt,
    scores: JSON.stringify(result.scores ?? []),
    responses: JSON.stringify(result.responses),
  }));
  const parser = new Parser({ fields: ['resultId', 'diagnosisId', 'respondentEmail', 'createdAt', 'scores', 'responses'] });
  return parser.parse(records);
};
