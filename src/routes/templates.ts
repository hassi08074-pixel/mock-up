import { Router } from 'express';
import { getTemplateById, getTemplates } from '../services/TemplateService';
import { authMiddleware } from '../utils/authMiddleware';

export const templatesRouter = Router();

templatesRouter.use(authMiddleware);

templatesRouter.get('/', (req, res) => {
  const templates = getTemplates();
  res.json(templates);
});

templatesRouter.get('/:id', (req, res) => {
  const template = getTemplateById(req.params.id);
  if (!template) {
    res.status(404).json({ message: 'Template not found' });
    return;
  }
  res.json(template);
});
