import { beforeAll, afterAll, afterEach } from '@jest/globals';

// Setup for backend tests
beforeAll(async () => {
  // Any global setup for backend tests
  process.env.NODE_ENV = 'test';
});

afterEach(() => {
  // Clean up after each test
  jest.clearAllMocks();
});

afterAll(async () => {
  // Global cleanup
});