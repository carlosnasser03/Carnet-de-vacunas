/**
 * Primitivas de presentación compartidas.
 *
 * Este módulo no sabe nada del dominio: no importa `store` ni `protocolos`. Es
 * la capa de más abajo de la interfaz, y por eso puede importarla cualquiera sin
 * crear ciclos.
 */

import { relativo } from './fecha.js';

export const esc = (v) =>
  String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

let toastTimer;

export function toast(mensaje) {
  const el = document.querySelector('#toast');
  if (!el) return;
  el.textContent = mensaje;
  el.dataset.show = 'true';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    el.dataset.show = 'false';
  }, 3600);
}

/** Traduce el resultado de una escritura del almacén a un aviso al usuario. */
export function reportar(res, exito) {
  if (res && res.ok === false) toast(res.error);
  else if (exito) toast(exito);
}

export const SVG_PATA = `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="currentColor"><ellipse cx="7" cy="9" rx="2.1" ry="2.7"/><ellipse cx="12" cy="7.2" rx="2.1" ry="2.8"/><ellipse cx="17" cy="9" rx="2.1" ry="2.7"/><path d="M12 11.4c2.9 0 5.4 2.2 5.4 4.6 0 1.7-1.3 2.8-3 2.8-1 0-1.7-.4-2.4-.4s-1.4.4-2.4.4c-1.7 0-3-1.1-3-2.8 0-2.4 2.5-4.6 5.4-4.6Z"/></svg>`;

/** Cada estado tiene forma propia: el color nunca es el único portador. */
export const GLIFOS = {
  ok: `<svg class="status__glyph" viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="4.5" fill="currentColor"/></svg>`,
  pronto: `<svg class="status__glyph" viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="4.5" fill="none" stroke="currentColor" stroke-width="2"/></svg>`,
  vencida: `<svg class="status__glyph" viewBox="0 0 16 16" aria-hidden="true"><rect x="6.5" y="2.5" width="3" height="11" rx="1" fill="currentColor"/></svg>`,
  'sin-fecha': `<svg class="status__glyph" viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 8h9" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`,
};

const CLASE_ESTADO = {
  ok: 'status--ok',
  pronto: 'status--warn',
  vencida: 'status--due',
  'sin-fecha': 'status--none',
};

export function textoEstado(clave, dias) {
  if (clave === 'sin-fecha') return 'Sin fecha';
  if (clave === 'vencida') return dias === 0 ? 'Vence hoy' : `Vencida ${relativo(dias)}`;
  if (clave === 'pronto') return dias === 0 ? 'Toca hoy' : `Toca ${relativo(dias)}`;
  return `Al día · ${relativo(dias)}`;
}

export function insignia(clave, dias) {
  return `<span class="status ${CLASE_ESTADO[clave]}">${GLIFOS[clave]}${esc(textoEstado(clave, dias))}</span>`;
}
