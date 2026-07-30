/**
 * Arranque: ruteo, estado de interfaz y delegación de eventos.
 *
 * Todo lo que sabe hacer está en otros módulos. Aquí solo se decide qué vista
 * corresponde a la ruta y qué función atiende cada acción.
 */

import * as store from './store.js';
import * as vistas from './vistas.js';
import * as hojas from './hojas.js';
import * as instalar from './instalar.js';
import { hoy } from './fecha.js';
import { descargar } from './ics.js';
import { descargarCalendario } from './calendario.js';
import { toast, reportar } from './ui.js';
import { pedirPersistencia } from './persistencia.js';

const main = document.querySelector('#principal');

/* ------------------------------------------------------- estado de interfaz */

/** Efímero por definición: no se persiste, se pierde al recargar y está bien. */
const ui = { tab: 'vacunas', cara: 'anverso', ruta: '' };

function render() {
  const hash = location.hash || '#/';
  if (hash !== ui.ruta) {
    ui.cara = 'anverso';
    ui.ruta = hash;
  }

  const enMascota = hash.match(/^#\/m\/([^/]+)$/);
  const idMascota = enMascota ? decodeURIComponent(enMascota[1]) : null;

  if (hash === '#/ajustes') main.innerHTML = vistas.vistaAjustes();
  else if (idMascota) main.innerHTML = vistas.vistaMascota(idMascota, ui);
  else main.innerHTML = vistas.vistaInicio();

  const caja = main.querySelector('#estado-almacenamiento');
  if (caja) vistas.pintarAlmacenamiento(caja);

  document.title = idMascota
    ? `${store.mascota(idMascota)?.nombre ?? 'Carnet'} · Carnet`
    : 'Carnet · Salud de mis mascotas';
}

/* ------------------------------------------------------------------ acciones */

const acciones = {
  'nueva-mascota': () => hojas.hojaMascota(null),

  'editar-mascota': ({ id }) => hojas.hojaMascota(id),

  'eliminar-mascota': ({ id }) => {
    const m = store.mascota(id);
    hojas.hojaConfirmar({
      titulo: `Eliminar el carnet de ${m?.nombre ?? 'esta mascota'}`,
      texto: 'Se borran también todas sus dosis y episodios de salud. Esto no se puede deshacer.',
      alConfirmar() {
        store.eliminarMascota(id);
        location.hash = '#/';
        toast('Carnet eliminado.');
      },
    });
  },

  voltear: () => {
    ui.cara = ui.cara === 'anverso' ? 'reverso' : 'anverso';
    render();
  },

  'nueva-dosis': ({ mascota, protocolo, nombre }) =>
    hojas.hojaDosis({ mascotaId: mascota, protocoloId: protocolo, nombre }),

  'editar-dosis': ({ id }) => hojas.hojaDosis({ dosisId: id }),

  'eliminar-dosis': ({ id }) =>
    hojas.hojaConfirmar({
      titulo: 'Eliminar esta dosis',
      texto: 'Se quita del historial y la próxima fecha se recalcula con la dosis anterior, si existe.',
      alConfirmar() {
        store.eliminarDosis(id);
        toast('Dosis eliminada.');
      },
    }),

  'nuevo-evento': ({ mascota }) => hojas.hojaEvento({ mascotaId: mascota }),

  'editar-evento': ({ id }) => hojas.hojaEvento({ eventoId: id }),

  'eliminar-evento': ({ id }) =>
    hojas.hojaConfirmar({
      titulo: 'Eliminar este episodio',
      texto: 'Se borra el registro de signos, diagnóstico y medicamentos de este episodio.',
      alConfirmar() {
        store.eliminarEvento(id);
        toast('Episodio eliminado.');
      },
    }),

  tab: ({ tab }) => {
    ui.tab = tab;
    render();
  },

  'ics-fila': ({ mascota: mid, clave }) => {
    const fila = store.proximasDe(mid).find((f) => f.clave === clave);
    const m = store.mascota(mid);
    if (!fila || !m) return;
    descargarCalendario([{ mascota: m, ...fila }], `${m.nombre}-${fila.corto}`);
  },

  'ics-todo': () => descargarCalendario(store.pendientes(), 'carnet-mascotas'),

  imprimir: () => window.print(),

  exportar: () => {
    descargar(`carnet-respaldo-${hoy()}.json`, store.exportar(), 'application/json;charset=utf-8');
    toast('Respaldo descargado.');
  },

  importar: () => importarRespaldo(),

  instalar: async () => {
    const r = await instalar.instalar();
    if (r === 'aceptada') toast('Instalada. Ábrela desde el icono de tu pantalla de inicio.');
    else if (r === 'rechazada') toast('Instalación cancelada.');
    else toast('Este navegador no permite instalar con un botón. Mira los pasos en Ajustes.');
    render();
  },

  'ocultar-aviso': () => {
    instalar.descartarAviso();
    render();
  },

  'proteger-datos': async () => {
    const concedido = await pedirPersistencia();
    toast(
      concedido
        ? 'Listo: el navegador ya no borrará estos datos por falta de espacio.'
        : 'El navegador no lo concedió. Instala la app en la pantalla de inicio y vuelve a intentarlo.',
    );
    render();
  },

  'reset-intervalos': () => {
    store.restablecerIntervalos();
    toast('Intervalos restablecidos.');
  },

  'borrar-todo': () =>
    hojas.hojaConfirmar({
      titulo: 'Borrar todos los datos',
      texto:
        'Se eliminan todas las mascotas, dosis y episodios de este dispositivo. Exporta un respaldo antes si quieres conservarlos.',
      textoGuardar: 'Borrar todo',
      alConfirmar() {
        store.borrarTodo();
        location.hash = '#/';
        toast('Datos borrados.');
      },
    }),
};

function importarRespaldo() {
  const entrada = document.createElement('input');
  entrada.type = 'file';
  entrada.accept = 'application/json,.json';
  entrada.addEventListener('change', async () => {
    const archivo = entrada.files?.[0];
    if (!archivo) return;
    const texto = await archivo.text();
    hojas.hojaConfirmar({
      titulo: 'Importar respaldo',
      texto: 'Esto reemplaza las mascotas y registros que tengas ahora en este dispositivo.',
      textoGuardar: 'Reemplazar datos',
      alConfirmar() {
        reportar(store.importar(texto, 'reemplazar'), 'Respaldo importado.');
        location.hash = '#/';
      },
    });
  });
  entrada.click();
}

/* ------------------------------------------------------------------ eventos */

document.addEventListener('click', (ev) => {
  const disparador = ev.target.closest('[data-accion]');
  if (!disparador) return;
  const manejar = acciones[disparador.dataset.accion];
  if (manejar) manejar(disparador.dataset);
});

document.addEventListener('change', (ev) => {
  const campo = ev.target.closest('[data-intervalo]');
  if (!campo) return;
  store.fijarIntervalo(campo.dataset.intervalo, campo.value);
  toast('Intervalo actualizado.');
});

// El navegador decide cuándo la app es instalable; hay que repintar al saberlo.
document.addEventListener('carnet:instalable', render);
document.addEventListener('carnet:instalada', render);

/* -------------------------------------------------------------------- init */

store.suscribir(render);
window.addEventListener('hashchange', render);
render();

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}
