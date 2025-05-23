import { http, HttpResponse } from 'msw';

export const handlers = [
  // Health check endpoint
  http.get('/api/sessions/health', () => {
    return HttpResponse.json({
      message: 'Session API is healthy',
      timestamp: new Date().toISOString(),
    });
  }),

  // Create session endpoint
  http.post('/api/sessions/create', async ({ request }) => {
    const body = await request.json() as any;
    return HttpResponse.json({
      session: {
        id: 'test-session-id',
        code: 'ABC123',
        title: body.title || 'Test Session',
        scale: body.scale || 'FIBONACCI',
        status: 'waiting',
        participants: [
          {
            id: 'test-facilitator-id',
            name: body.facilitatorName || 'Test Facilitator',
            role: 'facilitator',
            isOnline: true,
            joinedAt: new Date(),
          },
        ],
        stories: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours
      },
      participantId: 'test-facilitator-id',
    });
  }),

  // Join session endpoint
  http.post('/api/sessions/join', async ({ request }) => {
    const body = await request.json() as any;
    return HttpResponse.json({
      session: {
        id: 'test-session-id',
        code: body.sessionCode || 'ABC123',
        title: 'Test Session',
        scale: 'FIBONACCI',
        status: 'waiting',
        participants: [
          {
            id: 'test-facilitator-id',
            name: 'Test Facilitator',
            role: 'facilitator',
            isOnline: true,
            joinedAt: new Date(),
          },
          {
            id: 'test-participant-id',
            name: body.participantName || 'Test Participant',
            role: 'member',
            isOnline: true,
            joinedAt: new Date(),
          },
        ],
        stories: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
      },
      participantId: 'test-participant-id',
    });
  }),

  // Fallback for unhandled requests
  http.all('*', ({ request }) => {
    console.warn(`Unhandled ${request.method} request to ${request.url}`);
    return new HttpResponse(null, { status: 404 });
  }),
];