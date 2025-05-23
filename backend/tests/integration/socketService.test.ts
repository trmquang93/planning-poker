import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { Server as HttpServer } from 'http';
import { AddressInfo } from 'net';
import { Server as SocketIOServer } from 'socket.io';
import { io as Client, Socket as ClientSocket } from 'socket.io-client';
import { setupSocketHandlers } from '../../src/services/socketService';
import { SessionService } from '../../src/services/sessionService';
import { SocketEvents } from '@shared/types';

// Mock console methods to reduce test noise
jest.spyOn(console, 'info').mockImplementation(() => {});
jest.spyOn(console, 'error').mockImplementation(() => {});

describe('Socket.IO Integration', () => {
  let httpServer: HttpServer;
  let ioServer: SocketIOServer;
  let clientSocket1: ClientSocket;
  let clientSocket2: ClientSocket;
  let sessionService: SessionService;
  let serverAddress: string;
  let testSession: any;

  beforeEach(async () => {
    // Create HTTP server
    httpServer = new HttpServer();
    
    // Create Socket.IO server
    ioServer = new SocketIOServer(httpServer, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      }
    });

    // Setup socket handlers
    setupSocketHandlers(ioServer);

    // Start server
    await new Promise<void>((resolve) => {
      httpServer.listen(() => {
        const port = (httpServer.address() as AddressInfo).port;
        serverAddress = `http://localhost:${port}`;
        resolve();
      });
    });

    // Get session service instance and clear sessions
    sessionService = SessionService.getInstance();
    const allSessions = sessionService.getAllSessions();
    allSessions.forEach(session => {
      sessionService.deleteSession(session.id);
    });

    // Create test session
    const sessionResult = sessionService.createSession('Test Session', 'Facilitator', 'FIBONACCI');
    testSession = sessionResult.session;
    
    // Add a member to the session
    const memberResult = sessionService.addParticipant(testSession.id, 'Member', 'member');
    testSession = sessionService.getSession(testSession.id);
  });

  afterEach(async () => {
    // Disconnect clients
    if (clientSocket1?.connected) {
      clientSocket1.disconnect();
    }
    if (clientSocket2?.connected) {
      clientSocket2.disconnect();
    }

    // Close server
    ioServer.close();
    httpServer.close();

    // Wait a bit for cleanup
    await new Promise(resolve => setTimeout(resolve, 100));
  });

  const connectClient = (socketOptions = {}): Promise<ClientSocket> => {
    return new Promise((resolve, reject) => {
      const client = Client(serverAddress, {
        forceNew: true,
        ...socketOptions
      });

      client.on('connect', () => {
        resolve(client);
      });

      client.on('connect_error', (error) => {
        reject(error);
      });

      // Timeout after 5 seconds
      setTimeout(() => {
        reject(new Error('Connection timeout'));
      }, 5000);
    });
  };

  describe('Connection Management', () => {
    it('should establish connection and receive welcome message', async () => {
      clientSocket1 = await connectClient();
      
      const welcomeMessage = await new Promise((resolve) => {
        clientSocket1.on('welcome', resolve);
      });

      expect(welcomeMessage).toMatchObject({
        message: 'Connected to Planning Poker server',
        socketId: expect.any(String),
        timestamp: expect.any(String)
      });
    });

    it('should handle multiple concurrent connections', async () => {
      const [socket1, socket2] = await Promise.all([
        connectClient(),
        connectClient()
      ]);

      clientSocket1 = socket1;
      clientSocket2 = socket2;

      expect(clientSocket1.connected).toBe(true);
      expect(clientSocket2.connected).toBe(true);
      expect(clientSocket1.id).not.toBe(clientSocket2.id);
    });
  });

  describe('Session Management', () => {
    beforeEach(async () => {
      clientSocket1 = await connectClient();
      clientSocket2 = await connectClient();
    });

    it('should join session successfully', async () => {
      const facilitator = testSession.participants.find((p: any) => p.role === 'facilitator');
      
      const sessionUpdatedPromise = new Promise((resolve) => {
        clientSocket1.on(SocketEvents.SESSION_UPDATED, resolve);
      });

      clientSocket1.emit(SocketEvents.JOIN_SESSION, {
        sessionId: testSession.id,
        participant: facilitator
      });

      const sessionUpdate = await sessionUpdatedPromise;
      expect(sessionUpdate).toMatchObject({
        session: expect.objectContaining({
          id: testSession.id,
          code: testSession.code
        })
      });
    });

    it('should handle invalid session join', async () => {
      const errorPromise = new Promise((resolve) => {
        clientSocket1.on(SocketEvents.ERROR, resolve);
      });

      clientSocket1.emit(SocketEvents.JOIN_SESSION, {
        sessionId: 'invalid-session',
        participant: { id: 'test', name: 'Test', role: 'member' }
      });

      const error = await errorPromise;
      expect(error).toMatchObject({
        message: 'Session not found',
        code: 'SESSION_NOT_FOUND'
      });
    });

    it('should notify other participants when someone joins', async () => {
      const facilitator = testSession.participants.find((p: any) => p.role === 'facilitator');
      const member = testSession.participants.find((p: any) => p.role === 'member');

      // First participant joins
      clientSocket1.emit(SocketEvents.JOIN_SESSION, {
        sessionId: testSession.id,
        participant: facilitator
      });

      // Wait for first join to complete
      await new Promise(resolve => {
        clientSocket1.on(SocketEvents.SESSION_UPDATED, resolve);
      });

      // Set up listener for participant joined event
      const participantJoinedPromise = new Promise((resolve) => {
        clientSocket1.on(SocketEvents.PARTICIPANT_JOINED, resolve);
      });

      // Second participant joins
      clientSocket2.emit(SocketEvents.JOIN_SESSION, {
        sessionId: testSession.id,
        participant: member
      });

      const joinEvent = await participantJoinedPromise;
      expect(joinEvent).toMatchObject({
        participant: expect.objectContaining({
          name: member.name,
          role: member.role
        })
      });
    });
  });

  describe('Story Management', () => {
    let facilitator: any;
    let member: any;

    beforeEach(async () => {
      clientSocket1 = await connectClient();
      clientSocket2 = await connectClient();

      facilitator = testSession.participants.find((p: any) => p.role === 'facilitator');
      member = testSession.participants.find((p: any) => p.role === 'member');

      // Both participants join the session
      clientSocket1.emit(SocketEvents.JOIN_SESSION, {
        sessionId: testSession.id,
        participant: facilitator
      });

      clientSocket2.emit(SocketEvents.JOIN_SESSION, {
        sessionId: testSession.id,
        participant: member
      });

      // Wait for joins to complete
      await Promise.all([
        new Promise(resolve => clientSocket1.on(SocketEvents.SESSION_UPDATED, resolve)),
        new Promise(resolve => clientSocket2.on(SocketEvents.SESSION_UPDATED, resolve))
      ]);
    });

    it('should add story and notify all participants', async () => {
      const storyAddedPromises = [
        new Promise(resolve => clientSocket1.on(SocketEvents.STORY_ADDED, resolve)),
        new Promise(resolve => clientSocket2.on(SocketEvents.STORY_ADDED, resolve))
      ];

      clientSocket1.emit(SocketEvents.ADD_STORY, {
        title: 'Test Story',
        description: 'Test description'
      });

      const [story1, story2] = await Promise.all(storyAddedPromises);
      
      expect(story1).toMatchObject({
        story: expect.objectContaining({
          title: 'Test Story',
          description: 'Test description',
          status: 'pending'
        })
      });
      expect(story2).toEqual(story1);
    });

    it('should prevent members from adding stories', async () => {
      const errorPromise = new Promise((resolve) => {
        clientSocket2.on(SocketEvents.ERROR, resolve);
      });

      clientSocket2.emit(SocketEvents.ADD_STORY, {
        title: 'Unauthorized Story'
      });

      const error = await errorPromise;
      expect(error).toMatchObject({
        message: expect.stringContaining('facilitator'),
        code: 'ADD_STORY_FAILED'
      });
    });
  });

  describe('Voting Workflow', () => {
    let facilitator: any;
    let member: any;
    let storyId: string;

    beforeEach(async () => {
      clientSocket1 = await connectClient();
      clientSocket2 = await connectClient();

      facilitator = testSession.participants.find((p: any) => p.role === 'facilitator');
      member = testSession.participants.find((p: any) => p.role === 'member');

      // Join session
      clientSocket1.emit(SocketEvents.JOIN_SESSION, {
        sessionId: testSession.id,
        participant: facilitator
      });

      clientSocket2.emit(SocketEvents.JOIN_SESSION, {
        sessionId: testSession.id,
        participant: member
      });

      await Promise.all([
        new Promise(resolve => clientSocket1.on(SocketEvents.SESSION_UPDATED, resolve)),
        new Promise(resolve => clientSocket2.on(SocketEvents.SESSION_UPDATED, resolve))
      ]);

      // Add a story
      const storyAddedPromise = new Promise<any>(resolve => {
        clientSocket1.on(SocketEvents.STORY_ADDED, resolve);
      });

      clientSocket1.emit(SocketEvents.ADD_STORY, {
        title: 'Voting Test Story'
      });

      const storyEvent = await storyAddedPromise;
      storyId = storyEvent.story.id;
    });

    it('should start voting and notify participants', async () => {
      const votingStartedPromises = [
        new Promise(resolve => clientSocket1.on(SocketEvents.VOTING_STARTED, resolve)),
        new Promise(resolve => clientSocket2.on(SocketEvents.VOTING_STARTED, resolve))
      ];

      clientSocket1.emit(SocketEvents.START_VOTING, {
        storyId: storyId
      });

      const [voting1, voting2] = await Promise.all(votingStartedPromises);
      
      expect(voting1).toMatchObject({
        storyId: storyId
      });
      expect(voting2).toEqual(voting1);
    });

    it('should handle vote submission with personalized updates', async () => {
      // Start voting
      clientSocket1.emit(SocketEvents.START_VOTING, { storyId });
      
      await Promise.all([
        new Promise(resolve => clientSocket1.on(SocketEvents.VOTING_STARTED, resolve)),
        new Promise(resolve => clientSocket2.on(SocketEvents.VOTING_STARTED, resolve))
      ]);

      // Set up listeners for session updates
      const sessionUpdatePromises = [
        new Promise<any>(resolve => clientSocket1.on(SocketEvents.SESSION_UPDATED, resolve)),
        new Promise<any>(resolve => clientSocket2.on(SocketEvents.SESSION_UPDATED, resolve))
      ];

      // Submit vote from facilitator
      clientSocket1.emit(SocketEvents.SUBMIT_VOTE, {
        storyId: storyId,
        vote: 5
      });

      const [update1, update2] = await Promise.all(sessionUpdatePromises);

      // Facilitator should see their own vote
      const story1 = update1.session.stories.find((s: any) => s.id === storyId);
      expect(story1.votes[facilitator.name]).toBe(5);

      // Member should see *** for facilitator's vote
      const story2 = update2.session.stories.find((s: any) => s.id === storyId);
      expect(story2.votes[facilitator.name]).toBe('***');
    });

    it('should reveal votes correctly', async () => {
      // Start voting and submit votes
      clientSocket1.emit(SocketEvents.START_VOTING, { storyId });
      await Promise.all([
        new Promise(resolve => clientSocket1.on(SocketEvents.VOTING_STARTED, resolve)),
        new Promise(resolve => clientSocket2.on(SocketEvents.VOTING_STARTED, resolve))
      ]);

      // Submit votes
      clientSocket1.emit(SocketEvents.SUBMIT_VOTE, { storyId, vote: 5 });
      clientSocket2.emit(SocketEvents.SUBMIT_VOTE, { storyId, vote: 8 });

      // Wait for vote submissions
      await new Promise(resolve => setTimeout(resolve, 100));

      // Reveal votes
      const votesRevealedPromises = [
        new Promise(resolve => clientSocket1.on(SocketEvents.VOTES_REVEALED, resolve)),
        new Promise(resolve => clientSocket2.on(SocketEvents.VOTES_REVEALED, resolve))
      ];

      clientSocket1.emit(SocketEvents.REVEAL_VOTES, { storyId });

      const [revealed1, revealed2] = await Promise.all(votesRevealedPromises);

      expect(revealed1).toMatchObject({
        storyId: storyId,
        votes: {
          [facilitator.name]: 5,
          [member.name]: 8
        }
      });
      expect(revealed2).toEqual(revealed1);
    });

    it('should finalize estimate and complete story', async () => {
      // Complete voting flow
      clientSocket1.emit(SocketEvents.START_VOTING, { storyId });
      await new Promise(resolve => clientSocket1.on(SocketEvents.VOTING_STARTED, resolve));

      clientSocket1.emit(SocketEvents.SUBMIT_VOTE, { storyId, vote: 5 });
      await new Promise(resolve => setTimeout(resolve, 100));

      clientSocket1.emit(SocketEvents.REVEAL_VOTES, { storyId });
      await new Promise(resolve => clientSocket1.on(SocketEvents.VOTES_REVEALED, resolve));

      // Finalize estimate
      const finalEstimatePromises = [
        new Promise(resolve => clientSocket1.on(SocketEvents.FINAL_ESTIMATE_SET, resolve)),
        new Promise(resolve => clientSocket2.on(SocketEvents.FINAL_ESTIMATE_SET, resolve))
      ];

      clientSocket1.emit(SocketEvents.SET_FINAL_ESTIMATE, {
        storyId: storyId,
        estimate: 5
      });

      const [final1, final2] = await Promise.all(finalEstimatePromises);

      expect(final1).toMatchObject({
        storyId: storyId,
        estimate: 5
      });
      expect(final2).toEqual(final1);
    });
  });

  describe('Error Handling', () => {
    beforeEach(async () => {
      clientSocket1 = await connectClient();
    });

    it('should handle operations without joining session', async () => {
      const errorPromise = new Promise((resolve) => {
        clientSocket1.on(SocketEvents.ERROR, resolve);
      });

      clientSocket1.emit(SocketEvents.ADD_STORY, {
        title: 'Test Story'
      });

      const error = await errorPromise;
      expect(error).toMatchObject({
        message: 'Not connected to any session',
        code: 'NOT_IN_SESSION'
      });
    });

    it('should handle malformed join session data', async () => {
      const errorPromise = new Promise((resolve) => {
        clientSocket1.on(SocketEvents.ERROR, resolve);
      });

      clientSocket1.emit(SocketEvents.JOIN_SESSION, {
        invalidData: true
      });

      const error = await errorPromise;
      expect(error).toMatchObject({
        message: 'Invalid join session data',
        code: 'INVALID_DATA'
      });
    });
  });
});