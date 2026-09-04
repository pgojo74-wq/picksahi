import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { db } from '../db/client.js';
import { audit, requireAuth, requireRole } from '../lib/http.js';
import { publicReference } from '../lib/security.js';

const createOrder = z.object({
  // The frontend must not submit a payment status or payment reference.
  details: z.record(z.string(), z.unknown()).default({}),
  currency: z.string().regex(/^[A-Z]{3}$/).default('USD')
});
const updateOrder = z.object({
  status: z.enum(['pending', 'confirmed', 'processing', 'completed', 'cancelled']).optional(),
  paymentStatus: z.enum(['not_required', 'pending_external', 'paid_external', 'failed_external', 'refunded_external']).optional(),
  externalPaymentReference: z.string().trim().min(4).max(160).optional()
}).refine((value) => Object.keys(value).length > 0);

export async function orderRoutes(app: FastifyInstance) {
  app.get('/', { preHandler: requireAuth }, async (request) => {
    const page = Math.max(1, Number((request.query as { page?: string }).page ?? 1));
    const limit = Math.min(50, Math.max(1, Number((request.query as { limit?: string }).limit ?? 20)));
    const results = await db.query(
      'SELECT id, public_reference, status, payment_status, currency, details, created_at, updated_at FROM orders WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
      [request.user.sub, limit, (page - 1) * limit]
    );
    return { page, limit, items: results.rows };
  });

  app.post('/', { preHandler: requireAuth, config: { rateLimit: { max: 10, timeWindow: '1 hour' } } }, async (request, reply) => {
    const parsed = createOrder.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: 'VALIDATION_ERROR', message: 'Invalid order request.' });
    // Amount is deliberately server controlled. Connect a product catalogue/pricing service here;
    // no client-provided amount or payment status is accepted.
    const order = await db.query('INSERT INTO orders (user_id, public_reference, total_amount, currency, details) VALUES ($1, $2, 0, $3, $4) RETURNING id, public_reference, status, payment_status, currency, details, created_at', [request.user.sub, publicReference(), parsed.data.currency, parsed.data.details]);
    await audit(request.user.sub, 'order.created', 'order', order.rows[0].id);
    return reply.code(201).send({ order: order.rows[0] });
  });

  app.get('/:id', { preHandler: requireAuth }, async (request, reply) => {
    const params = z.object({ id: z.string().uuid() }).safeParse(request.params);
    if (!params.success) return reply.code(400).send({ error: 'VALIDATION_ERROR', message: 'Invalid order id.' });
    const order = await db.query('SELECT id, public_reference, status, payment_status, currency, details, created_at, updated_at FROM orders WHERE id = $1 AND user_id = $2', [params.data.id, request.user.sub]);
    if (!order.rowCount) return reply.code(404).send({ error: 'NOT_FOUND', message: 'Order not found.' });
    return { order: order.rows[0] };
  });

  app.patch('/admin/:id', { preHandler: requireRole('admin') }, async (request, reply) => {
    const params = z.object({ id: z.string().uuid() }).safeParse(request.params);
    const body = updateOrder.safeParse(request.body);
    if (!params.success || !body.success) return reply.code(400).send({ error: 'VALIDATION_ERROR', message: 'Invalid order update.' });
    const current = await db.query<{ id: string }>('SELECT id FROM orders WHERE id = $1', [params.data.id]);
    if (!current.rowCount) return reply.code(404).send({ error: 'NOT_FOUND', message: 'Order not found.' });
    const fields: string[] = [];
    const values: unknown[] = [];
    if (body.data.status) { values.push(body.data.status); fields.push(`status = $${values.length}`); }
    if (body.data.paymentStatus) { values.push(body.data.paymentStatus); fields.push(`payment_status = $${values.length}`); }
    if (body.data.externalPaymentReference) { values.push(body.data.externalPaymentReference); fields.push(`external_payment_reference = $${values.length}`); }
    values.push(params.data.id);
    const updated = await db.query(`UPDATE orders SET ${fields.join(', ')}, updated_at = now() WHERE id = $${values.length} RETURNING id, public_reference, status, payment_status, external_payment_reference, updated_at`, values);
    await audit(request.user.sub, 'order.admin_updated', 'order', params.data.id, body.data);
    return { order: updated.rows[0] };
  });
}
