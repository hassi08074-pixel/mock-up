import { NextFunction, Request, Response } from 'express';
import { verifyToken } from '../services/AuthService';

export interface AuthenticatedRequest extends Request {
  user?: { userId: string; email: string };
}

export const authMiddleware = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  const header = req.headers.authorization;
  if (!header) {
    res.status(401).json({ message: 'Authorization header missing' });
    return;
  }
  const token = header.replace('Bearer ', '');
  try {
    const payload = verifyToken(token);
    req.user = payload;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
};
