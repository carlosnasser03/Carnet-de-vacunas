/**
 * Vistas: funciones puras que reciben datos y estado de interfaz, y devuelven
 * HTML. No mutan nada ni escuchan eventos — de eso se encarga `app.js`.
 */

import * as store from './store.js';
import { fmtLargo, fmtCorto, edadTexto } from './fecha.js';
import { ESPECIES, PROTOCOLOS, etiquetaEspecie } from './protocolos.js';
import { nombreSeguro } from './ics.js';
import { esc, insignia, GLIFOS, SVG_PATA } from './ui.js';
import { estadoAlmacenamiento } from './persistencia.js';
import * as instalar from './instalar.js';

/* ---------------------------------------------------------------- carnet -- */

export function carnet(m, cara = 'anverso') {
  const foto = m.foto ? `<img src="${esc(m.foto)}" alt="Foto de ${esc(m.nombre)}">` : SVG_PATA;

  const linea = [
    etiquetaEspecie(m.especie).toUpperCase(),
    (m.raza || 'SIN RAZA REGISTRADA').toUpperCase(),
    m.sexo ? m.sexo.toUpperCase() : 'SEXO NO REGISTRADO',
  ].join(' · ');

  const mrz = esc(
    [
      'CARNET',
      nombreSeguro(m.nombre, 'mascota').toUpperCase().replace(/-/g, '<'),
      m.microchip || 'SIN<CHIP',
      m.nacimiento ? m.nacimiento.replace(/-/g, '') : '00000000',
    ].join('<<'),
  );

  return `
  <section class="carnet" data-face="${cara}" aria-label="Carnet de ${esc(m.nombre)}">
    <div class="carnet__inner">
      <article class="carnet__face" ${cara === 'reverso' ? 'aria-hidden="true"' : ''}>
        <header class="carnet__head">
          <span class="carnet__kind">Carnet de salud</span>
          <span class="carnet__kind">${esc(etiquetaEspecie(m.especie))}</span>
        </header>
        <div class="carnet__body">
          <figure class="carnet__photo">${foto}</figure>
          <div class="carnet__id">
            <h2 class="carnet__name">${esc(m.nombre)}</h2>
            <p class="carnet__species">${esc(linea)}</p>
            <div class="carnet__grid">
              <div class="carnet__field">
                <div class="fieldlabel">Nacimiento</div>
                <div class="carnet__value">${m.nacimiento ? esc(fmtCorto(m.nacimiento)) : '—'}</div>
              </div>
              <div class="carnet__field">
                <div class="fieldlabel">Edad</div>
                <div class="carnet__value">${m.nacimiento ? esc(edadTexto(m.nacimiento)) : '—'}</div>
              </div>
              <div class="carnet__field">
                <div class="fieldlabel">Peso</div>
                <div class="carnet__value">${m.peso ? esc(m.peso) + ' kg' : '—'}</div>
              </div>
            </div>
          </div>
        </div>
        <p class="carnet__mrz">${mrz}</p>
        <button type="button" class="carnet__flip no-print" data-accion="voltear">Ver reverso</button>
      </article>

      <article class="carnet__face carnet__face--reverso" ${cara === 'anverso' ? 'aria-hidden="true"' : ''}>
        <header class="carnet__head">
          <span class="carnet__kind">Datos adicionales</span>
          <span class="carnet__kind">${esc(m.nombre)}</span>
        </header>
        <div class="carnet__grid" style="margin-top:var(--s3)">
          <div class="carnet__field">
            <div class="fieldlabel">Microchip</div>
            <div class="carnet__value">${m.microchip ? esc(m.microchip) : 'No registrado'}</div>
          </div>
          <div class="carnet__field">
            <div class="fieldlabel">Esterilizado</div>
            <div class="carnet__value">${m.esterilizado ? 'Sí' : 'No registrado'}</div>
          </div>
          <div class="carnet__field">
            <div class="fieldlabel">Señas</div>
            <div class="carnet__value">${m.senas ? esc(m.senas) : '—'}</div>
          </div>
          <div class="carnet__field">
            <div class="fieldlabel">Veterinaria</div>
            <div class="carnet__value">${m.clinica ? esc(m.clinica) : '—'}</div>
          </div>
        </div>
        <p class="carnet__notes">${m.notas ? esc(m.notas) : 'Sin notas.'}</p>
        <button type="button" class="carnet__flip no-print" data-accion="voltear">Ver anverso</button>
      </article>
    </div>
  </section>`;
}

