import 'dotenv/config';
import { cp, mkdir, readdir, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import pg from 'pg';

const projectRoot = resolve(process.cwd(), '..');
const publishDir = resolve(projectRoot, 'netlify-site');
const siteUrl = 'https://pic-so.netlify.app';
await rm(publishDir, { recursive: true, force: true });
await mkdir(publishDir, { recursive: true });
for (const item of ['index.html', 'product.html', 'robots.txt', '_redirects', 'css', 'js', 'assets', 'admin']) {
  await cp(resolve(projectRoot, item), resolve(publishDir, item), { recursive: true });
}

const rootFiles = await readdir(projectRoot);
for (const item of rootFiles.filter((name) => /^google[a-z0-9_-]+\.html$/i.test(name))) {
  await cp(resolve(projectRoot, item), resolve(publishDir, item));
}

let products = [];
if (process.env.DATABASE_URL) {
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  try {
    await client.connect();
    const result = await client.query("SELECT id, updated_at FROM products WHERE is_active = true ORDER BY updated_at DESC, id");
    products = result.rows;
  } catch {
    console.warn('Database sitemap generation skipped; using the fallback sitemap.');
  } finally {
    await client.end().catch(() => undefined);
  }
}

if (products.length) {
  const urls = [
    `<url><loc>${siteUrl}/</loc><changefreq>weekly</changefreq><priority>1.0</priority></url>`,
    ...products.map((product) => `<url><loc>${siteUrl}/product.html?id=${encodeURIComponent(product.id)}</loc><lastmod>${new Date(product.updated_at).toISOString().slice(0, 10)}</lastmod><changefreq>weekly</changefreq><priority>0.8</priority></url>`)
  ];
  await writeFile(resolve(publishDir, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`);
} else {
  await cp(resolve(projectRoot, 'sitemap.xml'), resolve(publishDir, 'sitemap.xml'));
}

console.log(`Prepared static site in ${publishDir}`);