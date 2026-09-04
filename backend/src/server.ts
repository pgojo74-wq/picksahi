import { app } from './app.js';
import { config } from './config.js';
import { db } from './db/client.js';
import { staticRoutes } from './routes/static.js';

await staticRoutes(app);
const close = async () => { await app.close(); await db.end(); };
process.on('SIGINT', close);
process.on('SIGTERM', close);
await app.listen({ port: config.PORT, host: '0.0.0.0' });