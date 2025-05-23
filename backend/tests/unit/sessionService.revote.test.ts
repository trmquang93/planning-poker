import { SessionService } from '../../src/services/sessionService';
import type { CreateSessionRequest } from '@shared/types';

describe('SessionService - Revote functionality', () => {
  let sessionService: SessionService;
  let sessionId: string;
  let facilitatorId: string;
  let storyId: string;

  beforeEach(() => {
    sessionService = SessionService.getInstance();
    sessionService.clearAllSessions();

    // Create a session with facilitator
    const createRequest: CreateSessionRequest = {
      title: 'Test Session',
      facilitatorName: 'Test Facilitator',
      scale: 'FIBONACCI',
    };

    const result = sessionService.createSession(createRequest);
    sessionId = result.session.id;
    facilitatorId = result.participantId;

    // Add a story
    const updatedSession = sessionService.addStory(sessionId, facilitatorId, 'Test Story', 'Test Description');
    storyId = updatedSession!.stories[0].id;

    // Start voting and complete the story
    sessionService.startVoting(sessionId, facilitatorId, storyId);
    sessionService.submitVote(sessionId, facilitatorId, storyId, 5);
    sessionService.revealVotes(sessionId, facilitatorId, storyId);
    sessionService.finalizeEstimate(sessionId, facilitatorId, storyId, 5);
  });

  afterEach(() => {
    sessionService.clearAllSessions();
  });

  afterAll(() => {
    // Stop the cleanup timer to prevent Jest from hanging
    sessionService.stopCleanupTimer();
  });

  describe('revoteStory', () => {
    it('should successfully start revoting on a completed story', () => {
      const result = sessionService.revoteStory(sessionId, facilitatorId, storyId);

      expect(result).not.toBeNull();
      expect(result!.status).toBe('voting');
      expect(result!.currentStoryId).toBe(storyId);

      const story = result!.stories.find(s => s.id === storyId);
      expect(story!.status).toBe('voting');
      expect(story!.votes).toEqual({});
      expect(story!.finalEstimate).toBeUndefined();
      expect(story!.completedAt).toBeUndefined();
    });

    it('should fail if session does not exist', () => {
      const result = sessionService.revoteStory('non-existent-session', facilitatorId, storyId);
      expect(result).toBeNull();
    });

    it('should fail if participant is not a facilitator', () => {
      // Add a regular member
      const joinRequest = {
        sessionCode: sessionService.getSession(sessionId)!.code,
        participantName: 'Test Member',
      };
      const joinResult = sessionService.joinSession(joinRequest);
      const memberId = joinResult.participantId;

      expect(() => {
        sessionService.revoteStory(sessionId, memberId, storyId);
      }).toThrow('Only facilitators can start revoting');
    });

    it('should fail if story does not exist', () => {
      expect(() => {
        sessionService.revoteStory(sessionId, facilitatorId, 'non-existent-story');
      }).toThrow('Story not found');
    });

    it('should fail if story is not completed', () => {
      // Add a new pending story
      const newSession = sessionService.addStory(sessionId, facilitatorId, 'Pending Story');
      const pendingStoryId = newSession!.stories[1].id;

      expect(() => {
        sessionService.revoteStory(sessionId, facilitatorId, pendingStoryId);
      }).toThrow('Can only revote on completed stories');
    });

    it('should fail if another story is currently being voted on', () => {
      // Add another story and start voting
      const newSession = sessionService.addStory(sessionId, facilitatorId, 'New Story');
      const newStoryId = newSession!.stories[1].id;
      sessionService.startVoting(sessionId, facilitatorId, newStoryId);

      expect(() => {
        sessionService.revoteStory(sessionId, facilitatorId, storyId);
      }).toThrow('Another story is currently being voted on');
    });

    it('should reset all vote data when revoting', () => {
      // Add another participant and their vote
      const joinRequest = {
        sessionCode: sessionService.getSession(sessionId)!.code,
        participantName: 'Test Member',
      };
      const joinResult = sessionService.joinSession(joinRequest);
      const memberId = joinResult.participantId;

      // Complete the story with multiple votes
      sessionService.startVoting(sessionId, facilitatorId, storyId);
      sessionService.submitVote(sessionId, facilitatorId, storyId, 5);
      sessionService.submitVote(sessionId, memberId, storyId, 8);
      sessionService.revealVotes(sessionId, facilitatorId, storyId);
      sessionService.finalizeEstimate(sessionId, facilitatorId, storyId, 8);

      // Now revote
      const result = sessionService.revoteStory(sessionId, facilitatorId, storyId);

      const story = result!.stories.find(s => s.id === storyId);
      expect(story!.votes).toEqual({});
      expect(story!.finalEstimate).toBeUndefined();
      expect(story!.status).toBe('voting');
    });

    it('should update session status to voting when revoting starts', () => {
      const result = sessionService.revoteStory(sessionId, facilitatorId, storyId);

      expect(result!.status).toBe('voting');
      expect(result!.currentStoryId).toBe(storyId);
    });

    it('should update session updatedAt timestamp', (done) => {
      const originalSession = sessionService.getSession(sessionId)!;
      const originalTimestamp = originalSession.updatedAt;

      // Wait a small amount to ensure timestamp difference
      setTimeout(() => {
        const result = sessionService.revoteStory(sessionId, facilitatorId, storyId);
        expect(result!.updatedAt.getTime()).toBeGreaterThan(originalTimestamp.getTime());
        done();
      }, 10);
    });
  });
});