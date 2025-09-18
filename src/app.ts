import express from 'express';
import cors from 'cors';
import { authRouter } from './routes/auth';
import { diagnosesRouter } from './routes/diagnoses';
import { templatesRouter } from './routes/templates';
import { playerRouter } from './routes/player';
import { resultsRouter } from './routes/results';

export const createApp = (): express.Express => {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  app.use('/api/auth', authRouter);
  app.use('/api/diagnoses', diagnosesRouter);
  app.use('/api/templates', templatesRouter);
  app.use('/player', playerRouter);
  app.use('/api/results', resultsRouter);

  app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error(err); // eslint-disable-line no-console
    res.status(500).json({ message: 'Internal Server Error' });
  });

  return app;
};
