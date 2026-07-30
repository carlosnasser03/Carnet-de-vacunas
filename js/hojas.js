/**
 * Hojas de captura (los `<dialog>` modales).
 *
 * Cada hoja arma su formulario, se encarga de su propia lógica reactiva y
 * escribe en el store. `abrirHoja` es la única que toca el DOM del diálogo.
 */

import * as store from './store.js';
import { hoy } from './fecha.js';
import { ESPECIES, protocolosDe, protocoloPorId } from './protocolos.js';
import { esc, toast, reportar, SVG_PATA } from './ui.js';
import { redimensionar } from './imagen.js';
import { pedirPersistencia } from './persistencia.js';

export function abrirHoja({ titulo, cuerpo, textoGuardar = 'Guardar', alEnviar, alAbrir }) {
  const dlg = document.createElement('dialog');
  dlg.className = 'sheet';
  dlg.innerHTML = `
    <form>
      <div class="sheet__head">
        <h2 class="sheet__title">${esc(titulo)}</h2>
        <button type="button" class="btn btn--ghost btn--icon" data-cerrar aria-label="Cerrar">
          <svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
        </button>
      </div>
      <div class="sheet__body">${cuerpo}</div>
      <div class="sheet__foot">
        <button type="button" class="btn" data-cerrar>Cancelar</button>
        <button type="submit" class="btn btn--primary">${esc(textoGuardar)}</button>
      </div>
    </form>`;

  document.body.appendChild(dlg);
  const form = dlg.querySelector('form');

  // El evento `close` de <dialog> no es fiable en todos los motores, así que la
  // limpieza se hace siempre por esta función y nunca como reacción a un evento.
  const cerrar = () => {
    try {
      dlg.close();
    } catch {
      /* ya estaba cerrado */
    }
    dlg.remove();
  };

  dlg.querySelectorAll('[data-cerrar]').forEach((b) => b.addEventListener('click', cerrar));
  dlg.addEventListener('cancel', (ev) => {
    ev.preventDefault();
    cerrar();
  });
  dlg.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape') {
      ev.preventDefault();
      cerrar();
    }
  });
  dlg.addEventListener('click', (ev) => {
    if (ev.target === dlg) cerrar();
  });

  form.addEventListener('submit', (ev) => {
    ev.preventDefault();
    if (!form.reportValidity()) return;
    const datos = Object.fromEntries(new FormData(form).entries());
    if (alEnviar(datos, form) !== false) cerrar();
  });

  dlg.showModal();
  if (alAbrir) alAbrir(form, dlg);
  const primero = form.querySelector('.sheet__body input, .sheet__body select, .sheet__body textarea');
  if (primero) primero.focus();
  return dlg;
}

/* -------------------------------------------------------------- mascota -- */

