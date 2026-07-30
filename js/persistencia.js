/**
 * Adaptador de almacenamiento.
 *
 * El resto de la app no sabe —ni debe saber— que detrás hay `localStorage`.
 * Solo conoce este contrato de tres operaciones:
 *
 *   leer()          -> string | null
 *   escribir(texto) -> { ok: true } | { ok: false, error: string }
 *   borrar()        -> void
 *
 * Cualquier otro respaldo (IndexedDB, un servidor, un objeto en memoria para
 * pruebas) solo tiene que cumplir esa forma. `store.usarAlmacen()` lo sustituye
 * sin tocar una línea de la lógica de dominio.
 */

export function almacenLocal(clave, backend = globalThis.localStorage) {
  return {
    nombre: 'localStorage',

    leer() {
      try {
        return backend.getItem(clave);
      } catch {
        return null;
      }
    },

    escribir(texto) {
      try {
        backend.setItem(clave, texto);
        return { ok: true };
      } catch (e) {
        const lleno =
          e instanceof DOMException && (e.name === 'QuotaExceededError' || e.code === 22);
        return {
          ok: false,
          error: lleno
            ? 'No hay espacio en el dispositivo. Exporta un respaldo y borra fotos grandes.'
            : 'No se pudo guardar en este dispositivo.',
        };
      }
    },

    borrar() {
      try {
        backend.removeItem(clave);
      } catch {
        /* nada que hacer */
      }
    },
  };
}

/** Almacén en memoria. Útil para pruebas y como respaldo si no hay Web Storage. */
export function almacenMemoria(inicial = null) {
  let valor = inicial;
  return {
    nombre: 'memoria',
    leer: () => valor,
    escribir(texto) {
      valor = texto;
      return { ok: true };
    },
    borrar() {
      valor = null;
    },
  };
}

/* --------------------------------------------------- durabilidad del origen */

/**
 * Por defecto el navegador trata estos datos como "mejor esfuerzo" y puede
 * borrarlos para liberar espacio. Safari en iOS además elimina el
 * almacenamiento de sitios que no se visitan en 7 días — y esta app se abre
 * tres o cuatro veces al año, así que ese caso nos pega de lleno.
 */
export async function estadoAlmacenamiento() {
  const api = navigator.storage;
  if (!api || !api.estimate) {
    return { soportado: false, persistido: false, usadoKB: null };
  }
  const [persistido, estimacion] = await Promise.all([
    api.persisted ? api.persisted() : Promise.resolve(false),
    api.estimate(),
  ]);
  return {
    soportado: true,
    persistido,
    usadoKB: Math.round((estimacion.usage ?? 0) / 1024),
  };
}

/**
 * Pide que el almacenamiento sea duradero. No siempre se concede: Chrome lo
 * otorga si el sitio está instalado o tiene señales de uso; Safari lo exime al
 * agregarlo a la pantalla de inicio. Devuelve lo que realmente pasó.
 */
export async function pedirPersistencia() {
  if (!navigator.storage?.persist) return false;
  try {
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}
