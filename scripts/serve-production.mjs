// Local smoke/E2E server only. Real hosting must provide TLS, /api reverse proxy and SPA fallback.
import { createServer, request as proxyRequest } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
const root = resolve('dist/insurance-portal/browser');
const port = Number(process.env.PORT ?? 4173);
const apiTarget = new URL(process.env.API_PROXY_TARGET ?? 'http://localhost:3000');
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
};
createServer(async (req, res) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  const url = new URL(req.url ?? '/', 'http://localhost');
  if (url.pathname.startsWith('/api/')) {
    const proxy = proxyRequest(
      new URL(req.url, apiTarget),
      { method: req.method, headers: { ...req.headers, host: apiTarget.host } },
      (response) => {
        res.writeHead(response.statusCode ?? 502, response.headers);
        response.pipe(res);
      },
    );
    proxy.on('error', () => {
      if (!res.headersSent) res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 502, message: 'Local mock API is unavailable.' }));
    });
    req.pipe(proxy);
    return;
  }
  if (!['GET', 'HEAD'].includes(req.method ?? '')) {
    res.writeHead(405).end();
    return;
  }
  try {
    const pathname = decodeURIComponent(url.pathname);
    let file = resolve(root, '.' + pathname);
    if (file !== root && !file.startsWith(root + sep)) {
      res.writeHead(403).end();
      return;
    }
    let exists = false;
    try {
      exists = (await stat(file)).isFile();
    } catch {}
    if (!exists) {
      if (extname(pathname)) {
        res.writeHead(404).end();
        return;
      }
      file = resolve(root, 'index.html');
    }
    const content = await readFile(file),
      extension = extname(file);
    res.setHeader('Content-Type', types[extension] ?? 'application/octet-stream');
    res.setHeader(
      'Cache-Control',
      extension === '.html'
        ? 'no-store'
        : /[-.][A-Za-z0-9_-]{8}\./.test(file)
          ? 'public, max-age=31536000, immutable'
          : 'no-cache',
    );
    res.writeHead(200);
    res.end(req.method === 'HEAD' ? undefined : content);
  } catch {
    res.writeHead(500).end('Build the application before starting the preview server.');
  }
}).listen(port, '127.0.0.1', () =>
  console.log(`Production smoke server: http://127.0.0.1:${port}`),
);
