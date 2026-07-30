/**
 * Traducción del dominio al calendario.
 *
 * `ics.js` sabe escribir un archivo iCalendar y nada más. Este módulo es el que
 * decide qué significa cada fila del carnet en términos de evento y de alarmas.
 */

import { hoy, fmtLargo, sumarDias, diffDias } from './fecha.js';
import { construirCalendario, descargar, nombreSeguro } from './ics.js';
import { toast } from './ui.js';

/**
 * Una fecha ya vencida no sirve como evento de calendario: nace en el pasado y
 * ninguna alarma llega a sonar. Esas se agendan para mañana, dejando claro en el
 * título que venían atrasadas.
 */
export function eventosICS(lista) {
  return lista.map((p) => {
    const vencida = p.estado === 'vencida';
    const fecha = vencida ? sumarDias(hoy(), 1) : p.proxima;
    const faltan = vencida ? 1 : (diffDias(hoy(), p.proxima) ?? 0);

    // En horas, no en días, para que el aviso caiga a las 9 de la mañana y no a
    // medianoche del día anterior.
    const avisos = [];
    if (faltan >= 8) avisos.push({ trigger: '-PT159H', texto: 'en una semana' });
    if (faltan >= 2) avisos.push({ trigger: '-PT15H', texto: 'el dia anterior' });
    if (!avisos.length) avisos.push({ trigger: 'PT9H', texto: 'hoy' });

    return {
      uid: `${p.mascota.id}-${p.clave}-${p.proxima}`,
      fecha,
      titulo: vencida
        ? `${p.corto} atrasada — ${p.mascota.nombre}`
        : `${p.corto} — ${p.mascota.nombre}`,
      descripcion: [
        vencida ? `Estaba programada para el ${fmtLargo(p.proxima)} y sigue pendiente.` : null,
        `Última aplicación: ${fmtLargo(p.ultima.fecha)}.`,
        p.ultima.aplicadoPor ? `Aplicada por ${p.ultima.aplicadoPor}.` : null,
        'Confirma con tu veterinario antes de aplicar.',
      ]
        .filter(Boolean)
        .join(' '),
      avisos,
    };
  });
}

export function descargarCalendario(lista, nombre) {
  if (!lista.length) {
    toast('No hay fechas próximas que agendar.');
    return;
  }
  descargar(`${nombreSeguro(nombre)}.ics`, construirCalendario(eventosICS(lista)));
  toast('Calendario descargado. Ábrelo para agregarlo a tu app de calendario.');
}
