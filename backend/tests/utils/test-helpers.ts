import request from 'supertest';
import express from 'express';
import { Server as SocketIOServer } from 'socket.io';
import { createServer } from 'http';
import { setupSocketHandlers } from '../../src/services/socketService';
import { sessionRouter } from '../../src/controllers/sessionController';
import { errorHandler } from '../../src/middleware/errorHandler';
import type { Session, Participant, Story } from '@shared/types';

export const createTestApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/sessions', sessionRouter);
  app.use(errorHandler);
  return app;
};

export const createTestServerWithSocket = () => {
  const app = createTestApp();
  const server = createServer(app);
  const io = new SocketIOServer(server, {
    cors: { origin: '*' },
  });
  
  setupSocketHandlers(io);
  
  return { app, server, io };
};

// Test data factories
export const createTestSession = (overrides: Partial<Session> = {}): Session => ({
  id: 'test-session-id',
  code: 'ABC123',
  title: 'Test Session',
  scale: 'FIBONACCI',
  status: 'waiting',
  participants: [],
  stories: [],
  createdAt: new Date(),
  updatedAt: new Date(),
  expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
  ...overrides,
});

export const createTestParticipant = (overrides: Partial<Participant> = {}): Participant => ({
  id: 'test-participant-id',
  name: 'Test Participant',
  role: 'member',
  isOnline: true,
  joinedAt: new Date(),
  ...overrides,
});

export const createTestStory = (overrides: Partial<Story> = {}): Story => ({
  id: 'test-story-id',
  title: 'Test Story',
  description: 'Test story description',
  status: 'pending',
  votes: {},
  createdAt: new Date(),
  ...overrides,
});

// Helper to make API requests
export const apiRequest = (app: express.Application) => request(app);

// Socket.IO client helper
export const createSocketClient = (port: number) => {
  const { io: Client } = require('socket.io-client');
  return Client(`http://localhost:${port}`);
};