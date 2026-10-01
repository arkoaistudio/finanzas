// Servidor local para ver la app en la PC (http://127.0.0.1:8377/?demo) y para
// la prueba de uso (http://127.0.0.1:8377/_uso.html), que deja su resultado en resultado.json.
const http = require('http'), fs = require('fs'), path = require('path');
const AQUI = __dirname, RAIZ = process.argv[2] || path.join(AQUI, '..');
fs.rmSync(path.join(AQUI, 'resultado.json'), { force: true });
const TIPOS = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.png': 'image/png', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json', '.json': 'application/json' };
http.createServer((req, res) => {
  const u = new URL(req.url, 'http://x');
  if (req.method === 'POST' && u.pathname === '/_resultado') {
    let b = ''; req.on('data', d => b += d); req.on('end', () => { fs.writeFileSync(path.join(AQUI, 'resultado.json'), b); res.end('ok'); });
    return;
  }
  let p = decodeURIComponent(u.pathname);
  if (p.endsWith('/')) p += 'index.html';
  const f = p.startsWith('/_') ? path.join(AQUI, p.slice(2)) : path.join(RAIZ, p);
  fs.readFile(f, (e, d) => {
    if (e) { res.writeHead(404); return res.end('no'); }
    res.writeHead(200, { 'Content-Type': TIPOS[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(d);
  });
}).listen(8377, '127.0.0.1', () => console.log('listo'));
