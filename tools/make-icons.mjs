/**
 * Genera los PNG del manifest a partir de la misma geometría que icons/icon.svg.
 * Sin dependencias: rasteriza a mano con supermuestreo 3x y codifica PNG con zlib.
 *
 *   node tools/make-icons.mjs
 */

import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const SALIDA = join(RAIZ, 'icons');

/* Campo rosa palo, tarjeta ciruela, formas rosa: el mismo contraste que usa la
   app (pastel de fondo, tinta profunda encima). */
const ROSA = [0xff, 0xc4, 0xc8];
const CIRUELA = [0x38, 0x15, 0x19];

/* Geometría en el lienzo de referencia de 512. */
const FORMAS = [
  { tipo: 'rrect', x: 112, y: 136, w: 288, h: 240, r: 22, color: CIRUELA },
  { tipo: 'circle', cx: 184, cy: 232, r: 36, color: ROSA },
  { tipo: 'rrect', x: 240, y: 210, w: 112, h: 16, r: 8, color: ROSA },
  { tipo: 'rrect', x: 240, y: 240, w: 84, h: 16, r: 8, color: ROSA },
  { tipo: 'rrect', x: 148, y: 310, w: 216, h: 14, r: 7, color: ROSA, alpha: 0.45 },
];

function dentroRRect(px, py, f) {
  const { x, y, w, h, r } = f;
  if (px < x || py < y || px > x + w || py > y + h) return false;
  const cx = Math.min(Math.max(px, x + r), x + w - r);
  const cy = Math.min(Math.max(py, y + r), y + h - r);
  const dx = px - cx;
  const dy = py - cy;
  return dx * dx + dy * dy <= r * r;
}

function dentroCirculo(px, py, f) {
  const dx = px - f.cx;
  const dy = py - f.cy;
  return dx * dx + dy * dy <= f.r * f.r;
}

/** Color de un punto del lienzo de 512, mezclando por orden de dibujo. */
function colorEn(px, py, redondearFondo) {
  let color = redondearFondo && !dentroRRect(px, py, { x: 0, y: 0, w: 512, h: 512, r: 96 })
    ? null
    : ROSA.slice();
  if (!color) return null;
  for (const f of FORMAS) {
    const dentro = f.tipo === 'circle' ? dentroCirculo(px, py, f) : dentroRRect(px, py, f);
    if (!dentro) continue;
    const a = f.alpha ?? 1;
    color = color.map((c, i) => Math.round(c * (1 - a) + f.color[i] * a));
  }
  return color;
}

function rasterizar(lado, { redondearFondo = true, escalaContenido = 1 } = {}) {
  const M = 3; // supermuestreo
  const pixeles = Buffer.alloc(lado * lado * 3);
  const centro = 256;

  for (let y = 0; y < lado; y++) {
    for (let x = 0; x < lado; x++) {
      let r = 0;
      let g = 0;
      let b = 0;
      for (let sy = 0; sy < M; sy++) {
        for (let sx = 0; sx < M; sx++) {
          const u = ((x + (sx + 0.5) / M) / lado) * 512;
          const v = ((y + (sy + 0.5) / M) / lado) * 512;
          const uu = centro + (u - centro) / escalaContenido;
          const vv = centro + (v - centro) / escalaContenido;
          const c = colorEn(uu, vv, redondearFondo) ?? ROSA;
          r += c[0];
          g += c[1];
          b += c[2];
        }
      }
      const n = M * M;
      const i = (y * lado + x) * 3;
      pixeles[i] = Math.round(r / n);
      pixeles[i + 1] = Math.round(g / n);
      pixeles[i + 2] = Math.round(b / n);
    }
  }
  return pixeles;
}

/* ------------------------------------------------------------- PNG crudo -- */

const TABLA_CRC = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = -1;
  for (const byte of buf) c = TABLA_CRC[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function chunk(tipo, datos) {
  const largo = Buffer.alloc(4);
  largo.writeUInt32BE(datos.length);
  const cuerpo = Buffer.concat([Buffer.from(tipo, 'ascii'), datos]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(cuerpo));
  return Buffer.concat([largo, cuerpo, crc]);
}

function png(lado, pixelesRGB) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(lado, 0);
  ihdr.writeUInt32BE(lado, 4);
  ihdr[8] = 8; // profundidad
  ihdr[9] = 2; // color RGB
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const filas = Buffer.alloc(lado * (lado * 3 + 1));
  for (let y = 0; y < lado; y++) {
    const destino = y * (lado * 3 + 1);
    filas[destino] = 0; // filtro None
    pixelesRGB.copy(filas, destino + 1, y * lado * 3, (y + 1) * lado * 3);
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(filas, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/* --------------------------------------------------------------- salida -- */

mkdirSync(SALIDA, { recursive: true });

// A sangre: iOS y Android recortan el icono con su propia máscara, así que
// redondearlo aquí solo produciría esquinas de otro color bajo el recorte.
const archivos = [
  ['icon-192.png', 192, { redondearFondo: false, escalaContenido: 1 }],
  ['icon-512.png', 512, { redondearFondo: false, escalaContenido: 1 }],
  // Maskable: fondo a sangre y contenido al 78% para sobrevivir el recorte.
  ['icon-maskable-512.png', 512, { redondearFondo: false, escalaContenido: 0.78 }],
];

for (const [nombre, lado, opciones] of archivos) {
  writeFileSync(join(SALIDA, nombre), png(lado, rasterizar(lado, opciones)));
  console.log(`${nombre}  ${lado}x${lado}`);
}
