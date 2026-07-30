/**
 * Catálogo de protocolos de referencia.
 *
 * Los intervalos son valores por defecto basados en las guías de vacunación
 * WSAVA, que son internacionales. NO son una prescripción: la frecuencia legal
 * de la rabia y la disponibilidad de productos cambian por país, y el criterio
 * clínico manda. Por eso todo intervalo es editable desde Ajustes y en cada
 * dosis registrada.
 */

export const ESPECIES = [
  { id: 'perro', label: 'Perro' },
  { id: 'gato', label: 'Gato' },
  { id: 'otro', label: 'Otra especie' },
];

export const PROTOCOLOS = [
  {
    id: 'dhpp',
    especie: 'perro',
    tipo: 'vacuna',
    nombre: 'Polivalente (moquillo, hepatitis, parvovirus, parainfluenza)',
    corto: 'Polivalente',
    intervaloDias: 365,
    nota: 'Serie de cachorro: una dosis cada 3–4 semanas hasta pasadas las 16 semanas de edad. Refuerzo al año y luego cada 1 a 3 años según criterio del veterinario.',
  },
  {
    id: 'rabia-perro',
    especie: 'perro',
    tipo: 'vacuna',
    nombre: 'Rabia',
    corto: 'Rabia',
    intervaloDias: 365,
    nota: 'La frecuencia es legal, no solo clínica: anual en buena parte de América Latina, cada 3 años en varios países de Europa y en EE. UU. Ajusta el intervalo a la norma de tu país.',
  },
  {
    id: 'lepto',
    especie: 'perro',
    tipo: 'vacuna',
    nombre: 'Leptospirosis',
    corto: 'Leptospirosis',
    intervaloDias: 365,
    nota: 'No esencial. Se recomienda donde hay riesgo de contacto con agua estancada, roedores o ganado.',
  },
  {
    id: 'bordetella',
    especie: 'perro',
    tipo: 'vacuna',
    nombre: 'Tos de las perreras (Bordetella)',
    corto: 'Bordetella',
    intervaloDias: 365,
    nota: 'La piden muchas guarderías, hoteles caninos y escuelas de entrenamiento. Puede ser semestral si la exposición es alta.',
  },
  {
    id: 'influenza-canina',
    especie: 'perro',
    tipo: 'vacuna',
    nombre: 'Influenza canina',
    corto: 'Influenza',
    intervaloDias: 365,
    nota: 'No esencial. Disponibilidad limitada en algunos países.',
  },

  {
    id: 'trivalente',
    especie: 'gato',
    tipo: 'vacuna',
    nombre: 'Trivalente felina (panleucopenia, calicivirus, rinotraqueítis)',
    corto: 'Trivalente',
    intervaloDias: 365,
    nota: 'Serie de gatito: una dosis cada 3–4 semanas hasta pasadas las 16 semanas. Refuerzo al año y luego cada 1 a 3 años según criterio del veterinario.',
  },
  {
    id: 'rabia-gato',
    especie: 'gato',
    tipo: 'vacuna',
    nombre: 'Rabia',
    corto: 'Rabia',
    intervaloDias: 365,
    nota: 'Igual que en perros, la frecuencia depende de la norma de cada país. Ajusta el intervalo a la tuya.',
  },
  {
    id: 'felv',
    especie: 'gato',
    tipo: 'vacuna',
    nombre: 'Leucemia felina (FeLV)',
    corto: 'Leucemia felina',
    intervaloDias: 365,
    nota: 'Recomendada sobre todo en gatos con acceso al exterior o que conviven con gatos de estado desconocido.',
  },

  {
    id: 'desp-interna',
    especie: 'todas',
    tipo: 'preventivo',
    nombre: 'Desparasitación interna',
    corto: 'Desparasitación interna',
    intervaloDias: 90,
    nota: 'En adultos suele repetirse cada 3 meses. En cachorros y gatitos el esquema inicial es mucho más frecuente.',
  },
  {
    id: 'desp-externa',
    especie: 'todas',
    tipo: 'preventivo',
    nombre: 'Antipulgas y garrapatas',
    corto: 'Antipulgas',
    intervaloDias: 30,
    nota: 'Depende por completo del producto: hay pipetas mensuales y comprimidos de hasta 12 semanas. Ajusta al que uses.',
  },
];

/** Protocolos aplicables a una especie, con los intervalos del usuario ya aplicados. */
export function protocolosDe(especie, overrides = {}) {
  return PROTOCOLOS
    .filter((p) => p.especie === especie || p.especie === 'todas')
    .map((p) => ({ ...p, intervaloDias: overrides[p.id] ?? p.intervaloDias }));
}

export function protocoloPorId(id, overrides = {}) {
  const p = PROTOCOLOS.find((x) => x.id === id);
  if (!p) return null;
  return { ...p, intervaloDias: overrides[p.id] ?? p.intervaloDias };
}

export function etiquetaEspecie(id) {
  return ESPECIES.find((e) => e.id === id)?.label ?? 'Mascota';
}
