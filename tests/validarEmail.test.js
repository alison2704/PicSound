/**
 * @jest-environment jsdom
 */

import { validarEmail } from '../src/utils.js';

// Test para la función validarEmail
describe('validarEmail', () => {

  test('debe aceptar emails con dominio @gmail.com', () => {
    expect(validarEmail('usuario@gmail.com')).toBe(true);
    expect(validarEmail('test.user@gmail.com')).toBe(true);
    expect(validarEmail('user123@gmail.com')).toBe(true);
  });

  test('debe aceptar emails con dominio @hotmail.com', () => {
    expect(validarEmail('usuario@hotmail.com')).toBe(true);
    expect(validarEmail('test.user@hotmail.com')).toBe(true);
  });

  test('debe aceptar emails con dominio @outlook.com', () => {
    expect(validarEmail('usuario@outlook.com')).toBe(true);
    expect(validarEmail('test.user@outlook.com')).toBe(true);
  });

  test('debe rechazar emails con otros dominios', () => {
    expect(validarEmail('usuario@yahoo.com')).toBe(false);
    expect(validarEmail('usuario@protonmail.com')).toBe(false);
    expect(validarEmail('usuario@example.com')).toBe(false);
  });

  test('debe rechazar emails sin dominio válido', () => {
    expect(validarEmail('usuario@gmail')).toBe(false);
    expect(validarEmail('usuario.com')).toBe(false);
    expect(validarEmail('usuario')).toBe(false);
  });

  test('debe rechazar emails vacíos o inválidos', () => {
    expect(validarEmail('')).toBe(false);
    expect(validarEmail('   ')).toBe(false);
    expect(validarEmail('@gmail.com')).toBe(false);
  });

  test('debe ser case-insensitive para el dominio', () => {
    expect(validarEmail('usuario@GMAIL.COM')).toBe(true);
    expect(validarEmail('usuario@Gmail.Com')).toBe(true);
    expect(validarEmail('usuario@HOTMAIL.COM')).toBe(true);
  });
});
