import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import { config, allowedOrigins } from './config.js';
import { db } from './db/client.js';
import { authRoutes } from './routes/auth.js';
import { contentRoutes } from './routes/content.js';

export async function buildApp() {
  const app = Fastify({ logger: { level: config.NODE_ENV === 'production' ? 'info' : 'debug', redact: ['req.headers.authorization', 'req.body.password', 'req.body.refreshToken'] }, trustProxy: config.NODE_ENV === 'production' });
  await app.register(helmet, { contentSecurityPolicy: false, crossOriginResourcePolicy: { policy: 'same-site' } });
  await app.register(cors, {
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error('Origin not allowed'), false);
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Authorization', 'Content-Type'],
    maxAge: 86_400
  });
  await app.register(rateLimit, { global: true, max: 200, timeWindow: '1 minute', keyGenerator: (request) => request.ip });
  await app.register(jwt, { secret: config.JWT_ACCESS_SECRET });
  app.get('/health', async () => { await db.query('SELECT 1'); return { status: 'ok' }; });
  app.setErrorHandler((error, request, reply) => {
    request.log.error(error);
    if ((error as { validation?: unknown }).validation) return reply.code(400).send({ error: 'VALIDATION_ERROR', message: 'Invalid request.' });
    return reply.code(500).send({ error: 'INTERNAL_ERROR', message: 'Something went wrong.' });
  });
  await app.register(authRoutes, { prefix: '/api/v1/auth' });
  await app.register(contentRoutes, { prefix: '/api/v1' });
  return app;
}