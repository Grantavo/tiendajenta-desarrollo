/**
 * Utilidad criptográfica simple usando Web Crypto API (nativa del navegador).
 * Genera un hash SHA-256 de la contraseña.
 */
export async function hashPassword(password) {
  return sha256(password);
}

/**
 * Genera un hash SHA-256 de cualquier texto.
 * Usado para firmas de integridad (e.g., Bold payment button).
 * @param {string} text
 * @returns {Promise<string>} Hash hexadecimal
 */
export async function sha256(text) {
  if (!text) return "";
  const msgBuffer = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}
