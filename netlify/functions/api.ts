import serverless from 'serverless-http';
import { buildApp } from '../../backend/src/app.js';

let cachedHandler: ReturnType<typeof serverless> | undefined;
async function getHandler() {
  if (!cachedHandler) {
    const app = await buildApp();
    await app.ready();
    cachedHandler = serverless(app.server);
  }
  return cachedHandler;
}

export const handler = async (event: unknown, context: unknown) => (await getHandler())(event, context);
export const config = { path: '/api/*' };