import { Router } from 'express';
import { loginUser, registerUser } from '../services/AuthService';
import { asyncQueue } from '../utils/AsyncQueue';
import { dataStore } from '../store/DataStore';

export const authRouter = Router();

authRouter.post('/register', async (req, res) => {
  const { email, password } = req.body ?? {};
  if (!email || !password) {
    res.status(400).json({ message: 'Email and password are required' });
    return;
  }
  try {
    const { user, token } = await registerUser(String(email), String(password));
    asyncQueue.enqueue(async () => {
      await dataStore.queuePersist();
    });
    res.json({ userId: user.id, email: user.email, token });
  } catch (error) {
    res.status(400).json({ message: (error as Error).message });
  }
});

authRouter.post('/login', async (req, res) => {
  const { email, password } = req.body ?? {};
  if (!email || !password) {
    res.status(400).json({ message: 'Email and password are required' });
    return;
  }
  try {
    const { user, token } = await loginUser(String(email), String(password));
    res.json({ userId: user.id, email: user.email, token });
  } catch (error) {
    res.status(401).json({ message: (error as Error).message });
  }
});
