import { promises as fs } from 'fs';
import path from 'path';
import { TemplateDefinition } from '../types';

let templates: TemplateDefinition[] = [];
const templateDir = path.join(process.cwd(), 'templates');

export const loadTemplates = async (): Promise<void> => {
  try {
    const files = await fs.readdir(templateDir);
    const data = await Promise.all(
      files.filter((file) => file.endsWith('.json')).map(async (file) => {
        const content = await fs.readFile(path.join(templateDir, file), 'utf-8');
        return JSON.parse(content) as TemplateDefinition;
      }),
    );
    templates = data;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      templates = [];
    } else {
      throw error;
    }
  }
};

export const getTemplates = (): TemplateDefinition[] => templates;

export const getTemplateById = (id: string): TemplateDefinition | undefined =>
  templates.find((template) => template.id === id);
