import { createServer } from 'http';
import { createApp } from './app';
import { dataStore } from './store/DataStore';
import { loadTemplates } from './services/TemplateService';

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;

const bootstrap = async (): Promise<void> => {
  await dataStore.init();
  await loadTemplates();
  const app = createApp();
  const server = createServer(app);
  server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`); // eslint-disable-line no-console
  });
};

void bootstrap();
