/**
 * Fechas. Todo se guarda como 'YYYY-MM-DD' y se compara a mediodía local,
 * para que un cambio de horario de verano no mueva un día un vencimiento.
 */

const MS_DIA = 86400000;

export function esISO(s) {
  return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);
}

export function toISO(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

export function parseISO(s) {
  if (!esISO(s)) return null;
  const [y, m, d] = s.split('-').map(Number);
  const fecha = new Date(y, m - 1, d, 12, 0, 0, 0);
  return Number.isNaN(fecha.getTime()) ? null : fecha;
}

export function hoy() {
  return toISO(new Date());
}

export function sumarDias(iso, dias) {
  const d = parseISO(iso);
  if (!d) return null;
  d.setDate(d.getDate() + Number(dias || 0));
  return toISO(d);
}

/** Días de `desde` a `hasta`. Negativo si `hasta` ya pasó. */
export function diffDias(desde, hasta) {
  const a = parseISO(desde);
  const b = parseISO(hasta);
  if (!a || !b) return null;
  return Math.round((b - a) / MS_DIA);
}

const fmtL = new Intl.DateTimeFormat('es', { day: 'numeric', month: 'long', year: 'numeric' });
const fmtC = new Intl.DateTimeFormat('es', { day: '2-digit', month: 'short', year: 'numeric' });

export function fmtLargo(iso) {
  const d = parseISO(iso);
  return d ? fmtL.format(d) : '—';
}

export function fmtCorto(iso) {
  const d = parseISO(iso);
  return d ? fmtC.format(d).replace('.', '') : '—';
}

export function edadEnDias(nacimiento, referencia = hoy()) {
  return diffDias(nacimiento, referencia);
}

/** Edad legible: semanas cuando es cachorro, luego años y meses. */
export function edadTexto(nacimiento, referencia = hoy()) {
  const dias = edadEnDias(nacimiento, referencia);
  if (dias === null || dias < 0) return '—';
  if (dias < 21) return dias === 1 ? '1 día' : `${dias} días`;
  if (dias < 120) {
    const semanas = Math.floor(dias / 7);
    return `${semanas} semanas`;
  }
  const a = parseISO(nacimiento);
  const b = parseISO(referencia);
  let meses = (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
  if (b.getDate() < a.getDate()) meses -= 1;
  const anios = Math.floor(meses / 12);
  const resto = meses % 12;
  if (anios === 0) return `${meses} ${meses === 1 ? 'mes' : 'meses'}`;
  const pa = `${anios} ${anios === 1 ? 'año' : 'años'}`;
  return resto ? `${pa} ${resto} ${resto === 1 ? 'mes' : 'meses'}` : pa;
}

/** "en 12 días" / "hace 3 días" / "hoy" — sin depender del color para el estado. */
export function relativo(dias) {
  if (dias === null) return '';
  if (dias === 0) return 'hoy';
  if (dias === 1) return 'mañana';
  if (dias === -1) return 'ayer';
  if (dias > 0) {
    if (dias < 60) return `en ${dias} días`;
    const m = Math.round(dias / 30.4);
    if (m < 18) return `en ${m} meses`;
    return `en ${Math.round(dias / 365)} años`;
  }
  const v = Math.abs(dias);
  if (v < 60) return `hace ${v} días`;
  const m = Math.round(v / 30.4);
  if (m < 18) return `hace ${m} meses`;
  return `hace ${Math.round(v / 365)} años`;
}
