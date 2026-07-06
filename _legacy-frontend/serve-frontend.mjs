// Minimal static server for the Git Visualizer frontend.
// Usage: node serve-frontend.mjs   → http://localhost:5173
// Port 5173 is one of the origins allowed by the backend's CORS config.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('.', import.meta.url));
const PORT = process.env.PORT || 5173;
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon'
};

createServer(async (req, res) => {
  try {
    let path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    // SPA fallback: routes like /commands/rebase or /free have no file
    // extension — serve the app shell and let the client router handle them.
    if (path === '/' || !extname(path)) path = '/Git Visualizer.dc.html';
    const file = normalize(join(ROOT, path));
    if (!file.startsWith(normalize(ROOT))) { res.writeHead(403); res.end(); return; }
    const body = await readFile(file);
    res.writeHead(200, { 'Content-Type': MIME[extname(file).toLowerCase()] || 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('not found');
  }
}).listen(PORT, () => console.log(`Git Visualizer frontend on http://localhost:${PORT}`));
