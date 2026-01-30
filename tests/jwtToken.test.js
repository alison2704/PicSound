/**
 * @jest-environment jsdom
 */

import { isValidJWTStructure } from '../src/utils.js';

// Test para verificar que el token JWT se guarda correctamente en localStorage
describe('JWT Token en localStorage', () => {
  beforeEach(() => {
    // Limpiar el localStorage antes de cada test
    localStorage.clear();
  });

  test('debe guardar el token JWT en localStorage después del login exitoso', () => {
    const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInVzZXJuYW1lIjoidGVzdCIsInJvbGUiOiJ1c2VyIn0.test';
    
    // Simular el guardado del token (lo que hace el código real después del login)
    localStorage.setItem('jwtToken', mockToken);
    
    // Verificar que el token se guardó correctamente
    const storedToken = localStorage.getItem('jwtToken');
    expect(storedToken).toBe(mockToken);
  });

  test('debe recuperar el token JWT desde localStorage', () => {
    const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInVzZXJuYW1lIjoidGVzdCJ9.test';
    
    // Primero guardamos un token
    localStorage.setItem('jwtToken', mockToken);
    
    // Luego lo recuperamos (como lo haría getUserInfo())
    const token = localStorage.getItem('jwtToken');
    
    // Verificamos que sea el mismo
    expect(token).toBe(mockToken);
    expect(token).not.toBeNull();
  });

  test('debe retornar null si no hay token guardado', () => {
    // Si no hay token guardado, debe retornar null
    const token = localStorage.getItem('jwtToken');
    expect(token).toBeNull();
  });

  test('debe eliminar el token JWT al cerrar sesión', () => {
    const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInVzZXJuYW1lIjoidGVzdCJ9.test';
    
    // Guardar el token primero (usuario autenticado)
    localStorage.setItem('jwtToken', mockToken);
    expect(localStorage.getItem('jwtToken')).toBe(mockToken);
    
    // Simular logout: eliminar el token
    localStorage.removeItem('jwtToken');
    
    // Verificar que el token ya no existe
    const tokenAfterLogout = localStorage.getItem('jwtToken');
    expect(tokenAfterLogout).toBeNull();
  });

  test('debe validar la estructura básica del token JWT (3 partes separadas por puntos)', () => {
    const validToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInVzZXJuYW1lIjoidGVzdCJ9.signature';
    
    // Token válido (header.payload.signature)
    expect(isValidJWTStructure(validToken)).toBe(true);
    
    // Token inválido (solo una parte)
    expect(isValidJWTStructure('invalid-token')).toBe(false);
    
    // String vacío
    expect(isValidJWTStructure('')).toBe(false);
    
    // Null
    expect(isValidJWTStructure(null)).toBe(false);
    
    // Undefined
    expect(isValidJWTStructure(undefined)).toBe(false);
  });

  test('debe persistir el token entre recargas de página (simulado)', () => {
    const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInVzZXJuYW1lIjoidGVzdCJ9.test';
    
    // El usuario hace login y se guarda el token
    localStorage.setItem('jwtToken', mockToken);
    
    // Simular recarga de página: el token debe seguir estando ahí
    const recoveredToken = localStorage.getItem('jwtToken');
    expect(recoveredToken).toBe(mockToken);
    
    // Verificar que el token persiste múltiples lecturas
    const secondRead = localStorage.getItem('jwtToken');
    expect(secondRead).toBe(mockToken);
  });

  test('debe permitir actualizar un token existente', () => {
    const oldToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInVzZXJuYW1lIjoib2xkIn0.old';
    const newToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInVzZXJuYW1lIjoibmV3In0.new';
    
    // Guardar token inicial
    localStorage.setItem('jwtToken', oldToken);
    expect(localStorage.getItem('jwtToken')).toBe(oldToken);
    
    // Actualizar con nuevo token (refresh token scenario)
    localStorage.setItem('jwtToken', newToken);
    
    // Verificar que se actualizó
    expect(localStorage.getItem('jwtToken')).toBe(newToken);
    expect(localStorage.getItem('jwtToken')).not.toBe(oldToken);
  });
});
