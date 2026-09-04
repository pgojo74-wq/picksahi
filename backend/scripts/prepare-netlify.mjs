import { cp, mkdir, rm } from 'node:fs/promises';
import { resolve } from 'node:path';

const projectRoot = resolve(process.cwd(), '..');
const publishDir = resolve(projectRoot, 'netlify-site');
await rm(publishDir, { recursive: true, force: true });
await mkdir(publishDir, { recursive: true });
for (const item of ['index.html', 'css', 'js', 'assets', 'admin']) {
  await cp(resolve(projectRoot, item), resolve(publishDir, item), { recursive: true });
}
console.log(`Prepared static site in ${publishDir}`);