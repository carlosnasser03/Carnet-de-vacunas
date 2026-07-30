/**
 * Procesamiento de imágenes.
 *
 * Vivía dentro de `store.js`, donde no tenía nada que hacer: manipular un canvas
 * no es responsabilidad del estado de la aplicación.
 */

const LADO_MAXIMO = 520;

/**
 * Reduce una foto antes de guardarla. El almacenamiento local es pequeño (unos
 * 5 MB en total), así que una foto de cámara sin reducir se lo comería sola.
 *
 * @param {File} archivo
 * @param {number} maxLado lado mayor resultante, en píxeles
 * @returns {Promise<string>} data URL en JPEG
 */
export function redimensionar(archivo, maxLado = LADO_MAXIMO) {
  return new Promise((resolve, reject) => {
    if (!archivo || !archivo.type.startsWith('image/')) {
      reject(new Error('Selecciona una imagen.'));
      return;
    }

    const url = URL.createObjectURL(archivo);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(url);
      const escala = Math.min(1, maxLado / Math.max(img.width, img.height));
      const w = Math.max(1, Math.round(img.width * escala));
      const h = Math.max(1, Math.round(img.height * escala));

      const lienzo = document.createElement('canvas');
      lienzo.width = w;
      lienzo.height = h;
      lienzo.getContext('2d').drawImage(img, 0, 0, w, h);
      resolve(lienzo.toDataURL('image/jpeg', 0.75));
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('No se pudo leer la imagen.'));
    };

    img.src = url;
  });
}
