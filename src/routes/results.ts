import { Router } from 'express';
import { dataStore } from '../store/DataStore';
import { exportResultCsv, getResultById, listResults } from '../services/ResultService';
import { authMiddleware, AuthenticatedRequest } from '../utils/authMiddleware';

export const resultsRouter = Router();

resultsRouter.use(authMiddleware);

resultsRouter.get('/', (req: AuthenticatedRequest, res) => {
  const userId = req.user?.userId;
  const { diagnosisId } = req.query;
  const diagnosisIds = new Set(
    dataStore
      .getDiagnosesByUser(userId ?? '')
      .map((diagnosis) => diagnosis.id),
  );
  const filtered = listResults(typeof diagnosisId === 'string' ? diagnosisId : undefined).filter((result) =>
    diagnosisIds.has(result.diagnosisId),
  );
  res.json(filtered);
});

resultsRouter.get('/:id', (req: AuthenticatedRequest, res) => {
  const userId = req.user?.userId;
  const { id } = req.params as { id: string };
  if (!id) {
    res.status(400).json({ message: 'Result id is required' });
    return;
  }
  const result = getResultById(id);
  if (!result) {
    res.status(404).json({ message: 'Result not found' });
    return;
  }
  const diagnosis = dataStore.getDiagnosis(result.diagnosisId);
  if (!diagnosis || diagnosis.userId !== userId) {
    res.status(404).json({ message: 'Result not found' });
    return;
  }
  res.json(result);
});

resultsRouter.get('/:id/export/csv', (req: AuthenticatedRequest, res) => {
  const userId = req.user?.userId;
  const { id } = req.params as { id: string };
  if (!id) {
    res.status(400).json({ message: 'Result id is required' });
    return;
  }
  const result = getResultById(id);
  if (!result) {
    res.status(404).json({ message: 'Result not found' });
    return;
  }
  const diagnosis = dataStore.getDiagnosis(result.diagnosisId);
  if (!diagnosis || diagnosis.userId !== userId) {
    res.status(404).json({ message: 'Result not found' });
    return;
  }
  const csv = exportResultCsv(result.diagnosisId);
  res.header('Content-Type', 'text/csv');
  res.attachment(`result-${result.id}.csv`);
  res.send(csv);
});
