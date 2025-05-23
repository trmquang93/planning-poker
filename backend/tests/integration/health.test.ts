import { describe, it, expect } from '@jest/globals';
import { createTestApp, apiRequest } from '../utils/test-helpers';

describe('Health Endpoints', () => {
  const app = createTestApp();

  describe('GET /api/sessions/health', () => {
    it('should return health status', async () => {
      const response = await apiRequest(app)
        .get('/api/sessions/health')
        .expect(200);

      expect(response.body).toMatchObject({
        message: 'Session API is healthy',
        timestamp: expect.any(String),
      });
    });

    it('should return valid timestamp format', async () => {
      const response = await apiRequest(app)
        .get('/api/sessions/health')
        .expect(200);

      const timestamp = new Date(response.body.timestamp);
      expect(timestamp.toISOString()).toBe(response.body.timestamp);
    });
  });

  describe('POST /api/sessions/create', () => {
    it('should return create session placeholder response', async () => {
      const requestBody = {
        title: 'Test Session',
        facilitatorName: 'John Doe',
        scale: 'FIBONACCI',
      };

      const response = await apiRequest(app)
        .post('/api/sessions/create')
        .send(requestBody)
        .expect(200);

      expect(response.body).toMatchObject({
        message: 'Session creation endpoint - to be implemented',
        body: requestBody,
      });
    });
  });

  describe('POST /api/sessions/join', () => {
    it('should return join session placeholder response', async () => {
      const requestBody = {
        sessionCode: 'ABC123',
        participantName: 'Jane Doe',
      };

      const response = await apiRequest(app)
        .post('/api/sessions/join')
        .send(requestBody)
        .expect(200);

      expect(response.body).toMatchObject({
        message: 'Session join endpoint - to be implemented',
        body: requestBody,
      });
    });
  });

  describe('Error handling', () => {
    it('should return 404 for unknown routes', async () => {
      await apiRequest(app)
        .get('/api/sessions/unknown')
        .expect(404);
    });
  });
});