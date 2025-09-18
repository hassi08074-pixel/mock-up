import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import { dataStore } from '../store/DataStore';
import { UserRecord } from '../types';

const JWT_SECRET = process.env.JWT_SECRET ?? 'development-secret';

export interface AuthTokenPayload {
  userId: string;
  email: string;
}

export const registerUser = async (email: string, password: string): Promise<{ user: UserRecord; token: string }> => {
  const existing = dataStore.findUserByEmail(email);
  if (existing) {
    throw new Error('User already exists');
  }
  const now = new Date().toISOString();
  const passwordHash = await bcrypt.hash(password, 10);
  const user: UserRecord = {
    id: randomUUID(),
    email,
    passwordHash,
    createdAt: now,
    updatedAt: now,
  };
  dataStore.addUser(user);
  const token = signToken(user);
  return { user, token };
};

export const loginUser = async (email: string, password: string): Promise<{ user: UserRecord; token: string }> => {
  const user = dataStore.findUserByEmail(email);
  if (!user) {
    throw new Error('Invalid credentials');
  }
  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) {
    throw new Error('Invalid credentials');
  }
  const token = signToken(user);
  return { user, token };
};

const signToken = (user: UserRecord): string => {
  const payload: AuthTokenPayload = { userId: user.id, email: user.email };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '12h' });
};

export const verifyToken = (token: string): AuthTokenPayload => {
  return jwt.verify(token, JWT_SECRET) as AuthTokenPayload;
};
