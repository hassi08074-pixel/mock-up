import request from 'supertest';
import { promises as fs } from 'fs';
import path from 'path';
import { createApp } from '../app';
import { dataStore } from '../store/DataStore';
import { loadTemplates } from '../services/TemplateService';
import { asyncQueue } from '../utils/AsyncQueue';

const testDbPath = path.join(__dirname, '../../data/test-db.json');
const emptyState = {
  users: [],
  diagnoses: [],
  sessions: [],
  results: [],
};

describe('Dokodemo Shindan MVP API', () => {
  const app = createApp();

  beforeAll(async () => {
    await fs.mkdir(path.dirname(testDbPath), { recursive: true });
    await fs.writeFile(testDbPath, JSON.stringify(emptyState, null, 2), 'utf-8');
    dataStore.reset();
    await dataStore.init();
    await loadTemplates();
  });

  beforeEach(async () => {
    await fs.writeFile(testDbPath, JSON.stringify(emptyState, null, 2), 'utf-8');
    dataStore.reset();
    await dataStore.init();
  });

  afterEach(async () => {
    await asyncQueue.onIdle();
  });

  it('allows a user to register and create a diagnosis from a template', async () => {
    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send({ email: 'test@example.com', password: 'password123' })
      .expect(200);

    const token = registerResponse.body.token as string;
    expect(token).toBeDefined();

    const templatesResponse = await request(app)
      .get('/api/templates')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(templatesResponse.body.length).toBeGreaterThanOrEqual(3);
    const templateId = templatesResponse.body[0].id as string;

    const createResponse = await request(app)
      .post('/api/diagnoses')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'My First Diagnosis', templateId })
      .expect(201);

    expect(createResponse.body.title).toBe('My First Diagnosis');
    expect(createResponse.body.status).toBe('draft');

    const listResponse = await request(app)
      .get('/api/diagnoses')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(listResponse.body).toHaveLength(1);
    expect(listResponse.body[0].responseCount).toBe(0);
  });

  it('processes player responses synchronously and scores asynchronously', async () => {
    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send({ email: 'player@example.com', password: 'password123' })
      .expect(200);

    const token = registerResponse.body.token as string;

    const templatesResponse = await request(app)
      .get('/api/templates')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const templateId = templatesResponse.body.find((tpl: any) => tpl.id === 'template-dx-readiness').id;

    const createResponse = await request(app)
      .post('/api/diagnoses')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'DX Check', templateId })
      .expect(201);

    const diagnosisId = createResponse.body.id as string;

    const firstStepId = createResponse.body.scenarioData.firstStepId as string;

    const firstResponse = await request(app)
      .post('/player/responses')
      .send({ diagnosisId, currentStepId: firstStepId, answer: 'leader' })
      .expect(200);

    expect(firstResponse.body.nextStep.id).toBe('q2');
    expect(firstResponse.body.isComplete).toBe(false);

    const sessionId = firstResponse.body.sessionId as string;

    const secondResponse = await request(app)
      .post('/player/responses')
      .send({ diagnosisId, sessionId, currentStepId: 'q2', answer: { text: 'Integration with legacy systems' } })
      .expect(200);

    expect(secondResponse.body.nextStep.id).toBe('q3_integration');

    const finalResponse = await request(app)
      .post('/player/responses')
      .send({ diagnosisId, sessionId, currentStepId: 'q3_integration', answer: 'plan', respondentEmail: 'lead@example.com' })
      .expect(200);

    expect(finalResponse.body.nextStep).toBeNull();
    expect(finalResponse.body.isComplete).toBe(true);

    const completion = await request(app)
      .post(`/player/responses/${sessionId}/complete`)
      .send({ diagnosisId, respondentEmail: 'lead@example.com' })
      .expect(200);

    const resultId = completion.body.resultId as string;

    await asyncQueue.onIdle();

    const resultsResponse = await request(app)
      .get('/api/results')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(resultsResponse.body).toHaveLength(1);
    expect(resultsResponse.body[0].scores).toBeDefined();

    const detailResponse = await request(app)
      .get(`/api/results/${resultId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(detailResponse.body.scores[0].name).toBe('dx_fit');

    const csvResponse = await request(app)
      .get(`/api/results/${resultId}/export/csv`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(csvResponse.headers['content-type']).toContain('text/csv');
  });
});
