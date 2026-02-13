/**
 * Utilidad criptográfica simple usando Web Crypto API (nativa del navegador).
 * Genera un hash SHA-256 de la contraseña.
 *
 * @param {string} password - La contraseña en texto plano.
 * @returns {Promise<string>} - El hash en hexadecimal.
 */
export async function hashPassword(password) {
  if (!password) return "";
  
  const msgBuffer = new TextEncoder().encode(password);
  
  // Hashing (SHA-256)
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
  
  // Convertir ArrayBuffer a Array de bytes
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  
  // Convertir bytes a string Hexadecimal
  const hashHex = hashArray
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
    
  return hashHex;
}
