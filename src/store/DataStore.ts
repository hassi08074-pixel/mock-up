import { promises as fs } from 'fs';
import path from 'path';
import {
  DatabaseState,
  DiagnosisRecord,
  ResponseSession,
  ResultRecord,
  UserRecord,
} from '../types';

const DEFAULT_STATE: DatabaseState = {
  users: [],
  diagnoses: [],
  sessions: [],
  results: [],
};

export class DataStore {
  private state: DatabaseState = { ...DEFAULT_STATE };
  private readonly filePath: string;

  constructor(filePath?: string) {
    const envPath = process.env.DATA_STORE_PATH;
    this.filePath = filePath ?? (envPath ? path.resolve(envPath) : path.join(process.cwd(), 'data', 'db.json'));
  }

  async init(): Promise<void> {
    try {
      const content = await fs.readFile(this.filePath, 'utf-8');
      this.state = { ...DEFAULT_STATE, ...JSON.parse(content) };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        await this.persist();
      } else {
        throw error;
      }
    }
  }

  private async persist(): Promise<void> {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    await fs.writeFile(this.filePath, JSON.stringify(this.state, null, 2), 'utf-8');
  }

  async queuePersist(): Promise<void> {
    await this.persist();
  }

  reset(state?: DatabaseState): void {
    if (state) {
      this.state = {
        users: [...state.users],
        diagnoses: [...state.diagnoses],
        sessions: [...state.sessions],
        results: [...state.results],
      };
    } else {
      this.state = {
        users: [],
        diagnoses: [],
        sessions: [],
        results: [],
      };
    }
  }

  getUsers(): UserRecord[] {
    return this.state.users;
  }

  addUser(user: UserRecord): void {
    this.state.users.push(user);
  }

  updateUser(user: UserRecord): void {
    const index = this.state.users.findIndex((item) => item.id === user.id);
    if (index >= 0) {
      this.state.users[index] = user;
    }
  }

  findUserByEmail(email: string): UserRecord | undefined {
    return this.state.users.find((user) => user.email.toLowerCase() === email.toLowerCase());
  }

  getDiagnosesByUser(userId: string): DiagnosisRecord[] {
    return this.state.diagnoses.filter((diagnosis) => diagnosis.userId === userId);
  }

  getDiagnosis(id: string): DiagnosisRecord | undefined {
    return this.state.diagnoses.find((diagnosis) => diagnosis.id === id);
  }

  addDiagnosis(diagnosis: DiagnosisRecord): void {
    this.state.diagnoses.push(diagnosis);
  }

  updateDiagnosis(diagnosis: DiagnosisRecord): void {
    const index = this.state.diagnoses.findIndex((item) => item.id === diagnosis.id);
    if (index >= 0) {
      this.state.diagnoses[index] = diagnosis;
    }
  }

  deleteDiagnosis(id: string): void {
    this.state.diagnoses = this.state.diagnoses.filter((diagnosis) => diagnosis.id !== id);
  }

  upsertSession(session: ResponseSession): void {
    const index = this.state.sessions.findIndex((item) => item.id === session.id);
    if (index >= 0) {
      this.state.sessions[index] = session;
    } else {
      this.state.sessions.push(session);
    }
  }

  getSession(sessionId: string): ResponseSession | undefined {
    return this.state.sessions.find((session) => session.id === sessionId);
  }

  listSessionsByDiagnosis(diagnosisId: string): ResponseSession[] {
    return this.state.sessions.filter((session) => session.diagnosisId === diagnosisId);
  }

  completeSession(sessionId: string): void {
    const session = this.getSession(sessionId);
    if (session) {
      session.completed = true;
      session.updatedAt = new Date().toISOString();
    }
  }

  addResult(result: ResultRecord): void {
    this.state.results.push(result);
  }

  updateResult(result: ResultRecord): void {
    const index = this.state.results.findIndex((item) => item.id === result.id);
    if (index >= 0) {
      this.state.results[index] = result;
    }
  }

  getResult(resultId: string): ResultRecord | undefined {
    return this.state.results.find((result) => result.id === resultId);
  }

  listResults(diagnosisId?: string): ResultRecord[] {
    if (!diagnosisId) {
      return [...this.state.results];
    }
    return this.state.results.filter((result) => result.diagnosisId === diagnosisId);
  }
}

export const dataStore = new DataStore();
