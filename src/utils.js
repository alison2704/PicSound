/**
 * Utilidades para testing
 * Este archivo exporta funciones para ser testeadas
 */

/**
 * Valida que el email tenga un dominio permitido
 * @param {string} email - Email a validar
 * @returns {boolean} - true si el email es válido
 */
export function validarEmail(email) {
  const regex = /^[a-zA-Z0-9._%+-]+@(outlook|gmail|hotmail)\.com$/i;
  return regex.test(email);
}

/**
 * Simula el guardado de token JWT en localStorage
 * @param {string} token - Token JWT a guardar
 */
export function saveToken(token) {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('jwtToken', token);
  }
}

/**
 * Recupera el token JWT desde localStorage
 * @returns {string|null} - Token o null si no existe
 */
export function getToken() {
  if (typeof localStorage !== 'undefined') {
    return localStorage.getItem('jwtToken');
  }
  return null;
}

/**
 * Elimina el token JWT de localStorage
 */
export function removeToken() {
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem('jwtToken');
  }
}

/**
 * Verifica si un token tiene estructura JWT válida (3 partes separadas por puntos)
 * @param {string} token - Token a verificar
 * @returns {boolean} - true si tiene estructura válida
 */
export function isValidJWTStructure(token) {
  if (!token || typeof token !== 'string') return false;
  const parts = token.split('.');
  return parts.length === 3;
}
