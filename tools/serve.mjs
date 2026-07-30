/**
 * Servidor estático mínimo, sin dependencias.
 * La app necesita http:// (no file://) para el service worker y los módulos ES.
 *
 *   node tools/serve.mjs [puerto]
 */

import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname, normalize, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const PUERTO = Number(process.argv[2]) || 5173;

const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ics': 'text/calendar; charset=utf-8',
};

createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    let ruta = normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, '');
    if (ruta.endsWith('/')) ruta += 'index.html';

    const archivo = join(RAIZ, ruta);
    if (!archivo.startsWith(RAIZ)) {
      res.writeHead(403).end('Prohibido');
      return;
    }

    const info = await stat(archivo).catch(() => null);
    if (!info || !info.isFile()) {
      const respaldo = await readFile(join(RAIZ, 'index.html'));
      res.writeHead(200, { 'content-type': TIPOS['.html'] }).end(respaldo);
      return;
    }

    const cuerpo = await readFile(archivo);
    res
      .writeHead(200, {
        'content-type': TIPOS[extname(archivo).toLowerCase()] ?? 'application/octet-stream',
        'cache-control': 'no-cache',
      })
      .end(cuerpo);
  } catch (e) {
    res.writeHead(500).end(String(e));
  }
}).listen(PUERTO, () => {
  console.log(`Carnet en http://localhost:${PUERTO}`);
});
