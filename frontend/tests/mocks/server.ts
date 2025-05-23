import { setupServer } from 'msw/node';
import { handlers } from './handlers';

// Setup MSW server with API handlers
export const server = setupServer(...handlers);