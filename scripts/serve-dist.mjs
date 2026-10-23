/**
 * Production static server for the Vite build.
 *
 * Render (and any host that injects PORT) only marks a web service live once
 * something accepts TCP on 0.0.0.0:$PORT. `vite preview` listens on localhost:4173
 * and rejects unknown Host headers, so a Render health check fails even when the
 * build succeeded. This serves dist/ with no extra dependencies.
 *
 *   PORT=10000 node scripts/serve-dist.mjs
 */
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('../dist', import.meta.url)));
const port = Number(process.env.PORT || 4173);
const host = '0.0.0.0';

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  console.error(`PORT must be an integer from 1 to 65535 (got ${process.env.PORT ?? 'unset'}).`);
  process.exit(1);
}

const indexFile = join(root, 'index.html');
if (!existsSync(indexFile)) {
  console.error('dist/index.html is missing. Run `npm run build` before start.');
  process.exit(1);
}

const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json',
  '.txt': 'text/plain; charset=utf-8',
  '.woff2': 'font/woff2',
};

function insideRoot(urlPath) {
  let pathname;
  try {
    pathname = decodeURIComponent(urlPath);
  } catch {
    return null;
  }
  const rel = pathname.replace(/^\/+/, '');
  const file = resolve(root, rel);
  if (file !== root && !file.startsWith(root + sep)) return null;
  return file;
}

function send(req, res, file, cacheControl) {
  const headers = {
    'Content-Type': types[extname(file)] || 'application/octet-stream',
    'Cache-Control': cacheControl,
  };
  res.writeHead(200, headers);
  if (req.method === 'HEAD') {
    res.end();
    return;
  }
  const stream = createReadStream(file);
  stream.on('error', () => {
    if (!res.headersSent) res.writeHead(500);
    res.end();
  });
  stream.pipe(res);
}

const server = createServer((req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { Allow: 'GET, HEAD' });
    res.end();
    return;
  }

  let pathname = '/';
  try {
    pathname = new URL(req.url ?? '/', 'http://127.0.0.1').pathname;
  } catch {
    res.writeHead(400);
    res.end();
    return;
  }

  const asset = pathname.startsWith('/assets/');
  const requested = pathname.endsWith('/') ? `${pathname}index.html` : pathname;
  let file = insideRoot(requested);
  if (!file) {
    res.writeHead(403);
    res.end();
    return;
  }

  let stat = null;
  try {
    stat = statSync(file);
  } catch {
    stat = null;
  }
  if (stat?.isDirectory()) {
    file = join(file, 'index.html');
    try {
      stat = statSync(file);
    } catch {
      stat = null;
    }
  }

  if (!stat?.isFile()) {
    if (asset) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    send(req, res, indexFile, 'no-cache');
    return;
  }

  const cache = asset
    ? 'public, max-age=31536000, immutable'
    : extname(file) === '.html'
      ? 'no-cache'
      : 'public, max-age=3600';
  send(req, res, file, cache);
});

server.on('error', (err) => {
  console.error(err);
  process.exit(1);
});

server.listen(port, host, () => {
  console.log(`LAST LOCAL listening on http://${host}:${port}`);
});
