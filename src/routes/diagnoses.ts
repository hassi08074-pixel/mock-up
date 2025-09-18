import { Router } from 'express';
import {
  createDiagnosis,
  deleteDiagnosis,
  getDiagnosisById,
  listDiagnoses,
  updateDiagnosis,
} from '../services/DiagnosisService';
import { asyncQueue } from '../utils/AsyncQueue';
import { authMiddleware, AuthenticatedRequest } from '../utils/authMiddleware';
import { dataStore } from '../store/DataStore';

export const diagnosesRouter = Router();

diagnosesRouter.use(authMiddleware);

diagnosesRouter.get('/', (req: AuthenticatedRequest, res) => {
  const userId = req.user?.userId;
  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }
  const diagnoses = listDiagnoses(userId);
  res.json(diagnoses);
});

diagnosesRouter.post('/', (req: AuthenticatedRequest, res) => {
  const userId = req.user?.userId;
  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }
  const { title, templateId } = req.body ?? {};
  if (!title || !templateId) {
    res.status(400).json({ message: 'title and templateId are required' });
    return;
  }
  try {
    const diagnosis = createDiagnosis({ userId, title: String(title), templateId: String(templateId) });
    asyncQueue.enqueue(async () => {
      await dataStore.queuePersist();
    });
    res.status(201).json(diagnosis);
  } catch (error) {
    res.status(400).json({ message: (error as Error).message });
  }
});

diagnosesRouter.get('/:id', (req: AuthenticatedRequest, res) => {
  const userId = req.user?.userId;
  const { id } = req.params as { id: string };
  if (!id) {
    res.status(400).json({ message: 'Diagnosis id is required' });
    return;
  }
  const diagnosis = getDiagnosisById(id);
  if (!diagnosis || diagnosis.userId !== userId) {
    res.status(404).json({ message: 'Diagnosis not found' });
    return;
  }
  res.json(diagnosis);
});

diagnosesRouter.put('/:id', (req: AuthenticatedRequest, res) => {
  const userId = req.user?.userId;
  const { id } = req.params as { id: string };
  if (!id) {
    res.status(400).json({ message: 'Diagnosis id is required' });
    return;
  }
  const diagnosis = getDiagnosisById(id);
  if (!diagnosis || diagnosis.userId !== userId) {
    res.status(404).json({ message: 'Diagnosis not found' });
    return;
  }
  try {
    const updated = updateDiagnosis(id, req.body ?? {});
    asyncQueue.enqueue(async () => {
      await dataStore.queuePersist();
    });
    res.json(updated);
  } catch (error) {
    res.status(400).json({ message: (error as Error).message });
  }
});

diagnosesRouter.delete('/:id', (req: AuthenticatedRequest, res) => {
  const userId = req.user?.userId;
  const { id } = req.params as { id: string };
  if (!id) {
    res.status(400).json({ message: 'Diagnosis id is required' });
    return;
  }
  const diagnosis = getDiagnosisById(id);
  if (!diagnosis || diagnosis.userId !== userId) {
    res.status(404).json({ message: 'Diagnosis not found' });
    return;
  }
  deleteDiagnosis(id);
  asyncQueue.enqueue(async () => {
    await dataStore.queuePersist();
  });
  res.json({ message: 'Diagnosis deleted successfully' });
});