/* ----------------------------------------------------------- vista inicio -- */

function avisoInstalacion(hayMascotas) {
  if (!instalar.debeMostrarAviso(hayMascotas)) return '';
  const directo = instalar.puedeInstalarDirecto();
  return `
  <div class="note no-print">
    <strong>Instálala en la pantalla de inicio.</strong>
    ${
      instalar.esIOS()
        ? 'En iPhone es lo que evita que Safari borre tus datos: elimina el almacenamiento de los sitios que no se abren en 7 días, y esta app se usa pocas veces al año.'
        : 'Abre sin barra del navegador, funciona sin internet y el navegador protege mejor tus datos.'
    }
    <div class="actionbar" style="margin-top:var(--s3)">
      ${directo ? '<button class="btn btn--sm btn--primary" data-accion="instalar">Instalar ahora</button>' : ''}
      <a class="btn btn--sm" href="#/ajustes">Ver cómo se hace</a>
      <button class="btn btn--sm" data-accion="ocultar-aviso">Ahora no</button>
    </div>
  </div>`;
}

export function vistaInicio() {
  const lista = store.mascotas();

  if (!lista.length) {
    return `
    <div class="stack">
      <div>
        <h1 class="page-title">Mis mascotas</h1>
        <p class="page-sub">Un carnet de vacunación por mascota, guardado en este dispositivo.</p>
      </div>
      <div class="empty">
        <h2 class="empty__title">Aún no hay ningún carnet</h2>
        <p class="empty__text">Crea el carnet de tu primera mascota. Después registra las dosis que ya tiene aplicadas y la app calcula sola cuándo toca la siguiente.</p>
        <button class="btn btn--primary" data-accion="nueva-mascota">Crear el primer carnet</button>
      </div>
    </div>`;
  }

  const pendientes = store.pendientes();
  const urgentes = pendientes.filter((p) => p.estado === 'vencida' || p.estado === 'pronto');

  const tarjetas = lista
    .map((m) => {
      const r = store.resumenDe(m.id);
      const foto = m.foto ? `<img src="${esc(m.foto)}" alt="">` : SVG_PATA;
      const detalle = r.fila
        ? `${esc(r.fila.corto)} · ${esc(fmtCorto(r.fila.proxima))}`
        : 'Sin aplicaciones registradas';
      return `
      <a class="petcard" href="#/m/${esc(m.id)}">
        <span class="petcard__photo">${foto}</span>
        <span class="petcard__body">
          <span class="petcard__name">${esc(m.nombre)}</span>
          <span class="row__meta">${detalle}</span>
          ${insignia(r.estado, r.dias)}
        </span>
      </a>`;
    })
    .join('');

  return `
  <div class="stack">
    <div>
      <h1 class="page-title">Mis mascotas</h1>
      <p class="page-sub">${lista.length} ${lista.length === 1 ? 'carnet' : 'carnets'} en este dispositivo${
        urgentes.length
          ? ` · ${urgentes.length} ${urgentes.length === 1 ? 'aplicación pendiente' : 'aplicaciones pendientes'}`
          : ''
      }.</p>
    </div>

    ${avisoInstalacion(true)}

    <div class="petlist">${tarjetas}</div>

    <div class="actionbar">
      <button class="btn btn--primary" data-accion="nueva-mascota">Agregar mascota</button>
      ${pendientes.length ? `<button class="btn" data-accion="ics-todo">Agregar todo al calendario</button>` : ''}
    </div>
  </div>`;
}

/* --------------------------------------------------------- vista mascota -- */

