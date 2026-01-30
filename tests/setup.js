// Setup archivo para Jest
// Configuración global antes de ejecutar los tests

// Configurar localStorage mock para el entorno de testing
global.localStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

// Configurar fetch mock global
global.fetch = jest.fn();

// Configurar console mock para evitar spam en tests
global.console = {
  ...console,
  error: jest.fn(),
  warn: jest.fn(),
};
