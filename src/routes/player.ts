import { Router } from 'express';
import { completeSession, handlePlayerResponse } from '../services/PlayerService';

export const playerRouter = Router();

playerRouter.post('/responses', (req, res) => {
  const { diagnosisId, sessionId, currentStepId, answer, respondentEmail } = req.body ?? {};
  if (!diagnosisId || !currentStepId) {
    res.status(400).json({ message: 'diagnosisId and currentStepId are required' });
    return;
  }
  try {
    const output = handlePlayerResponse({
      diagnosisId: String(diagnosisId),
      sessionId: sessionId ? String(sessionId) : undefined,
      currentStepId: String(currentStepId),
      answer,
      respondentEmail: respondentEmail ? String(respondentEmail) : undefined,
    });
    res.json({
      sessionId: output.sessionId,
      nextStep: output.nextStep,
      isComplete: output.isComplete,
    });
  } catch (error) {
    res.status(400).json({ message: (error as Error).message });
  }
});

playerRouter.post('/responses/:sessionId/complete', (req, res) => {
  const { diagnosisId, respondentEmail } = req.body ?? {};
  const { sessionId } = req.params;
  if (!diagnosisId) {
    res.status(400).json({ message: 'diagnosisId is required' });
    return;
  }
  try {
    const result = completeSession({
      diagnosisId: String(diagnosisId),
      sessionId,
      respondentEmail: respondentEmail ? String(respondentEmail) : undefined,
    });
    res.json({ resultId: result.id, sessionId: result.sessionId });
  } catch (error) {
    res.status(400).json({ message: (error as Error).message });
  }
});