export function vistaMascota(id, { tab = 'vacunas', cara = 'anverso' } = {}) {
  const m = store.mascota(id);
  if (!m) {
    return `<div class="empty"><h2 class="empty__title">Ese carnet ya no existe</h2><a class="btn" href="#/">Volver al inicio</a></div>`;
  }

  const filas = store.proximasDe(id);
  const dosis = store.dosisDe(id);
  const eventos = store.eventosDe(id);

  const bloqueProximas = filas.length
    ? `<div class="rows">${filas.map((f) => filaProxima(m, f)).join('')}</div>`
    : `<div class="empty">
         <h2 class="empty__title">Todavía no hay dosis registradas</h2>
         <p class="empty__text">Registra la última vacuna o desparasitación que le aplicaron. Con esa fecha la app calcula la siguiente y te la puede mandar al calendario.</p>
         <button class="btn btn--primary" data-accion="nueva-dosis" data-mascota="${esc(id)}">Registrar una aplicación</button>
       </div>`;

  const panel =
    tab === 'salud'
      ? eventos.length
        ? `<div class="rows">${eventos.map(filaEvento).join('')}</div>`
        : `<div class="empty">
             <h2 class="empty__title">Sin episodios registrados</h2>
             <p class="empty__text">Aquí queda el registro de cuándo se enfermó, qué tuvo y qué medicamento se le dio. Sirve para no repetir tratamientos y para que el veterinario vea el antecedente completo.</p>
             <button class="btn btn--primary" data-accion="nuevo-evento" data-mascota="${esc(id)}">Registrar un episodio</button>
           </div>`
      : dosis.length
        ? `<div class="rows">${dosis.map(filaDosis).join('')}</div>`
        : `<div class="empty"><h2 class="empty__title">Sin dosis en el historial</h2><p class="empty__text">Cada dosis que registres queda aquí con su fecha, lote y quién la aplicó.</p></div>`;

  return `
  <div class="stack">
    <div class="no-print">
      <a class="btn btn--sm" href="#/">← Mis mascotas</a>
    </div>

    <div class="layout">
      <div class="layout__aside">
        ${carnet(m, cara)}
        <div class="actionbar no-print">
          <button class="btn btn--primary" data-accion="nueva-dosis" data-mascota="${esc(id)}">Registrar dosis</button>
          <button class="btn" data-accion="nuevo-evento" data-mascota="${esc(id)}">Registrar episodio</button>
        </div>
        <div class="actionbar no-print">
          <button class="btn btn--sm" data-accion="editar-mascota" data-id="${esc(id)}">Editar datos</button>
          <button class="btn btn--sm" data-accion="imprimir">Imprimir carnet</button>
          <button class="btn btn--sm btn--danger" data-accion="eliminar-mascota" data-id="${esc(id)}">Eliminar</button>
        </div>
      </div>

      <div class="stack">
        <section class="section">
          <div class="section__head">
            <h2 class="section__title">Qué le toca</h2>
            ${filas.length ? `<span class="section__count">${filas.length} ${filas.length === 1 ? 'protocolo' : 'protocolos'}</span>` : ''}
          </div>
          ${bloqueProximas}
        </section>

        <section class="section">
          <div class="tabs no-print" role="tablist">
            <button class="tab" role="tab" data-accion="tab" data-tab="vacunas" aria-selected="${tab !== 'salud'}">Historial de dosis</button>
            <button class="tab" role="tab" data-accion="tab" data-tab="salud" aria-selected="${tab === 'salud'}">Salud (${eventos.length})</button>
          </div>
          <h2 class="section__title print-only">${tab === 'salud' ? 'Historial de salud' : 'Historial de dosis'}</h2>
          ${panel}
        </section>
      </div>
    </div>
  </div>`;
}

function filaProxima(m, f) {
  const vencida = f.estado === 'vencida';
  return `
  <article class="row ${vencida ? 'row--due' : ''}">
    <div class="row__main">
      <h3 class="row__title">${esc(f.corto)}</h3>
      <p class="row__meta">${esc(fmtLargo(f.proxima))} · última: ${esc(fmtCorto(f.ultima.fecha))}</p>
    </div>
    <div class="row__side">${insignia(f.estado, f.dias)}</div>
    <div class="row__foot no-print">
      <button class="btn btn--sm" data-accion="nueva-dosis" data-mascota="${esc(m.id)}" data-protocolo="${esc(f.protocolo.id)}" data-nombre="${esc(f.nombre)}">Registrar aplicación</button>
      <button class="btn btn--sm" data-accion="ics-fila" data-mascota="${esc(m.id)}" data-clave="${esc(f.clave)}">Al calendario</button>
    </div>
  </article>`;
}

