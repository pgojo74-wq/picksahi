import serverless from 'serverless-http';

let cachedHandler: ReturnType<typeof serverless> | undefined;

async function getHandler() {
  if (!cachedHandler) {
    const { buildApp } = await import('../../backend/src/app.js');
    const app = await buildApp();
    await app.ready();
    cachedHandler = serverless(app.server);
  }
  return cachedHandler;
}

export const handler = async (event: unknown, context: unknown) => {
  try {
    return await (await getHandler())(event, context);
  } catch {
    return {
      statusCode: 500,
      headers: { 'content-type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ error: 'SERVER_CONFIGURATION_ERROR', message: 'Netlify environment variables missing or invalid hain. DATABASE_URL, JWT_ACCESS_SECRET, JWT_REFRESH_SECRET, ADMIN_EMAIL aur ALLOWED_ORIGINS check karein.' })
    };
  }
};