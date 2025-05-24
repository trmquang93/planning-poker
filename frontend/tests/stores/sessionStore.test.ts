import { describe, it, expect, beforeEach } from 'vitest';
import { useSessionStore } from '../../src/stores/sessionStore';
import type { Session, Participant, Story } from '../../src/shared/types';

describe('SessionStore', () => {
  let mockSession: Session;
  let mockParticipant: Participant;
  let mockStory: Story;

  beforeEach(() => {
    // Reset store before each test
    useSessionStore.getState().reset();

    mockParticipant = {
      id: 'participant-1',
      name: 'Test User',
      role: 'facilitator',
      isOnline: true,
      joinedAt: new Date('2024-01-01T10:00:00Z'),
    };

    mockStory = {
      id: 'story-1',
      title: 'Test Story',
      description: 'Test description',
      status: 'pending',
      votes: {},
      createdAt: new Date('2024-01-01T10:00:00Z'),
    };

    mockSession = {
      id: 'session-1',
      code: 'ABC123',
      title: 'Test Session',
      scale: 'FIBONACCI',
      status: 'waiting',
      participants: [mockParticipant],
      stories: [mockStory],
      currentStoryId: undefined,
      createdAt: new Date('2024-01-01T10:00:00Z'),
      updatedAt: new Date('2024-01-01T10:00:00Z'),
      expiresAt: new Date('2024-01-01T12:00:00Z'),
    };
  });

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const state = useSessionStore.getState();

      expect(state.session).toBeNull();
      expect(state.currentParticipant).toBeNull();
      expect(state.connectionStatus).toBe('disconnected');
      expect(state.isJoining).toBe(false);
      expect(state.isCreating).toBe(false);
      expect(state.error).toBeNull();
      expect(state.currentStory).toBeNull();
      expect(state.myVote).toBeNull();
      expect(state.votingInProgress).toBe(false);
    });
  });

  describe('Basic Setters', () => {
    it('should set session correctly', () => {
      const { setSession } = useSessionStore.getState();
      
      setSession(mockSession);
      
      const state = useSessionStore.getState();
      expect(state.session).toEqual(mockSession);
    });

    it('should set current participant correctly', () => {
      const { setCurrentParticipant } = useSessionStore.getState();
      
      setCurrentParticipant(mockParticipant);
      
      const state = useSessionStore.getState();
      expect(state.currentParticipant).toEqual(mockParticipant);
    });

    it('should set connection status correctly', () => {
      const { setConnectionStatus } = useSessionStore.getState();
      
      setConnectionStatus('connected');
      
      const state = useSessionStore.getState();
      expect(state.connectionStatus).toBe('connected');
    });

    it('should set error correctly', () => {
      const { setError } = useSessionStore.getState();
      
      setError('Test error message');
      
      const state = useSessionStore.getState();
      expect(state.error).toBe('Test error message');
    });

    it('should clear error correctly', () => {
      const { setError, clearError } = useSessionStore.getState();
      
      setError('Test error');
      clearError();
      
      const state = useSessionStore.getState();
      expect(state.error).toBeNull();
    });
  });

  describe('Participant Management', () => {
    beforeEach(() => {
      const { setSession } = useSessionStore.getState();
      setSession(mockSession);
    });

    it('should update participant correctly', () => {
      const { updateParticipant } = useSessionStore.getState();
      
      const updatedParticipant = {
        ...mockParticipant,
        name: 'Updated Name',
        isOnline: false
      };
      
      updateParticipant(updatedParticipant);
      
      const state = useSessionStore.getState();
      const participant = state.session!.participants.find(p => p.id === mockParticipant.id);
      expect(participant!.name).toBe('Updated Name');
      expect(participant!.isOnline).toBe(false);
    });

    it('should update session updatedAt when updating participant', () => {
      const { updateParticipant } = useSessionStore.getState();
      const originalUpdatedAt = mockSession.updatedAt;
      
      // Wait a bit to ensure different timestamp
      setTimeout(() => {
        updateParticipant({ ...mockParticipant, name: 'New Name' });
        
        const state = useSessionStore.getState();
        expect(state.session!.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
      }, 1);
    });

    it('should remove participant correctly', () => {
      const { removeParticipant } = useSessionStore.getState();
      
      removeParticipant(mockParticipant.id);
      
      const state = useSessionStore.getState();
      expect(state.session!.participants).toHaveLength(0);
    });

    it('should handle updating non-existent participant', () => {
      const { updateParticipant } = useSessionStore.getState();
      
      const nonExistentParticipant = {
        id: 'non-existent',
        name: 'Non Existent',
        role: 'member' as const,
        isOnline: true,
        joinedAt: new Date(),
      };
      
      updateParticipant(nonExistentParticipant);
      
      const state = useSessionStore.getState();
      expect(state.session!.participants).toHaveLength(1);
      expect(state.session!.participants[0].id).toBe(mockParticipant.id);
    });

    it('should handle operations when no session exists', () => {
      const { reset, updateParticipant, removeParticipant } = useSessionStore.getState();
      
      reset(); // Clear session
      
      updateParticipant(mockParticipant);
      removeParticipant('some-id');
      
      const state = useSessionStore.getState();
      expect(state.session).toBeNull();
    });
  });

  describe('Story Management', () => {
    beforeEach(() => {
      const { setSession } = useSessionStore.getState();
      setSession(mockSession);
    });

    it('should add story correctly', () => {
      const { addStory } = useSessionStore.getState();
      
      const newStory: Story = {
        id: 'story-2',
        title: 'New Story',
        status: 'pending',
        votes: {},
        createdAt: new Date(),
      };
      
      addStory(newStory);
      
      const state = useSessionStore.getState();
      expect(state.session!.stories).toHaveLength(2);
      expect(state.session!.stories[1]).toEqual(newStory);
    });

    it('should update story correctly', () => {
      const { updateStory } = useSessionStore.getState();
      
      const updatedStory = {
        ...mockStory,
        title: 'Updated Story Title',
        status: 'voting' as const,
        votes: { 'Test User': 5 }
      };
      
      updateStory(updatedStory);
      
      const state = useSessionStore.getState();
      const story = state.session!.stories.find(s => s.id === mockStory.id);
      expect(story!.title).toBe('Updated Story Title');
      expect(story!.status).toBe('voting');
      expect(story!.votes).toEqual({ 'Test User': 5 });
    });

    it('should handle updating non-existent story', () => {
      const { updateStory } = useSessionStore.getState();
      
      const nonExistentStory: Story = {
        id: 'non-existent',
        title: 'Non Existent Story',
        status: 'pending',
        votes: {},
        createdAt: new Date(),
      };
      
      updateStory(nonExistentStory);
      
      const state = useSessionStore.getState();
      expect(state.session!.stories).toHaveLength(1);
      expect(state.session!.stories[0].id).toBe(mockStory.id);
    });
  });

  describe('Voting State Management', () => {
    beforeEach(() => {
      const { setSession } = useSessionStore.getState();
      setSession(mockSession);
    });

    it('should set current story correctly', () => {
      const { setCurrentStory } = useSessionStore.getState();
      
      setCurrentStory(mockStory);
      
      const state = useSessionStore.getState();
      expect(state.currentStory).toEqual(mockStory);
    });

    it('should set my vote correctly', () => {
      const { setMyVote } = useSessionStore.getState();
      
      setMyVote(5);
      
      const state = useSessionStore.getState();
      expect(state.myVote).toBe(5);
    });

    it('should set voting in progress correctly', () => {
      const { setVotingInProgress } = useSessionStore.getState();
      
      setVotingInProgress(true);
      
      const state = useSessionStore.getState();
      expect(state.votingInProgress).toBe(true);
    });

    it('should update story vote correctly', () => {
      const { updateStoryVote } = useSessionStore.getState();
      
      updateStoryVote(mockStory.id, 'participant-2', 8);
      
      const state = useSessionStore.getState();
      const story = state.session!.stories.find(s => s.id === mockStory.id);
      expect(story!.votes['participant-2']).toBe(8);
    });

    it('should reveal votes correctly', () => {
      const { revealVotes } = useSessionStore.getState();
      
      const votes = { 'User 1': 5, 'User 2': 8 };
      revealVotes(mockStory.id, votes);
      
      const state = useSessionStore.getState();
      const story = state.session!.stories.find(s => s.id === mockStory.id);
      expect(story!.votes).toEqual(votes);
    });

    it('should set final estimate correctly', () => {
      const { setFinalEstimate } = useSessionStore.getState();
      
      setFinalEstimate(mockStory.id, 5);
      
      const state = useSessionStore.getState();
      const story = state.session!.stories.find(s => s.id === mockStory.id);
      expect(story!.finalEstimate).toBe(5);
      expect(story!.status).toBe('completed');
    });

    it('should handle voting operations on non-existent stories gracefully', () => {
      const { updateStoryVote, revealVotes, setFinalEstimate } = useSessionStore.getState();
      
      updateStoryVote('non-existent', 'user', 5);
      revealVotes('non-existent', { 'user': 5 });
      setFinalEstimate('non-existent', 5);
      
      const state = useSessionStore.getState();
      expect(state.session!.stories).toHaveLength(1);
      expect(state.session!.stories[0].id).toBe(mockStory.id);
    });
  });

  describe('UI State Management', () => {
    it('should set joining state correctly', () => {
      const { setIsJoining } = useSessionStore.getState();
      
      setIsJoining(true);
      
      const state = useSessionStore.getState();
      expect(state.isJoining).toBe(true);
    });

    it('should set creating state correctly', () => {
      const { setIsCreating } = useSessionStore.getState();
      
      setIsCreating(true);
      
      const state = useSessionStore.getState();
      expect(state.isCreating).toBe(true);
    });
  });

  describe('Reset Functionality', () => {
    it('should reset store to initial state', () => {
      const { setSession, setCurrentParticipant, setError, setConnectionStatus, reset } = useSessionStore.getState();
      
      // Set some state
      setSession(mockSession);
      setCurrentParticipant(mockParticipant);
      setError('Test error');
      setConnectionStatus('connected');
      
      // Reset
      reset();
      
      const state = useSessionStore.getState();
      expect(state.session).toBeNull();
      expect(state.currentParticipant).toBeNull();
      expect(state.error).toBeNull();
      expect(state.connectionStatus).toBe('disconnected');
      expect(state.currentStory).toBeNull();
      expect(state.myVote).toBeNull();
      expect(state.votingInProgress).toBe(false);
    });
  });

  describe('Complex State Updates', () => {
    it('should handle multiple rapid updates correctly', () => {
      const { setSession, updateParticipant, addStory } = useSessionStore.getState();
      
      setSession(mockSession);
      
      // Rapid updates
      updateParticipant({ ...mockParticipant, name: 'Name 1' });
      updateParticipant({ ...mockParticipant, name: 'Name 2' });
      
      const newStory: Story = {
        id: 'story-2',
        title: 'Story 2',
        status: 'pending',
        votes: {},
        createdAt: new Date(),
      };
      addStory(newStory);
      
      const state = useSessionStore.getState();
      expect(state.session!.participants[0].name).toBe('Name 2');
      expect(state.session!.stories).toHaveLength(2);
    });

    it('should maintain referential stability for unchanged data', () => {
      const { setSession, updateParticipant } = useSessionStore.getState();
      
      setSession(mockSession);
      const initialStories = useSessionStore.getState().session!.stories;
      
      // Update participant (shouldn't affect stories reference)
      updateParticipant({ ...mockParticipant, name: 'New Name' });
      
      const state = useSessionStore.getState();
      expect(state.session!.stories).toBe(initialStories); // Same reference
    });
  });
});