function filaDosis(d) {
  const meta = [
    `Aplicada el ${fmtLargo(d.fecha)}`,
    d.lote ? `Lote ${d.lote}` : null,
    d.aplicadoPor ? d.aplicadoPor : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return `
  <article class="row">
    <div class="row__main">
      <h3 class="row__title">${esc(d.nombre)}</h3>
      <p class="row__meta">${esc(meta)}</p>
      ${d.proxima ? `<p class="row__meta">Siguiente: ${esc(fmtLargo(d.proxima))}</p>` : ''}
      ${d.notas ? `<p class="row__meta">${esc(d.notas)}</p>` : ''}
    </div>
    <div class="row__side"><span class="chip chip--seal">Aplicada</span></div>
    <div class="row__foot no-print">
      <button class="btn btn--sm" data-accion="editar-dosis" data-id="${esc(d.id)}">Editar</button>
      <button class="btn btn--sm btn--danger" data-accion="eliminar-dosis" data-id="${esc(d.id)}">Eliminar</button>
    </div>
  </article>`;
}

function filaEvento(e) {
  const rango = e.fechaFin
    ? `${fmtLargo(e.fecha)} — ${fmtLargo(e.fechaFin)}`
    : `Desde el ${fmtLargo(e.fecha)}`;
  const tratamientos = (e.tratamientos || []).filter((t) => t.nombre);

  return `
  <article class="row">
    <div class="row__main">
      <h3 class="row__title">${esc(e.titulo)}</h3>
      <p class="row__meta">${esc(rango)}${e.fechaFin ? '' : ' · en curso'}</p>
      ${e.sintomas ? `<p class="row__meta">Signos: ${esc(e.sintomas)}</p>` : ''}
      ${e.diagnostico ? `<p class="row__meta">Diagnóstico: ${esc(e.diagnostico)}</p>` : ''}
      ${e.notas ? `<p class="row__meta">${esc(e.notas)}</p>` : ''}
    </div>
    <div class="row__side">
      <span class="status ${e.fechaFin ? 'status--ok' : 'status--warn'}">${e.fechaFin ? GLIFOS.ok : GLIFOS.pronto}${e.fechaFin ? 'Resuelto' : 'En curso'}</span>
    </div>
    ${
      tratamientos.length
        ? `<ul class="treatments" style="grid-column:1/-1">
            ${tratamientos
              .map(
                (t) =>
                  `<li><strong>${esc(t.nombre)}</strong>${t.dosis ? `<span>${esc(t.dosis)}</span>` : ''}${
                    t.frecuencia ? `<span>${esc(t.frecuencia)}</span>` : ''
                  }${t.dias ? `<span>${esc(t.dias)} días</span>` : ''}</li>`,
              )
              .join('')}
          </ul>`
        : ''
    }
    <div class="row__foot no-print">
      <button class="btn btn--sm" data-accion="editar-evento" data-id="${esc(e.id)}">Editar</button>
      <button class="btn btn--sm btn--danger" data-accion="eliminar-evento" data-id="${esc(e.id)}">Eliminar</button>
    </div>
  </article>`;
}

/* --------------------------------------------------------- vista ajustes -- */

function bloqueInstalacion() {
  if (instalar.estaInstalada()) {
    return `<div class="note"><strong>Ya está instalada en este dispositivo.</strong> Tus datos quedan fuera de las reglas de borrado que los navegadores aplican a los sitios web.</div>`;
  }

  const info = instalar.instrucciones();
  const pasos = info.pasos.map((p) => `<li>${esc(p)}</li>`).join('');

  return `
    <div class="note">${esc(info.porque)}</div>
    <ol class="pasos">${pasos}</ol>
    ${
      instalar.puedeInstalarDirecto()
        ? `<div class="actionbar"><button class="btn btn--primary" data-accion="instalar">Instalar ahora</button></div>`
        : ''
    }`;
}

export function vistaAjustes() {
  const ov = store.intervalos();
  const porEspecie = ESPECIES.filter((e) => e.id !== 'otro').map((e) => ({
    especie: e,
    lista: PROTOCOLOS.filter((p) => p.especie === e.id),
  }));
  const comunes = PROTOCOLOS.filter((p) => p.especie === 'todas');

  const campo = (p) => `
    <div class="field">
      <label class="fieldlabel" for="int-${esc(p.id)}">${esc(p.corto)}</label>
      <input class="control" id="int-${esc(p.id)}" type="number" min="1" max="3650" step="1"
             inputmode="numeric" value="${esc(ov[p.id] ?? p.intervaloDias)}"
             data-intervalo="${esc(p.id)}">
      <p class="field__hint">${esc(p.nota)}</p>
    </div>`;

  const grupos = [
    ...porEspecie.map(
      (g) => `
      <section class="section">
        <div class="section__head"><h2 class="section__title">${esc(g.especie.label)}</h2></div>
        <div class="grid2">${g.lista.map(campo).join('')}</div>
      </section>`,
    ),
    `<section class="section">
      <div class="section__head"><h2 class="section__title">Preventivos (todas las especies)</h2></div>
      <div class="grid2">${comunes.map(campo).join('')}</div>
    </section>`,
  ].join('');

  return `
  <div class="stack">
    <div>
      <a class="btn btn--sm" href="#/">← Mis mascotas</a>
    </div>
    <div>
      <h1 class="page-title">Ajustes</h1>
      <p class="page-sub">Los intervalos que trae la app son valores de referencia internacionales y son editables. La norma de rabia y los productos disponibles cambian según el país.</p>
    </div>

    <section class="section">
      <div class="section__head"><h2 class="section__title">${esc(instalar.instrucciones().titulo)}</h2></div>
      ${bloqueInstalacion()}
    </section>

    <div class="note">
      <strong>Esta app no sustituye a un veterinario.</strong> Los intervalos por defecto siguen las guías WSAVA, que son generales. Ajústalos a lo que te indique tu veterinario y a la normativa de tu país.
    </div>

    ${grupos}

    <section class="section">
      <div class="section__head"><h2 class="section__title">Dónde se guardan tus datos</h2></div>
      <div class="note" id="estado-almacenamiento">Comprobando el almacenamiento…</div>
      <div class="note">Todo se guarda solo en este navegador y en este dispositivo. Otro teléfono, u otro navegador en el mismo teléfono, tiene su propio carnet vacío. Si borras los datos del sitio o desinstalas, se pierde. Exporta un respaldo de vez en cuando.</div>
      <div class="actionbar">
        <button class="btn" data-accion="exportar">Exportar respaldo</button>
        <button class="btn" data-accion="importar">Importar respaldo</button>
        <button class="btn" data-accion="ics-todo">Descargar calendario</button>
      </div>
    </section>

    <section class="section">
      <div class="section__head"><h2 class="section__title">Restablecer</h2></div>
      <div class="actionbar">
        <button class="btn" data-accion="reset-intervalos">Volver a los intervalos por defecto</button>
        <button class="btn btn--danger" data-accion="borrar-todo">Borrar todos los datos</button>
      </div>
    </section>
  </div>`;
}

/**
 * El estado del almacenamiento es asíncrono, así que la vista deja un hueco y
 * este método lo rellena después de pintar.
 */
export async function pintarAlmacenamiento(caja) {
  const e = await estadoAlmacenamiento();

  if (!e.soportado) {
    caja.innerHTML =
      '<strong>Este navegador no informa el estado del almacenamiento.</strong> Los datos siguen guardados aquí, pero no hay forma de pedirle que los proteja. Exporta un respaldo con más frecuencia.';
    return;
  }

  const peso = `Ocupas ${e.usadoKB} KB en este dispositivo.`;

  if (e.persistido) {
    caja.innerHTML = `<strong>Almacenamiento protegido.</strong> El navegador se comprometió a no borrar estos datos para liberar espacio. ${esc(peso)}`;
    return;
  }

  caja.innerHTML = `
    <strong>Almacenamiento sin proteger.</strong> El navegador puede borrar estos
    datos si necesita espacio. ${esc(peso)}
    ${
      instalar.estaInstalada()
        ? ''
        : ' Instalarla en la pantalla de inicio es lo que más ayuda: en iPhone, Safari borra el almacenamiento de los sitios que no se visitan en 7 días, y esta app se abre pocas veces al año.'
    }
    <div class="actionbar" style="margin-top:var(--s3)">
      <button class="btn btn--sm" data-accion="proteger-datos">Pedir protección al navegador</button>
    </div>`;
}