export function hojaMascota(id) {
  const m = id ? store.mascota(id) : null;
  const v = (k) => esc(m?.[k] ?? '');

  const cuerpo = `
    <div class="form">
      <div class="field">
        <label class="fieldlabel" for="f-nombre">Nombre *</label>
        <input class="control" id="f-nombre" name="nombre" required maxlength="40" value="${v('nombre')}" autocomplete="off">
      </div>

      <div class="field">
        <label class="fieldlabel" for="f-foto">Foto</label>
        <div class="photo-picker">
          <span class="photo-picker__preview" id="f-preview">${m?.foto ? `<img src="${esc(m.foto)}" alt="">` : SVG_PATA}</span>
          <div>
            <input type="file" id="f-foto" accept="image/*" class="control" style="min-height:auto;padding:var(--s2)">
            <p class="field__hint">Se guarda reducida en el dispositivo.</p>
          </div>
        </div>
        <input type="hidden" name="foto" value="${v('foto')}">
      </div>

      <div class="grid2">
        <div class="field">
          <label class="fieldlabel" for="f-especie">Especie *</label>
          <select class="control" id="f-especie" name="especie" required>
            ${ESPECIES.map(
              (e) => `<option value="${e.id}" ${m?.especie === e.id ? 'selected' : ''}>${e.label}</option>`,
            ).join('')}
          </select>
        </div>
        <div class="field">
          <label class="fieldlabel" for="f-raza">Raza</label>
          <input class="control" id="f-raza" name="raza" maxlength="40" value="${v('raza')}" autocomplete="off">
        </div>
      </div>

      <div class="grid2">
        <div class="field">
          <label class="fieldlabel" for="f-sexo">Sexo</label>
          <select class="control" id="f-sexo" name="sexo">
            <option value="">Sin registrar</option>
            <option value="Hembra" ${m?.sexo === 'Hembra' ? 'selected' : ''}>Hembra</option>
            <option value="Macho" ${m?.sexo === 'Macho' ? 'selected' : ''}>Macho</option>
          </select>
        </div>
        <div class="field">
          <label class="fieldlabel" for="f-nacimiento">Nacimiento</label>
          <input class="control" id="f-nacimiento" name="nacimiento" type="date" max="${hoy()}" value="${v('nacimiento')}">
          <p class="field__hint">Con esto la app distingue la serie de cachorro del refuerzo anual.</p>
        </div>
      </div>

      <div class="grid2">
        <div class="field">
          <label class="fieldlabel" for="f-peso">Peso (kg)</label>
          <input class="control" id="f-peso" name="peso" type="number" step="0.1" min="0" max="200" inputmode="decimal" value="${v('peso')}">
        </div>
        <div class="field">
          <label class="fieldlabel" for="f-microchip">Microchip</label>
          <input class="control" id="f-microchip" name="microchip" maxlength="20" value="${v('microchip')}" autocomplete="off">
        </div>
      </div>

      <div class="field">
        <label class="fieldlabel" for="f-senas">Señas particulares</label>
        <input class="control" id="f-senas" name="senas" maxlength="60" value="${v('senas')}" autocomplete="off">
      </div>

      <div class="field">
        <label class="fieldlabel" for="f-clinica">Veterinaria de cabecera</label>
        <input class="control" id="f-clinica" name="clinica" maxlength="60" value="${v('clinica')}" autocomplete="off">
      </div>

      <label class="switch">
        <input type="checkbox" name="esterilizado" ${m?.esterilizado ? 'checked' : ''}>
        <span>Esterilizado</span>
      </label>

      <div class="field">
        <label class="fieldlabel" for="f-notas">Notas</label>
        <textarea class="control" id="f-notas" name="notas" maxlength="400" placeholder="Alergias, condiciones crónicas, temperamento en consulta…">${v('notas')}</textarea>
      </div>
    </div>`;

  abrirHoja({
    titulo: m ? 'Editar datos' : 'Nueva mascota',
    cuerpo,
    textoGuardar: m ? 'Guardar cambios' : 'Crear carnet',
    alAbrir(form) {
      const entrada = form.querySelector('#f-foto');
      const vista = form.querySelector('#f-preview');
      const oculto = form.querySelector('input[name="foto"]');
      entrada.addEventListener('change', async () => {
        const archivo = entrada.files?.[0];
        if (!archivo) return;
        try {
          const dataUrl = await redimensionar(archivo);
          oculto.value = dataUrl;
          vista.innerHTML = `<img src="${esc(dataUrl)}" alt="">`;
        } catch (e) {
          toast(e.message || 'No se pudo procesar la imagen.');
        }
      });
    },
    alEnviar(datos) {
      const res = store.guardarMascota({
        ...(m || {}),
        id: m?.id,
        nombre: datos.nombre.trim(),
        especie: datos.especie,
        raza: datos.raza.trim(),
        sexo: datos.sexo,
        nacimiento: datos.nacimiento,
        peso: datos.peso,
        microchip: datos.microchip.trim(),
        senas: datos.senas.trim(),
        clinica: datos.clinica.trim(),
        esterilizado: datos.esterilizado === 'on',
        notas: datos.notas.trim(),
        foto: datos.foto,
      });
      reportar(res, m ? 'Datos actualizados.' : 'Carnet creado.');
      if (!m && res.ok !== false) {
        // Crear el primer carnet es la señal de uso real que los navegadores
        // esperan para conceder almacenamiento duradero. Se pide en silencio.
        pedirPersistencia();
        location.hash = `#/m/${res.id}`;
      }
    },
  });
}

/* ---------------------------------------------------------------- dosis -- */

