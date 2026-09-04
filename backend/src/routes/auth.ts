import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { db } from '../db/client.js';
import { hashPassword, tokenHash, verifyPassword } from '../lib/security.js';
import { requireAuth, audit } from '../lib/http.js';

const credentials = z.object({ email: z.string().email().max(254).transform((v) => v.toLowerCase()), password: z.string().min(12).max(128) });
const adminPassword = z.object({ password: z.string().min(12).max(128) });
const registration = credentials.extend({ fullName: z.string().trim().min(2).max(120) });

async function issueTokens(app: FastifyInstance, user: { id: string; role: 'customer' | 'admin' }) {
  const session = await db.query<{ id: string }>("INSERT INTO refresh_sessions (user_id, token_hash, expires_at) VALUES ($1, 'pending', now() + interval '30 days') RETURNING id", [user.id]);
  const sid = session.rows[0].id;
  const refreshToken = app.jwt.sign({ sub: user.id, role: user.role, type: 'refresh', sid }, { expiresIn: '30d' });
  await db.query('UPDATE refresh_sessions SET token_hash = $1 WHERE id = $2', [tokenHash(refreshToken), sid]);
  const accessToken = app.jwt.sign({ sub: user.id, role: user.role, type: 'access' }, { expiresIn: '15m' });
  return { accessToken, refreshToken };
}

export async function authRoutes(app: FastifyInstance) {
  app.post('/register', { config: { rateLimit: { max: 5, timeWindow: '1 hour' } } }, async (request, reply) => {
    const parsed = registration.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: 'VALIDATION_ERROR', message: 'Invalid registration data.' });
    const { email, password, fullName } = parsed.data;
    const exists = await db.query('SELECT 1 FROM users WHERE email = $1', [email]);
    if (exists.rowCount) return reply.code(409).send({ error: 'EMAIL_EXISTS', message: 'Account already exists.' });
    const result = await db.query<{ id: string; role: 'customer' | 'admin' }>('INSERT INTO users (email, password_hash, full_name) VALUES ($1, $2, $3) RETURNING id, role', [email, await hashPassword(password), fullName]);
    const user = result.rows[0];
    await audit(user.id, 'user.registered', 'user', user.id);
    return reply.code(201).send({ user: { id: user.id, email, fullName, role: user.role }, ...(await issueTokens(app, user)) });
  });

  app.post('/login', { config: { rateLimit: { max: 10, timeWindow: '15 minutes' } } }, async (request, reply) => {
    const parsed = credentials.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: 'VALIDATION_ERROR', message: 'Invalid email or password.' });
    const result = await db.query<{ id: string; password_hash: string; role: 'customer' | 'admin'; full_name: string }>('SELECT id, password_hash, role, full_name FROM users WHERE email = $1 AND is_active = true', [parsed.data.email]);
    const user = result.rows[0];
    if (!user || !(await verifyPassword(parsed.data.password, user.password_hash))) return reply.code(401).send({ error: 'INVALID_CREDENTIALS', message: 'Invalid email or password.' });
    await audit(user.id, 'user.logged_in', 'user', user.id);
    return { user: { id: user.id, email: parsed.data.email, fullName: user.full_name, role: user.role }, ...(await issueTokens(app, user)) };
  });

  app.post('/admin-login', { config: { rateLimit: { max: 5, timeWindow: '15 minutes' } } }, async (request, reply) => {
    const parsed = adminPassword.safeParse(request.body);
    const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
    if (!parsed.success || !adminEmail) return reply.code(400).send({ error: 'VALIDATION_ERROR', message: 'Password is required.' });
    const result = await db.query<{ id: string; password_hash: string; role: 'customer' | 'admin'; full_name: string }>('SELECT id, password_hash, role, full_name FROM users WHERE email = $1 AND is_active = true', [adminEmail]);
    const user = result.rows[0];
    if (!user || user.role !== 'admin' || !(await verifyPassword(parsed.data.password, user.password_hash))) return reply.code(401).send({ error: 'INVALID_CREDENTIALS', message: 'Password ghalat hai.' });
    await audit(user.id, 'admin.logged_in', 'user', user.id);
    return { user: { id: user.id, fullName: user.full_name, role: user.role }, ...(await issueTokens(app, user)) };
  });
  app.post('/refresh', async (request, reply) => {
    const body = z.object({ refreshToken: z.string().min(1) }).safeParse(request.body);
    if (!body.success) return reply.code(400).send({ error: 'VALIDATION_ERROR', message: 'Refresh token required.' });
    try {
      const payload = app.jwt.verify<{ sub: string; sid: string; role: 'customer' | 'admin'; type: 'refresh' }>(body.data.refreshToken);
      if (payload.type !== 'refresh') throw new Error('Wrong token');
      const session = await db.query('SELECT 1 FROM refresh_sessions WHERE id = $1 AND user_id = $2 AND token_hash = $3 AND revoked_at IS NULL AND expires_at > now()', [payload.sid, payload.sub, tokenHash(body.data.refreshToken)]);
      if (!session.rowCount) throw new Error('Session invalid');
      await db.query('UPDATE refresh_sessions SET revoked_at = now() WHERE id = $1', [payload.sid]);
      return issueTokens(app, { id: payload.sub, role: payload.role });
    } catch { return reply.code(401).send({ error: 'INVALID_SESSION', message: 'Session expired or invalid.' }); }
  });

  app.post('/logout', { preHandler: requireAuth }, async (request) => {
    await db.query('UPDATE refresh_sessions SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL', [request.user.sub]);
    await audit(request.user.sub, 'user.logged_out', 'user', request.user.sub);
    return { ok: true };
  });
}
