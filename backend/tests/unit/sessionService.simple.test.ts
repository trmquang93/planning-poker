import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { SessionService } from '../../src/services/sessionService';

// Mock console.info to avoid noise in tests
jest.spyOn(console, 'info').mockImplementation(() => {});

describe('SessionService - Core Functionality', () => {
  let sessionService: SessionService;

  beforeEach(() => {
    sessionService = SessionService.getInstance();
    // Clear all sessions
    sessionService.clearAllSessions();
    // Stop cleanup timer to prevent Jest hanging
    sessionService.stopCleanupTimer();
  });

  describe('Basic Session Operations', () => {
    it('should create session successfully', () => {
      const result = sessionService.createSession({
        title: 'Test Session',
        facilitatorName: 'Test Facilitator', 
        scale: 'FIBONACCI'
      });

      expect(result.session.title).toBe('Test Session');
      expect(result.session.participants[0].name).toBe('Test Facilitator');
      expect(result.session.participants[0].role).toBe('facilitator');
      expect(result.participantId).toBeDefined();
    });

    it('should join session successfully', () => {
      const createResult = sessionService.createSession({
        title: 'Test Session',
        facilitatorName: 'Facilitator',
        scale: 'FIBONACCI'
      });

      const joinResult = sessionService.joinSession({
        sessionCode: createResult.session.code,
        participantName: 'Member'
      });

      expect(joinResult.session.participants).toHaveLength(2);
      expect(joinResult.session.participants[1].name).toBe('Member');
      expect(joinResult.session.participants[1].role).toBe('member');
    });

    it('should retrieve session by ID', () => {
      const createResult = sessionService.createSession({
        title: 'Test Session',
        facilitatorName: 'Facilitator',
        scale: 'FIBONACCI'
      });

      const retrieved = sessionService.getSession(createResult.session.id);
      expect(retrieved?.id).toBe(createResult.session.id);
    });
  });

  describe('Story and Voting Workflow', () => {
    let sessionId: string;
    let facilitatorId: string;
    let memberId: string;

    beforeEach(() => {
      const createResult = sessionService.createSession({
        title: 'Test Session',
        facilitatorName: 'Facilitator',
        scale: 'FIBONACCI'
      });
      
      sessionId = createResult.session.id;
      facilitatorId = createResult.participantId;

      const joinResult = sessionService.joinSession({
        sessionCode: createResult.session.code,
        participantName: 'Member'
      });
      memberId = joinResult.participantId;
    });

    it('should complete full voting workflow', () => {
      // Add story
      const sessionWithStory = sessionService.addStory(
        sessionId, 
        facilitatorId, 
        'Test Story', 
        'Test description'
      );
      expect(sessionWithStory?.stories).toHaveLength(1);
      
      const storyId = sessionWithStory!.stories[0].id;

      // Start voting
      const votingSession = sessionService.startVoting(sessionId, facilitatorId, storyId);
      expect(votingSession?.status).toBe('voting');
      expect(votingSession?.currentStoryId).toBe(storyId);

      // Submit votes
      sessionService.submitVote(sessionId, facilitatorId, storyId, 5);
      const sessionWithVotes = sessionService.submitVote(sessionId, memberId, storyId, 8);
      
      const story = sessionWithVotes?.stories[0];
      expect(Object.keys(story?.votes || {})).toHaveLength(2);

      // Reveal votes
      const revealedSession = sessionService.revealVotes(sessionId, facilitatorId, storyId);
      expect(revealedSession?.status).toBe('revealing');

      // Finalize estimate
      const finalSession = sessionService.finalizeEstimate(sessionId, facilitatorId, storyId, 5);
      expect(finalSession?.status).toBe('waiting');
      expect(finalSession?.currentStoryId).toBeUndefined();
      
      const finalStory = finalSession?.stories[0];
      expect(finalStory?.status).toBe('completed');
      expect(finalStory?.finalEstimate).toBe(5);
    });

    it('should handle vote updates correctly', () => {
      const sessionWithStory = sessionService.addStory(sessionId, facilitatorId, 'Test Story');
      const storyId = sessionWithStory!.stories[0].id;

      sessionService.startVoting(sessionId, facilitatorId, storyId);
      
      // Submit initial vote
      sessionService.submitVote(sessionId, facilitatorId, storyId, 3);
      
      // Update vote
      const updatedSession = sessionService.submitVote(sessionId, facilitatorId, storyId, 5);
      
      const story = updatedSession?.stories[0];
      expect(story?.votes['Facilitator']).toBe(5);
    });
  });

  describe('Error Handling', () => {
    it('should handle non-existent session gracefully', () => {
      const result = sessionService.getSession('non-existent');
      expect(result).toBeNull();
    });

    it('should prevent non-facilitators from adding stories', () => {
      const createResult = sessionService.createSession({
        title: 'Test Session',
        facilitatorName: 'Facilitator',
        scale: 'FIBONACCI'
      });

      const joinResult = sessionService.joinSession({
        sessionCode: createResult.session.code,
        participantName: 'Member'
      });

      expect(() => {
        sessionService.addStory(createResult.session.id, joinResult.participantId, 'Unauthorized Story');
      }).toThrow('Only facilitators can add stories');
    });

    it('should prevent duplicate participant names', () => {
      const createResult = sessionService.createSession({
        title: 'Test Session',
        facilitatorName: 'Facilitator',
        scale: 'FIBONACCI'
      });

      expect(() => {
        sessionService.joinSession({
          sessionCode: createResult.session.code,
          participantName: 'Facilitator'
        });
      }).toThrow('Participant name already exists in this session');
    });
  });
});