export function hojaDosis({ mascotaId, dosisId, protocoloId, nombre }) {
  const d = dosisId ? store.dosis(dosisId) : null;
  const mid = d?.mascotaId || mascotaId;
  const m = store.mascota(mid);
  if (!m) return;

  const opciones = protocolosDe(m.especie, store.intervalos());
  const seleccion = d?.protocoloId || protocoloId || opciones[0]?.id || 'otro';

  const cuerpo = `
    <div class="form">
      <div class="field">
        <label class="fieldlabel" for="d-protocolo">Aplicación *</label>
        <select class="control" id="d-protocolo" name="protocoloId" required>
          ${opciones
            .map((p) => `<option value="${p.id}" ${seleccion === p.id ? 'selected' : ''}>${esc(p.nombre)}</option>`)
            .join('')}
          <option value="otro" ${seleccion === 'otro' ? 'selected' : ''}>Otra (escribir el nombre)</option>
        </select>
      </div>

      <div class="field" id="d-otro-campo" ${seleccion === 'otro' ? '' : 'hidden'}>
        <label class="fieldlabel" for="d-otro">Nombre de la aplicación</label>
        <input class="control" id="d-otro" name="otroNombre" maxlength="60" value="${esc(d?.protocoloId === 'otro' ? d.nombre : nombre || '')}" autocomplete="off">
      </div>

      <div class="grid2">
        <div class="field">
          <label class="fieldlabel" for="d-fecha">Fecha de aplicación *</label>
          <input class="control" id="d-fecha" name="fecha" type="date" required max="${hoy()}" value="${esc(d?.fecha || hoy())}">
        </div>
        <div class="field">
          <label class="fieldlabel" for="d-proxima">Próxima aplicación</label>
          <input class="control" id="d-proxima" name="proxima" type="date" value="${esc(d?.proxima || '')}">
          <p class="field__hint" id="d-motivo"></p>
        </div>
      </div>

      <div class="grid2">
        <div class="field">
          <label class="fieldlabel" for="d-lote">Lote</label>
          <input class="control" id="d-lote" name="lote" maxlength="30" value="${esc(d?.lote || '')}" autocomplete="off">
        </div>
        <div class="field">
          <label class="fieldlabel" for="d-por">Aplicada por</label>
          <input class="control" id="d-por" name="aplicadoPor" maxlength="60" value="${esc(d?.aplicadoPor || '')}" autocomplete="off">
        </div>
      </div>

      <div class="field">
        <label class="fieldlabel" for="d-notas">Notas</label>
        <textarea class="control" id="d-notas" name="notas" maxlength="300" placeholder="Reacción, marca del producto, observaciones…">${esc(d?.notas || '')}</textarea>
      </div>

      <p class="note" id="d-nota-protocolo"></p>
    </div>`;

  abrirHoja({
    titulo: d ? 'Editar dosis' : 'Registrar aplicación',
    cuerpo,
    textoGuardar: d ? 'Guardar cambios' : 'Registrar',
    alAbrir(form) {
      const sel = form.querySelector('#d-protocolo');
      const otro = form.querySelector('#d-otro-campo');
      const fecha = form.querySelector('#d-fecha');
      const proxima = form.querySelector('#d-proxima');
      const motivo = form.querySelector('#d-motivo');
      const notaProto = form.querySelector('#d-nota-protocolo');
      let tocada = Boolean(d?.proxima);

      proxima.addEventListener('input', () => {
        tocada = true;
        motivo.textContent = 'Fecha fijada a mano.';
      });

      const refrescar = () => {
        const esOtro = sel.value === 'otro';
        otro.hidden = !esOtro;
        form.querySelector('#d-otro').required = esOtro;

        const p = protocoloPorId(sel.value, store.intervalos());
        notaProto.textContent = p?.nota || 'Intervalo libre: fija tú la próxima fecha.';
        notaProto.hidden = false;

        if (tocada) return;
        if (esOtro) {
          proxima.value = '';
          motivo.textContent = 'Sin intervalo por defecto: fija la fecha si quieres recordatorio.';
          return;
        }
        const s = store.sugerirProxima(mid, sel.value, fecha.value);
        proxima.value = s.fecha || '';
        motivo.textContent = s.motivo;
      };

      sel.addEventListener('change', refrescar);
      fecha.addEventListener('change', refrescar);
      refrescar();
    },
    alEnviar(datos) {
      const esOtro = datos.protocoloId === 'otro';
      const p = protocoloPorId(datos.protocoloId, store.intervalos());
      const res = store.guardarDosis({
        ...(d || {}),
        id: d?.id,
        mascotaId: mid,
        protocoloId: datos.protocoloId,
        nombre: esOtro ? datos.otroNombre.trim() : p?.nombre || datos.protocoloId,
        fecha: datos.fecha,
        proxima: datos.proxima || '',
        lote: datos.lote.trim(),
        aplicadoPor: datos.aplicadoPor.trim(),
        notas: datos.notas.trim(),
      });
      reportar(res, d ? 'Dosis actualizada.' : 'Dosis registrada.');
    },
  });
}

/* -------------------------------------------------------------- episodio -- */

function filaTratamiento(t = {}) {
  return `
  <div class="grid2" data-trat style="gap:var(--s2)">
    <input class="control" name="t-nombre" placeholder="Medicamento" maxlength="60" value="${esc(t.nombre || '')}" autocomplete="off">
    <input class="control" name="t-dosis" placeholder="Dosis (ej. 1/2 tableta)" maxlength="40" value="${esc(t.dosis || '')}" autocomplete="off">
    <input class="control" name="t-frecuencia" placeholder="Frecuencia (ej. cada 12 h)" maxlength="40" value="${esc(t.frecuencia || '')}" autocomplete="off">
    <div style="display:flex;gap:var(--s2)">
      <input class="control" name="t-dias" type="number" min="0" max="365" inputmode="numeric" placeholder="Días" value="${esc(t.dias || '')}">
      <button type="button" class="btn btn--icon btn--danger" data-quitar-trat aria-label="Quitar medicamento">
        <svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
      </button>
    </div>
  </div>`;
}

