/**
 * Utilidades para el procesamiento de imágenes en el cliente.
 */

/**
 * Comprime y redimensiona una imagen, convirtiéndola a formato WebP.
 * @param {File} file - El archivo de imagen original.
 * @param {Object} options - Opciones de configuración.
 * @param {number} options.maxWidth - Ancho máximo de la imagen (default 1200px).
 * @param {number} options.maxHeight - Alto máximo de la imagen (default 1200px).
 * @param {number} options.quality - Calidad de la compresión de 0 a 1 (default 0.8).
 * @returns {Promise<Blob>} - Una promesa que resuelve con el Blob de la imagen optimizada.
 */
export const compressImage = (file, { maxWidth = 1200, maxHeight = 1200, quality = 0.8 } = {}) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        // Calcular nuevas dimensiones manteniendo la proporción
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        // Convertir a WebP con la calidad deseada
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error("Error al procesar la imagen en el canvas"));
            }
          },
          "image/webp",
          quality
        );
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};
