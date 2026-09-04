import { cp, mkdir, readdir, rm } from 'node:fs/promises';
import { resolve } from 'node:path';

const projectRoot = resolve(process.cwd(), '..');
const publishDir = resolve(projectRoot, 'netlify-site');
await rm(publishDir, { recursive: true, force: true });
await mkdir(publishDir, { recursive: true });
for (const item of ['index.html', 'product.html', 'robots.txt', 'sitemap.xml', '_redirects', 'css', 'js', 'assets', 'admin']) {
  await cp(resolve(projectRoot, item), resolve(publishDir, item), { recursive: true });
}

const rootFiles = await readdir(projectRoot);
for (const item of rootFiles.filter((name) => /^google[a-z0-9_-]+\.html$/i.test(name))) {
  await cp(resolve(projectRoot, item), resolve(publishDir, item));
}

console.log(`Prepared static site in ${publishDir}`);