import { readFile } from 'node:fs/promises';
import { basename, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { FastifyInstance, FastifyReply } from 'fastify';

const webRoot = fileURLToPath(new URL('../../../', import.meta.url));
const contentTypes: Record<string, string> = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.png': 'image/png' };

async function sendFile(reply: FastifyReply, filePath: string) {
  try {
    return reply.type(contentTypes[extname(filePath)] ?? 'application/octet-stream').send(await readFile(filePath));
  } catch {
    return reply.code(404).send({ error: 'NOT_FOUND', message: 'File not found.' });
  }
}

export function staticRoutes(app: FastifyInstance) {
  app.get('/', async (_request, reply) => sendFile(reply, join(webRoot, 'index.html')));
  app.get('/product.html', async (_request, reply) => sendFile(reply, join(webRoot, 'product.html')));
  app.get('/css/:file', async (request, reply) => sendFile(reply, join(webRoot, 'css', basename((request.params as { file: string }).file))));
  app.get('/js/:file', async (request, reply) => sendFile(reply, join(webRoot, 'js', basename((request.params as { file: string }).file))));
  app.get('/assets/:file', async (request, reply) => sendFile(reply, join(webRoot, 'assets', basename((request.params as { file: string }).file))));
  app.get('/admin', async (_request, reply) => sendFile(reply, join(webRoot, 'admin', 'index.html')));
  app.get('/admin/', async (_request, reply) => sendFile(reply, join(webRoot, 'admin', 'index.html')));
  app.get('/admin/:file', async (request, reply) => sendFile(reply, join(webRoot, 'admin', basename((request.params as { file: string }).file))));
}