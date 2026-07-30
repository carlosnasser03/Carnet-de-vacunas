/**
 * Estado y lógica de dominio.
 *
 * No conoce el navegador: la escritura pasa siempre por un almacén inyectado
 * (ver `persistencia.js`), y no toca canvas, notificaciones ni cuotas. Lo único
 * que hace es mantener las mascotas, sus dosis y sus episodios, y derivar de
 * ahí qué le toca a cada una.
 */

import { hoy, diffDias, sumarDias } from './fecha.js';
import { protocolosDe, protocoloPorId } from './protocolos.js';
import { almacenLocal } from './persistencia.js';

const CLAVE = 'carnet.v1';
const VACIO = { v: 1, mascotas: [], dosis: [], eventos: [], intervalos: {} };

let almacen = almacenLocal(CLAVE);
let estado = cargar();
const oyentes = new Set();

/** Sustituye el respaldo de almacenamiento y recarga desde él. */
export function usarAlmacen(otro) {
  almacen = otro;
  estado = cargar();
  emitir();
}

export function uid() {
  return (
    Date.now().toString(36) +
    '-' +
    Math.random().toString(36).slice(2, 8) +
    Math.random().toString(36).slice(2, 6)
  );
}

function cargar() {
  try {
    const crudo = almacen.leer();
    return crudo ? normalizar(JSON.parse(crudo)) : structuredClone(VACIO);
  } catch {
    return structuredClone(VACIO);
  }
}

function normalizar(datos) {
  if (!datos || typeof datos !== 'object') return structuredClone(VACIO);
  return {
    v: 1,
    mascotas: Array.isArray(datos.mascotas) ? datos.mascotas : [],
    dosis: Array.isArray(datos.dosis) ? datos.dosis : [],
    eventos: Array.isArray(datos.eventos) ? datos.eventos : [],
    intervalos: datos.intervalos && typeof datos.intervalos === 'object' ? datos.intervalos : {},
  };
}

function emitir() {
  for (const fn of oyentes) fn(estado);
}

export function suscribir(fn) {
  oyentes.add(fn);
  return () => oyentes.delete(fn);
}

export function leer() {
  return estado;
}

function aplicar(mutacion) {
  mutacion(estado);
  const res = almacen.escribir(JSON.stringify(estado));
  emitir();
  return res;
}

/* ------------------------------------------------------------- mascotas -- */

export function mascotas() {
  return [...estado.mascotas].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
}

export function mascota(id) {
  return estado.mascotas.find((m) => m.id === id) ?? null;
}

export function guardarMascota(datos) {
  const id = datos.id || uid();
  return {
    ...aplicar((s) => {
      const i = s.mascotas.findIndex((m) => m.id === id);
      const registro = { ...datos, id, creado: datos.creado || new Date().toISOString() };
      if (i >= 0) s.mascotas[i] = registro;
      else s.mascotas.push(registro);
    }),
    id,
  };
}

export function eliminarMascota(id) {
  return aplicar((s) => {
    s.mascotas = s.mascotas.filter((m) => m.id !== id);
    s.dosis = s.dosis.filter((d) => d.mascotaId !== id);
    s.eventos = s.eventos.filter((e) => e.mascotaId !== id);
  });
}

/* ---------------------------------------------------------------- dosis -- */

export function dosisDe(mascotaId) {
  return estado.dosis
    .filter((d) => d.mascotaId === mascotaId)
    .sort((a, b) => (a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : 0));
}

export function dosis(id) {
  return estado.dosis.find((d) => d.id === id) ?? null;
}

export function guardarDosis(datos) {
  const id = datos.id || uid();
  return {
    ...aplicar((s) => {
      const i = s.dosis.findIndex((d) => d.id === id);
      const registro = { ...datos, id, creado: datos.creado || new Date().toISOString() };
      if (i >= 0) s.dosis[i] = registro;
      else s.dosis.push(registro);
    }),
    id,
  };
}

export function eliminarDosis(id) {
  return aplicar((s) => {
    s.dosis = s.dosis.filter((d) => d.id !== id);
  });
}

/* -------------------------------------------------------------- eventos -- */

export function eventosDe(mascotaId) {
  return estado.eventos
    .filter((e) => e.mascotaId === mascotaId)
    .sort((a, b) => (a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : 0));
}

export function evento(id) {
  return estado.eventos.find((e) => e.id === id) ?? null;
}

export function guardarEvento(datos) {
  const id = datos.id || uid();
  return {
    ...aplicar((s) => {
      const i = s.eventos.findIndex((e) => e.id === id);
      const registro = { ...datos, id, creado: datos.creado || new Date().toISOString() };
      if (i >= 0) s.eventos[i] = registro;
      else s.eventos.push(registro);
    }),
    id,
  };
}

export function eliminarEvento(id) {
  return aplicar((s) => {
    s.eventos = s.eventos.filter((e) => e.id !== id);
  });
}

/* ----------------------------------------------------------- intervalos -- */

export function intervalos() {
  return estado.intervalos;
}

export function fijarIntervalo(protocoloId, dias) {
  return aplicar((s) => {
    const n = Number(dias);
    if (!Number.isFinite(n) || n <= 0) delete s.intervalos[protocoloId];
    else s.intervalos[protocoloId] = Math.round(n);
  });
}

export function restablecerIntervalos() {
  return aplicar((s) => {
    s.intervalos = {};
  });
}

/* --------------------------------------------------------- derivaciones -- */

export const DIAS_AVISO = 30;

