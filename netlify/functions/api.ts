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

export const handler = async (event: unknown, context: unknown) => {
  try {
    return await (await getHandler())(event, context);
  } catch (error) {
    console.error('Netlify function startup failed', error);
    const issues = error && typeof error === 'object' && 'issues' in error
      ? (error as { issues?: Array<{ path?: Array<string> }> }).issues
      : undefined;
    const message = issues?.length
      ? `Invalid environment variable: ${issues.map((issue) => issue.path?.join('.') || 'unknown').join(', ')}`
      : 'Function startup failed. Check the Netlify function log.';
    return {
      statusCode: 500,
      headers: { 'content-type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ error: 'SERVER_STARTUP_ERROR', message })
    };
  }
};