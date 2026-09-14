import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  DATABASE_URL: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(16),
  JWT_REFRESH_SECRET: z.string().min(16),
  FRONTEND_URL: z.string().url().default('http://localhost:5173'),
  CORS_ORIGINS: z.string().optional(),
  PORT: z.coerce.number().int().positive().default(3333),
});

const parsed = schema.parse(process.env);

export const env = {
  ...parsed,
  CORS_ORIGINS: (parsed.CORS_ORIGINS ?? parsed.FRONTEND_URL)
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
};