export function estadoDe(proxima) {
  if (!proxima) return { estado: 'sin-fecha', dias: null };
  const dias = diffDias(hoy(), proxima);
  if (dias === null) return { estado: 'sin-fecha', dias: null };
  if (dias < 0) return { estado: 'vencida', dias };
  if (dias <= DIAS_AVISO) return { estado: 'pronto', dias };
  return { estado: 'ok', dias };
}

/**
 * Qué le toca a una mascota. Solo aparecen los protocolos que ya tienen al
 * menos una dosis registrada: el carnet refleja lo que pasó, no una lista de
 * lo que alguien opina que debería pasar.
 */
export function proximasDe(mascotaId) {
  const m = mascota(mascotaId);
  if (!m) return [];
  const ov = estado.intervalos;
  const catalogo = protocolosDe(m.especie, ov);
  const grupos = new Map();

  for (const d of dosisDe(mascotaId)) {
    const clave =
      d.protocoloId === 'otro' ? `otro:${(d.nombre || '').trim().toLowerCase()}` : d.protocoloId;
    if (!grupos.has(clave)) grupos.set(clave, []);
    grupos.get(clave).push(d);
  }

  const filas = [];
  for (const [clave, lista] of grupos) {
    lista.sort((a, b) => (a.fecha < b.fecha ? 1 : -1));
    const ultima = lista[0];
    const proto = clave.startsWith('otro:')
      ? {
          id: 'otro',
          nombre: ultima.nombre || 'Otra aplicación',
          corto: ultima.nombre || 'Otra',
          tipo: 'vacuna',
          intervaloDias: null,
          nota: '',
        }
      : (protocoloPorId(clave, ov) ?? catalogo.find((p) => p.id === clave) ?? null);
    if (!proto) continue;

    const proxima = ultima.proxima || null;
    filas.push({
      clave,
      protocolo: proto,
      nombre: ultima.nombre || proto.nombre,
      corto: proto.corto || ultima.nombre || proto.nombre,
      ultima,
      historial: lista,
      proxima,
      ...estadoDe(proxima),
    });
  }

  const orden = { vencida: 0, pronto: 1, ok: 2, 'sin-fecha': 3 };
  return filas.sort((a, b) => {
    if (orden[a.estado] !== orden[b.estado]) return orden[a.estado] - orden[b.estado];
    if (a.dias === null) return 1;
    if (b.dias === null) return -1;
    return a.dias - b.dias;
  });
}

/** El peor estado de la mascota, para la lista de inicio. */
export function resumenDe(mascotaId) {
  const filas = proximasDe(mascotaId).filter((f) => f.proxima);
  if (!filas.length) return { estado: 'sin-fecha', dias: null, fila: null };
  const peor = filas[0];
  return { estado: peor.estado, dias: peor.dias, fila: peor };
}

/** Todas las aplicaciones pendientes de todas las mascotas, para el calendario. */
export function pendientes() {
  const salida = [];
  for (const m of mascotas()) {
    for (const fila of proximasDe(m.id)) {
      if (fila.proxima) salida.push({ mascota: m, ...fila });
    }
  }
  return salida.sort((a, b) => (a.proxima < b.proxima ? -1 : 1));
}

/** Sugerencia de próxima fecha al capturar una dosis. */
export function sugerirProxima(mascotaId, protocoloId, fechaAplicacion) {
  const m = mascota(mascotaId);
  const proto = protocoloPorId(protocoloId, estado.intervalos);
  if (!proto || !fechaAplicacion) return { fecha: '', motivo: '' };

  // Serie de cachorro: mientras no pase de las 16 semanas, el refuerzo es a 3 semanas.
  if (proto.tipo === 'vacuna' && m?.nacimiento) {
    const edadAlAplicar = diffDias(m.nacimiento, fechaAplicacion);
    if (edadAlAplicar !== null && edadAlAplicar >= 0 && edadAlAplicar < 112) {
      return {
        fecha: sumarDias(fechaAplicacion, 21),
        motivo: 'Serie de cachorro: se sugiere el refuerzo a 3 semanas.',
      };
    }
  }
  return {
    fecha: sumarDias(fechaAplicacion, proto.intervaloDias),
    motivo: `Intervalo por defecto: ${proto.intervaloDias} días.`,
  };
}

/* --------------------------------------------------------------- datos -- */

export function exportar() {
  return JSON.stringify({ ...estado, exportado: new Date().toISOString() }, null, 2);
}

export function importar(texto, modo = 'reemplazar') {
  let datos;
  try {
    datos = JSON.parse(texto);
  } catch {
    return { ok: false, error: 'El archivo no es un respaldo válido.' };
  }
  const limpio = normalizar(datos);
  if (!limpio.mascotas.length && !limpio.dosis.length && !limpio.eventos.length) {
    return { ok: false, error: 'El respaldo no contiene mascotas ni registros.' };
  }
  return aplicar((s) => {
    if (modo === 'reemplazar') {
      s.mascotas = limpio.mascotas;
      s.dosis = limpio.dosis;
      s.eventos = limpio.eventos;
      s.intervalos = limpio.intervalos;
    } else {
      const idsM = new Set(s.mascotas.map((m) => m.id));
      const idsD = new Set(s.dosis.map((d) => d.id));
      const idsE = new Set(s.eventos.map((e) => e.id));
      s.mascotas.push(...limpio.mascotas.filter((m) => !idsM.has(m.id)));
      s.dosis.push(...limpio.dosis.filter((d) => !idsD.has(d.id)));
      s.eventos.push(...limpio.eventos.filter((e) => !idsE.has(e.id)));
      s.intervalos = { ...limpio.intervalos, ...s.intervalos };
    }
  });
}

export function borrarTodo() {
  return aplicar((s) => {
    s.mascotas = [];
    s.dosis = [];
    s.eventos = [];
    s.intervalos = {};
  });
}
