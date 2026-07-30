/**
 * Calendario (.ics).
 *
 * Esta es la vía de recordatorio principal de la app, y es deliberado: las
 * notificaciones web no llegan en iOS salvo que el usuario instale la PWA en la
 * pantalla de inicio. Un evento en el calendario que ya usa todos los días sí
 * llega, en cualquier sistema, sin permisos ni servidor.
 */

import { sumarDias } from './fecha.js';

function escapar(texto = '') {
  return String(texto)
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

/** Plegado a 75 octetos según RFC 5545. */
function plegar(linea) {
  if (new TextEncoder().encode(linea).length <= 75) return linea;
  const partes = [];
  let actual = '';
  let cuenta = 0;
  for (const char of linea) {
    const ancho = new TextEncoder().encode(char).length;
    const limite = partes.length === 0 ? 75 : 74;
    if (cuenta + ancho > limite) {
      partes.push(actual);
      actual = '';
      cuenta = 0;
    }
    actual += char;
    cuenta += ancho;
  }
  if (actual) partes.push(actual);
  return partes.join('\r\n ');
}

function selloUTC(fecha = new Date()) {
  return fecha.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

function soloFecha(iso) {
  return iso.replace(/-/g, '');
}

const AVISOS_POR_DEFECTO = [
  { trigger: '-PT159H', texto: 'en una semana' },
  { trigger: '-PT15H', texto: 'el dia anterior' },
];

/**
 * @param {{uid:string,fecha:string,titulo:string,descripcion?:string,
 *          avisos?:{trigger:string,texto:string}[]}[]} eventos
 */
export function construirCalendario(eventos) {
  const lineas = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Carnet//Salud de mascotas//ES',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Carnet de mis mascotas',
  ];

  const sello = selloUTC();

  for (const ev of eventos) {
    lineas.push(
      'BEGIN:VEVENT',
      `UID:${ev.uid}@carnet.local`,
      `DTSTAMP:${sello}`,
      `DTSTART;VALUE=DATE:${soloFecha(ev.fecha)}`,
      `DTEND;VALUE=DATE:${soloFecha(sumarDias(ev.fecha, 1))}`,
      `SUMMARY:${escapar(ev.titulo)}`,
      'TRANSP:TRANSPARENT',
    );
    if (ev.descripcion) lineas.push(`DESCRIPTION:${escapar(ev.descripcion)}`);

    // Los disparadores se calculan en horas, no en días, para que el aviso
    // caiga a las 9 de la mañana y no a medianoche del día anterior.
    for (const aviso of ev.avisos?.length ? ev.avisos : AVISOS_POR_DEFECTO) {
      lineas.push(
        'BEGIN:VALARM',
        'ACTION:DISPLAY',
        `TRIGGER:${aviso.trigger}`,
        `DESCRIPTION:${escapar(`${ev.titulo} (${aviso.texto})`)}`,
        'END:VALARM',
      );
    }
    lineas.push('END:VEVENT');
  }

  lineas.push('END:VCALENDAR');
  return lineas.map(plegar).join('\r\n') + '\r\n';
}

export function descargar(nombreArchivo, contenido, tipo = 'text/calendar;charset=utf-8') {
  const blob = new Blob([contenido], { type: tipo });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombreArchivo;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/** Nombre de archivo sin acentos ni espacios. */
export function nombreSeguro(texto, respaldo = 'carnet') {
  const limpio = String(texto || '')
    .normalize('NFD')
    .replace(/[^ -~]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
  return limpio || respaldo;
}
