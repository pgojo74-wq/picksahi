import 'dotenv/config';
import { z } from 'zod';

const configSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3001),
  DATABASE_URL: z.string().url(),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  ALLOWED_ORIGINS: z.string().min(1),
  ADMIN_EMAIL: z.string().email().transform((value) => value.toLowerCase())
});

export const config = configSchema.parse(process.env);
export const allowedOrigins = config.ALLOWED_ORIGINS.split(',').map((value) => value.trim());
