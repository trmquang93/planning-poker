import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { SessionService } from '../../src/services/sessionService';
import type { Session, Participant } from '@shared/types';

// Mock console.info to avoid noise in tests
jest.spyOn(console, 'info').mockImplementation(() => {});

describe('SessionService', () => {
  let sessionService: SessionService;
  let testSession: Session;
  let facilitator: Participant;
  let member: Participant;

  beforeEach(() => {
    sessionService = SessionService.getInstance();
    
    // Clear all sessions between tests
    const allSessions = sessionService.getAllSessions();
    allSessions.forEach(session => {
      sessionService.deleteSession(session.id);
    });

    // Create test participants
    facilitator = {
      id: 'facilitator-1',
      name: 'Test Facilitator',
      role: 'facilitator',
      isOnline: true,
      joinedAt: new Date(),
    };

    member = {
      id: 'member-1', 
      name: 'Test Member',
      role: 'member',
      isOnline: true,
      joinedAt: new Date(),
    };
  });

  describe('Session Creation', () => {
    it('should create a new session successfully', () => {
      const result = sessionService.createSession({
        title: 'Test Session',
        facilitatorName: 'Test Facilitator',
        scale: 'FIBONACCI'
      });

      expect(result.session).toBeDefined();
      expect(result.participantId).toBeDefined();
      expect(result.session.title).toBe('Test Session');
      expect(result.session.scale).toBe('FIBONACCI');
      expect(result.session.status).toBe('waiting');
      expect(result.session.participants).toHaveLength(1);
      expect(result.session.participants[0].name).toBe('Test Facilitator');
      expect(result.session.participants[0].role).toBe('facilitator');
      expect(result.session.code).toMatch(/^[A-Z0-9]{6}$/);
    });

    it('should generate unique session codes', () => {
      const session1 = sessionService.createSession({
        title: 'Session 1',
        facilitatorName: 'User 1',
        scale: 'FIBONACCI'
      });
      const session2 = sessionService.createSession({
        title: 'Session 2',
        facilitatorName: 'User 2',
        scale: 'FIBONACCI'
      });

      expect(session1.session.code).not.toBe(session2.session.code);
    });

    it('should set correct expiration time', () => {
      const before = new Date();
      const result = sessionService.createSession({
        title: 'Test',
        facilitatorName: 'Test User',
        scale: 'FIBONACCI'
      });
      const after = new Date();

      const expectedExpiration = new Date(before.getTime() + 2 * 60 * 60 * 1000); // 2 hours
      const actualExpiration = result.session.expiresAt;

      expect(actualExpiration.getTime()).toBeGreaterThanOrEqual(expectedExpiration.getTime());
      expect(actualExpiration.getTime()).toBeLessThanOrEqual(after.getTime() + 2 * 60 * 60 * 1000);
    });
  });

  describe('Session Retrieval', () => {
    beforeEach(() => {
      const result = sessionService.createSession({
        title: 'Test Session',
        facilitatorName: 'Test Facilitator',
        scale: 'FIBONACCI'
      });
      testSession = result.session;
    });

    it('should retrieve session by ID', () => {
      const retrieved = sessionService.getSession(testSession.id);
      expect(retrieved).toEqual(testSession);
    });

    it('should retrieve session by code', () => {
      const retrieved = sessionService.getSessionByCode(testSession.code);
      expect(retrieved).toEqual(testSession);
    });

    it('should return null for non-existent session ID', () => {
      const retrieved = sessionService.getSession('non-existent');
      expect(retrieved).toBeNull();
    });

    it('should return null for non-existent session code', () => {
      const retrieved = sessionService.getSessionByCode('XXXXXX');
      expect(retrieved).toBeNull();
    });
  });

  describe('Participant Management', () => {
    beforeEach(() => {
      const result = sessionService.createSession({
        title: 'Test Session',
        facilitatorName: 'Test Facilitator',
        scale: 'FIBONACCI'
      });
      testSession = result.session;
    });

    it('should add participant to session via joinSession', () => {
      const result = sessionService.joinSession({
        sessionCode: testSession.code,
        participantName: 'New Member'
      });

      expect(result.session.participants).toHaveLength(2);
      expect(result.participantId).toBeDefined();
      
      const newParticipant = result.session.participants.find(p => p.id === result.participantId);
      expect(newParticipant).toBeDefined();
      expect(newParticipant!.name).toBe('New Member');
      expect(newParticipant!.role).toBe('member');
    });

    it('should not allow duplicate participant names', () => {
      expect(() => {
        sessionService.joinSession({
          sessionCode: testSession.code,
          participantName: 'Test Facilitator'
        });
      }).toThrow('Participant name already exists in session');
    });

    it('should update participant status', () => {
      const result = sessionService.joinSession({
        sessionCode: testSession.code,
        participantName: 'Test Member'
      });
      
      sessionService.updateParticipantStatus(testSession.id, result.participantId, false);
      
      const updated = sessionService.getSession(testSession.id);
      const participant = updated!.participants.find(p => p.id === result.participantId);
      expect(participant!.isOnline).toBe(false);
    });

    it('should remove participant from session', () => {
      const result = sessionService.joinSession({
        sessionCode: testSession.code,
        participantName: 'Test Member'
      });
      
      sessionService.removeParticipant(testSession.id, result.participantId);
      
      const updated = sessionService.getSession(testSession.id);
      expect(updated!.participants).toHaveLength(1);
      expect(updated!.participants.find(p => p.id === result.participantId)).toBeUndefined();
    });
  });

  describe('Story Management', () => {
    beforeEach(() => {
      const result = sessionService.createSession({ title: 'Test Session', facilitatorName: 'Test Facilitator', scale: 'FIBONACCI' });
      testSession = result.session;
      facilitator.id = result.participantId;
    });

    it('should add story to session', () => {
      const updated = sessionService.addStory(
        testSession.id,
        facilitator.id,
        'Test Story',
        'Test description'
      );

      expect(updated!.stories).toHaveLength(1);
      expect(updated!.stories[0].title).toBe('Test Story');
      expect(updated!.stories[0].description).toBe('Test description');
      expect(updated!.stories[0].status).toBe('pending');
      expect(updated!.stories[0].votes).toEqual({});
    });

    it('should only allow facilitators to add stories', () => {
      const memberResult = sessionService.joinSession({ sessionCode: testSession.code, participantName: 'Test Member' });
      
      expect(() => {
        sessionService.addStory(testSession.id, memberResult.participantId, 'Test Story');
      }).toThrow('Only facilitators can add stories');
    });

    it('should validate required story title', () => {
      expect(() => {
        sessionService.addStory(testSession.id, facilitator.id, '');
      }).toThrow();
    });
  });

  describe('Voting Workflow', () => {
    let storyId: string;

    beforeEach(() => {
      const result = sessionService.createSession({ title: 'Test Session', facilitatorName: 'Test Facilitator', scale: 'FIBONACCI' });
      testSession = result.session;
      facilitator.id = result.participantId;

      // Add a member
      const memberResult = sessionService.joinSession({ sessionCode: testSession.code, participantName: 'Test Member' });
      member.id = memberResult.participantId;

      // Add a story
      const updatedSession = sessionService.addStory(testSession.id, facilitator.id, 'Test Story');
      storyId = updatedSession!.stories[0].id;
    });

    it('should start voting on a story', () => {
      const updated = sessionService.startVoting(testSession.id, facilitator.id, storyId);

      expect(updated!.status).toBe('voting');
      expect(updated!.currentStoryId).toBe(storyId);
      
      const story = updated!.stories.find(s => s.id === storyId);
      expect(story!.status).toBe('voting');
      expect(story!.votes).toEqual({});
    });

    it('should only allow facilitators to start voting', () => {
      expect(() => {
        sessionService.startVoting(testSession.id, member.id, storyId);
      }).toThrow('Only facilitators can start voting');
    });

    it('should submit votes correctly', () => {
      // Start voting
      sessionService.startVoting(testSession.id, facilitator.id, storyId);

      // Submit votes
      const updated1 = sessionService.submitVote(testSession.id, facilitator.id, storyId, 5);
      const updated2 = sessionService.submitVote(testSession.id, member.id, storyId, 8);

      const story = updated2!.stories.find(s => s.id === storyId);
      expect(Object.keys(story!.votes)).toHaveLength(2);
      expect(story!.votes['Test Facilitator']).toBe(5);
      expect(story!.votes['Test Member']).toBe(8);
    });

    it('should allow vote updates', () => {
      sessionService.startVoting(testSession.id, facilitator.id, storyId);
      
      // Submit initial vote
      sessionService.submitVote(testSession.id, facilitator.id, storyId, 5);
      
      // Update vote
      const updated = sessionService.submitVote(testSession.id, facilitator.id, storyId, 8);
      
      const story = updated!.stories.find(s => s.id === storyId);
      expect(story!.votes['Test Facilitator']).toBe(8);
    });

    it('should reveal votes correctly', () => {
      sessionService.startVoting(testSession.id, facilitator.id, storyId);
      sessionService.submitVote(testSession.id, facilitator.id, storyId, 5);
      sessionService.submitVote(testSession.id, member.id, storyId, 8);

      const updated = sessionService.revealVotes(testSession.id, facilitator.id, storyId);

      expect(updated!.status).toBe('revealing');
      const story = updated!.stories.find(s => s.id === storyId);
      expect(story!.status).toBe('voting'); // Story status stays voting until finalized
    });

    it('should finalize estimate and complete story', () => {
      sessionService.startVoting(testSession.id, facilitator.id, storyId);
      sessionService.submitVote(testSession.id, facilitator.id, storyId, 5);
      sessionService.revealVotes(testSession.id, facilitator.id, storyId);

      const updated = sessionService.finalizeEstimate(testSession.id, facilitator.id, storyId, 5);

      expect(updated!.status).toBe('waiting');
      expect(updated!.currentStoryId).toBeUndefined();
      
      const story = updated!.stories.find(s => s.id === storyId);
      expect(story!.status).toBe('completed');
      expect(story!.finalEstimate).toBe(5);
    });

    it('should only allow facilitators to reveal votes and finalize estimates', () => {
      sessionService.startVoting(testSession.id, facilitator.id, storyId);

      expect(() => {
        sessionService.revealVotes(testSession.id, member.id, storyId);
      }).toThrow('Only facilitators can reveal votes');

      expect(() => {
        sessionService.finalizeEstimate(testSession.id, member.id, storyId, 5);
      }).toThrow('Only facilitators can finalize estimates');
    });
  });

  describe('Error Handling', () => {
    it('should handle non-existent session operations gracefully', () => {
      expect(() => {
        sessionService.joinSession({ sessionCode: 'NON_EXISTENT', participantName: 'Test' });
      }).toThrow('Session not found');

      expect(() => {
        sessionService.addStory('non-existent', 'user-id', 'Test Story');
      }).toThrow('Session not found');
    });

    it('should handle non-existent story operations gracefully', () => {
      const result = sessionService.createSession({ title: 'Test', facilitatorName: 'Facilitator', scale: 'FIBONACCI' });

      expect(() => {
        sessionService.startVoting(result.session.id, result.participantId, 'non-existent-story');
      }).toThrow('Story not found');
    });

    it('should handle non-existent participant operations gracefully', () => {
      const result = sessionService.createSession({ title: 'Test', facilitatorName: 'Facilitator', scale: 'FIBONACCI' });

      expect(() => {
        sessionService.addStory(result.session.id, 'non-existent-user', 'Test Story');
      }).toThrow('Facilitator not found');
    });
  });
});