/**
 * Instalación en la pantalla de inicio.
 *
 * Es la protección más efectiva de los datos: una app instalada deja de contar
 * como sitio web, y la regla de Safari en iOS que borra el almacenamiento tras
 * 7 días sin visitas ya no le aplica.
 *
 * Los dos caminos son muy distintos y no hay forma de unificarlos:
 * - Chrome y Edge disparan `beforeinstallprompt` y permiten instalar con un
 *   botón. Hay que capturar el evento antes de que el navegador lo muestre.
 * - Safari en iOS no tiene API. Lo único posible es explicar los dos toques.
 */

import { almacenLocal } from './persistencia.js';

const avisoOculto = almacenLocal('carnet.aviso-instalacion');

let promptDiferido = null;

window.addEventListener('beforeinstallprompt', (ev) => {
  ev.preventDefault();
  promptDiferido = ev;
  document.dispatchEvent(new CustomEvent('carnet:instalable'));
});

window.addEventListener('appinstalled', () => {
  promptDiferido = null;
  document.dispatchEvent(new CustomEvent('carnet:instalada'));
});

export function estaInstalada() {
  return (
    matchMedia('(display-mode: standalone)').matches ||
    matchMedia('(display-mode: window-controls-overlay)').matches ||
    navigator.standalone === true
  );
}

export function esIOS() {
  const ua = navigator.userAgent;
  // iPadOS se presenta como Mac; los puntos táctiles lo delatan.
  return (
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}

export function puedeInstalarDirecto() {
  return promptDiferido !== null;
}

/** @returns {Promise<'aceptada'|'rechazada'|'sin-soporte'>} */
export async function instalar() {
  if (!promptDiferido) return 'sin-soporte';
  promptDiferido.prompt();
  const { outcome } = await promptDiferido.userChoice;
  promptDiferido = null;
  return outcome === 'accepted' ? 'aceptada' : 'rechazada';
}

/* ------------------------------------------------------- aviso descartable */

export function avisoDescartado() {
  return avisoOculto.leer() === 'si';
}

export function descartarAviso() {
  avisoOculto.escribir('si');
}

/**
 * El aviso solo aparece cuando hay algo que perder: si no hay ni una mascota
 * registrada, insistir con la instalación es ruido.
 */
export function debeMostrarAviso(hayMascotas) {
  return hayMascotas && !estaInstalada() && !avisoDescartado();
}

/** Instrucciones según el navegador, porque el camino no es el mismo. */
export function instrucciones() {
  if (esIOS()) {
    return {
      titulo: 'Instalarla en tu iPhone o iPad',
      pasos: [
        'Abre esta página en Safari (no funciona desde Chrome en iOS).',
        'Toca el botón Compartir, el cuadrito con la flecha hacia arriba.',
        'Baja y elige “Agregar a pantalla de inicio”.',
      ],
      porque:
        'En iPhone es especialmente importante: Safari borra los datos de los sitios web que no se visitan en 7 días, y esta app se abre pocas veces al año. Instalada, esa regla ya no aplica.',
    };
  }
  return {
    titulo: 'Instalarla en tu teléfono o computadora',
    pasos: [
      'Abre el menú del navegador, el de los tres puntos.',
      'Elige “Instalar app” o “Agregar a la pantalla de inicio”.',
    ],
    porque:
      'Instalada abre sin barra del navegador, funciona sin internet y el navegador protege mejor sus datos.',
  };
}