export function hojaEvento({ mascotaId, eventoId }) {
  const e = eventoId ? store.evento(eventoId) : null;
  const mid = e?.mascotaId || mascotaId;
  const tratamientos = e?.tratamientos?.length ? e.tratamientos : [{}];

  const cuerpo = `
    <div class="form">
      <div class="field">
        <label class="fieldlabel" for="e-titulo">Motivo *</label>
        <input class="control" id="e-titulo" name="titulo" required maxlength="70" placeholder="Vómito y decaimiento" value="${esc(e?.titulo || '')}" autocomplete="off">
      </div>

      <div class="grid2">
        <div class="field">
          <label class="fieldlabel" for="e-fecha">Inicio *</label>
          <input class="control" id="e-fecha" name="fecha" type="date" required max="${hoy()}" value="${esc(e?.fecha || hoy())}">
        </div>
        <div class="field">
          <label class="fieldlabel" for="e-fin">Resuelto el</label>
          <input class="control" id="e-fin" name="fechaFin" type="date" max="${hoy()}" value="${esc(e?.fechaFin || '')}">
          <p class="field__hint">Déjalo vacío si sigue en curso.</p>
        </div>
      </div>

      <div class="field">
        <label class="fieldlabel" for="e-sintomas">Signos observados</label>
        <textarea class="control" id="e-sintomas" name="sintomas" maxlength="300" placeholder="Qué notaste: apetito, energía, heces, tos…">${esc(e?.sintomas || '')}</textarea>
      </div>

      <div class="field">
        <label class="fieldlabel" for="e-dx">Diagnóstico</label>
        <input class="control" id="e-dx" name="diagnostico" maxlength="80" value="${esc(e?.diagnostico || '')}" autocomplete="off">
      </div>

      <div class="field">
        <span class="fieldlabel">Qué se le dio</span>
        <div id="e-trats" style="display:grid;gap:var(--s3)">
          ${tratamientos.map(filaTratamiento).join('')}
        </div>
        <button type="button" class="btn btn--sm" data-agregar-trat style="justify-self:start">Agregar otro medicamento</button>
      </div>

      <div class="field">
        <label class="fieldlabel" for="e-notas">Notas</label>
        <textarea class="control" id="e-notas" name="notas" maxlength="400">${esc(e?.notas || '')}</textarea>
      </div>
    </div>`;

  abrirHoja({
    titulo: e ? 'Editar episodio' : 'Registrar episodio',
    cuerpo,
    textoGuardar: e ? 'Guardar cambios' : 'Registrar',
    alAbrir(form) {
      const cont = form.querySelector('#e-trats');
      form.querySelector('[data-agregar-trat]').addEventListener('click', () => {
        cont.insertAdjacentHTML('beforeend', filaTratamiento());
        cont.lastElementChild.querySelector('input').focus();
      });
      cont.addEventListener('click', (ev) => {
        const b = ev.target.closest('[data-quitar-trat]');
        if (!b) return;
        const filas = cont.querySelectorAll('[data-trat]');
        if (filas.length === 1) {
          filas[0].querySelectorAll('input').forEach((i) => (i.value = ''));
          return;
        }
        b.closest('[data-trat]').remove();
      });
    },
    alEnviar(datos, form) {
      if (datos.fechaFin && datos.fechaFin < datos.fecha) {
        toast('La fecha de resolución no puede ser anterior al inicio.');
        return false;
      }
      const tratamientos = [...form.querySelectorAll('[data-trat]')]
        .map((fila) => ({
          nombre: fila.querySelector('[name="t-nombre"]').value.trim(),
          dosis: fila.querySelector('[name="t-dosis"]').value.trim(),
          frecuencia: fila.querySelector('[name="t-frecuencia"]').value.trim(),
          dias: fila.querySelector('[name="t-dias"]').value.trim(),
        }))
        .filter((t) => t.nombre);

      const res = store.guardarEvento({
        ...(e || {}),
        id: e?.id,
        mascotaId: mid,
        titulo: datos.titulo.trim(),
        fecha: datos.fecha,
        fechaFin: datos.fechaFin,
        sintomas: datos.sintomas.trim(),
        diagnostico: datos.diagnostico.trim(),
        notas: datos.notas.trim(),
        tratamientos,
      });
      reportar(res, e ? 'Episodio actualizado.' : 'Episodio registrado.');
    },
  });
}

/* ----------------------------------------------------------- confirmación -- */

export function hojaConfirmar({ titulo, texto, textoGuardar = 'Eliminar', alConfirmar }) {
  abrirHoja({
    titulo,
    cuerpo: `<p class="page-sub">${esc(texto)}</p>`,
    textoGuardar,
    alEnviar() {
      alConfirmar();
    },
  });
}
