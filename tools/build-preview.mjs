/**
 * Empaqueta la app en un solo archivo HTML autocontenido.
 *
 * Sirve para compartir una vista previa donde no se pueden servir varios
 * archivos. NO es la app: es una copia generada. La fuente de verdad siguen
 * siendo `index.html` y `js/*.js`, y este script se vuelve a correr cuando
 * cambian.
 *
 *   node tools/build-preview.mjs [--demo]
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const CON_DEMO = process.argv.includes('--demo');

/**
 * Modo artifact: emite solo el contenido, sin `<!doctype>`, `<html>`, `<head>`
 * ni `<body>`, porque el visor pone esa envoltura.
 */
const iArtifact = process.argv.indexOf('--artifact');
const SALIDA_ARTIFACT = iArtifact >= 0 ? process.argv[iArtifact + 1] : null;

/** Orden topológico: cada módulo va después de aquellos de los que depende. */
const ORDEN = [
  'fecha',
  'protocolos',
  'persistencia',
  'ui',
  'imagen',
  'ics',
  'instalar',
  'store',
  'calendario',
  'vistas',
  'hojas',
  'app',
];

/**
 * Módulos que se importan como `import * as X`.
 *
 * No basta con borrar el prefijo `X.`: una variable local puede llamarse igual
 * que la función importada — `const pendientes = store.pendientes()` quedaría
 * como `const pendientes = pendientes()`, que se referencia a sí misma. Por eso
 * se construye un objeto de espacio de nombres real y `X.` pasa a `__ns_X.`.
 */
const ESPACIOS = ['store', 'vistas', 'hojas', 'instalar'];

const leer = (ruta) => readFileSync(join(RAIZ, ruta), 'utf8');

function limpiarModulo(fuente) {
  return fuente
    .replace(/^import[\s\S]*?from\s+'[^']+';[ \t]*\r?\n/gm, '')
    .replace(/^export\s+(?=(async\s+)?(function|const|let|var|class)\b)/gm, '');
}

/** Nombres declarados en el nivel superior, para detectar choques al aplanar. */
function declaraciones(fuente) {
  const nombres = [];
  const re = /^(?:async\s+)?(?:function|const|let|var|class)\s+([A-Za-z_$][\w$]*)/gm;
  let m;
  while ((m = re.exec(fuente))) nombres.push(m[1]);
  return nombres;
}

/** Nombres exportados, leídos de la fuente original (antes de quitar `export`). */
function exportados(fuente) {
  const nombres = [];
  const re = /^export\s+(?:async\s+)?(?:function|const|let|var|class)\s+([A-Za-z_$][\w$]*)/gm;
  let m;
  while ((m = re.exec(fuente))) nombres.push(m[1]);
  return nombres;
}

/* ------------------------------------------------------------- empaquetado */

const vistos = new Map();
const partes = [];

for (const nombre of ORDEN) {
  const original = leer(`js/${nombre}.js`);
  const limpio = limpiarModulo(original);

  for (const decl of declaraciones(limpio)) {
    if (vistos.has(decl)) {
      throw new Error(
        `Choque de nombres al aplanar: "${decl}" se declara en js/${vistos.get(decl)}.js y en js/${nombre}.js. ` +
          `Renombra uno de los dos antes de empaquetar.`,
      );
    }
    vistos.set(decl, nombre);
  }

  partes.push(`/* ===== js/${nombre}.js ===== */\n${limpio}`);

  // El espacio de nombres se declara justo después del módulo, de modo que
  // cualquier módulo posterior ya lo encuentra listo.
  if (ESPACIOS.includes(nombre)) {
    const lista = exportados(original);
    if (!lista.length) throw new Error(`js/${nombre}.js se usa como espacio de nombres pero no exporta nada.`);
    partes.push(`const __ns_${nombre} = { ${lista.join(', ')} };`);
  }
}

let bundle = partes.join('\n');

// `store.mascotas()` -> `__ns_store.mascotas()`. Se hace al final, sobre todo
// el paquete, porque los usos cruzan los límites de los módulos.
for (const ns of ESPACIOS) {
  bundle = bundle.replace(new RegExp(`\\b${ns}\\.(?=[A-Za-z_$])`, 'g'), `__ns_${ns}.`);
}

/* ------------------------------------------------------------------- HTML */

const css = leer('css/styles.css');
let html = leer('index.html');

html = html
  .replace(/<link rel="stylesheet"[^>]*>/, `<style>\n${css}\n</style>`)
  .replace(/<link rel="manifest"[^>]*>\s*/, '')
  .replace(/<link rel="icon"[^>]*>\s*/, '')
  .replace(/<link rel="apple-touch-icon"[^>]*>\s*/, '');

const demo = CON_DEMO ? leer('tools/datos-demo.json') : null;

const semilla = demo
  ? `<script>
  // Solo si no hay nada guardado: la vista previa tiene que abrir con contenido.
  if (!localStorage.getItem('carnet.v1')) {
    localStorage.setItem('carnet.v1', ${JSON.stringify(demo)});
  }
</script>`
  : '';

html = html.replace(
  /<script type="module"[^>]*><\/script>/,
  `${semilla}\n<script type="module">\n${bundle}\n</script>`,
);

if (!SALIDA_ARTIFACT) {
  writeFileSync(join(RAIZ, 'vista-previa.html'), html);
  const kb = (Buffer.byteLength(html) / 1024).toFixed(1);
  console.log(`vista-previa.html  ${kb} KB  (${ORDEN.length} modulos, ${vistos.size} declaraciones)`);
} else {
  writeFileSync(SALIDA_ARTIFACT, paraArtifact(html, css));
  const kb = (Buffer.byteLength(paraArtifact(html, css)) / 1024).toFixed(1);
  console.log(`${SALIDA_ARTIFACT}  ${kb} KB  (contenido sin envoltura)`);
}

/* ---------------------------------------------------------------- artifact */

/**
 * El visor de artifacts marca `data-theme` en la raíz y espera que gane sobre
 * la media query. La app solo responde a `prefers-color-scheme`, así que aquí
 * se reemiten las MISMAS paletas bajo el selector de atributo. Se extraen de
 * `styles.css` en vez de copiarse a mano, para que no se desincronicen.
 */
function paletasPorAtributo(css) {
  const claro = css.match(/:root\s*\{([\s\S]*?)\n\}/);
  const oscuro = css.match(/@media\s*\(prefers-color-scheme:\s*dark\)\s*\{\s*:root\s*\{([\s\S]*?)\n\s*\}\s*\n\}/);
  if (!claro || !oscuro) {
    throw new Error('No se pudieron extraer las paletas de css/styles.css; revisa el formato de los bloques :root.');
  }
  return [
    '/* Reemitidas por tools/build-preview.mjs para el selector de tema del visor. */',
    `:root[data-theme="light"] {${claro[1]}\n}`,
    `:root[data-theme="dark"] {${oscuro[1]}\n}`,
  ].join('\n');
}

function paraArtifact(documento, css) {
  const titulo = documento.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? 'Carnet';
  const cuerpo = documento.match(/<body>([\s\S]*?)<\/body>/)?.[1];
  if (!cuerpo) throw new Error('No se encontró el <body> en index.html.');

  return [
    `<title>${titulo}</title>`,
    `<style>\n${css}\n\n${paletasPorAtributo(css)}\n</style>`,
    cuerpo.trim(),
  ].join('\n');
}
