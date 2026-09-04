import serverless from 'serverless-http';
import { app } from '../../src/app.js';

await app.ready();
export const handler = serverless(app.server);
export const config = { path: '/api/*' };