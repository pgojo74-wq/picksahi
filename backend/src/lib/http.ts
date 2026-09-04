import type { FastifyReply, FastifyRequest } from 'fastify';

export async function requireAuth(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify();
    if (request.user.type !== 'access') throw new Error('Wrong token type');
  } catch {
    return reply.code(401).send({ error: 'UNAUTHORIZED', message: 'Valid access token required.' });
  }
}

export function requireRole(role: 'admin') {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    await requireAuth(request, reply);
    if (reply.sent) return;
    if (request.user.role !== role) return reply.code(403).send({ error: 'FORBIDDEN', message: 'Insufficient permissions.' });
  };
}

export function audit(actorUserId: string | null, action: string, entityType: string, entityId: string, metadata: Record<string, unknown> = {}) {
  // Import lazily to avoid circular dependencies during startup.
  return import('../db/client.js').then(({ db }) => db.query(
    'INSERT INTO audit_logs (actor_user_id, action, entity_type, entity_id, metadata) VALUES ($1, $2, $3, $4, $5)',
    [actorUserId, action, entityType, entityId, metadata]
  ));
}
