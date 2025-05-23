import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { Session, Participant, Story } from '@shared/types';

interface SessionState {
  // Session data
  session: Session | null;
  currentParticipant: Participant | null;
  connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'reconnecting';
  
  // UI state
  isJoining: boolean;
  isCreating: boolean;
  error: string | null;
  
  // Voting state
  currentStory: Story | null;
  myVote: string | number | null;
  votingInProgress: boolean;
  
  // Actions
  setSession: (session: Session) => void;
  setCurrentParticipant: (participant: Participant) => void;
  setConnectionStatus: (status: SessionState['connectionStatus']) => void;
  setError: (error: string | null) => void;
  setIsJoining: (isJoining: boolean) => void;
  setIsCreating: (isCreating: boolean) => void;
  
  // Session actions
  updateParticipant: (participant: Participant) => void;
  removeParticipant: (participantId: string) => void;
  addStory: (story: Story) => void;
  updateStory: (story: Story) => void;
  
  // Voting actions
  setCurrentStory: (story: Story | null) => void;
  setMyVote: (vote: string | number | null) => void;
  setVotingInProgress: (inProgress: boolean) => void;
  updateStoryVote: (storyId: string, participantId: string, vote: string | number) => void;
  revealVotes: (storyId: string, votes: Record<string, string | number>) => void;
  setFinalEstimate: (storyId: string, estimate: string | number) => void;
  
  // Utility actions
  reset: () => void;
  clearError: () => void;
}

const initialState = {
  session: null,
  currentParticipant: null,
  connectionStatus: 'disconnected' as const,
  isJoining: false,
  isCreating: false,
  error: null,
  currentStory: null,
  myVote: null,
  votingInProgress: false,
};

export const useSessionStore = create<SessionState>()(
  devtools(
    (set, get) => ({
      ...initialState,

      // Basic setters
      setSession: (session) => set({ session }, false, 'setSession'),
      
      setCurrentParticipant: (participant) => set({ currentParticipant: participant }, false, 'setCurrentParticipant'),
      
      setConnectionStatus: (connectionStatus) => set({ connectionStatus }, false, 'setConnectionStatus'),
      
      setError: (error) => set({ error }, false, 'setError'),
      
      setIsJoining: (isJoining) => set({ isJoining }, false, 'setIsJoining'),
      
      setIsCreating: (isCreating) => set({ isCreating }, false, 'setIsCreating'),

      // Session management
      updateParticipant: (updatedParticipant) => set((state) => {
        if (!state.session) return {};
        
        const updatedParticipants = state.session.participants.map(p => 
          p.id === updatedParticipant.id ? updatedParticipant : p
        );
        
        return {
          session: {
            ...state.session,
            participants: updatedParticipants,
            updatedAt: new Date(),
          }
        };
      }, false, 'updateParticipant'),

      removeParticipant: (participantId) => set((state) => {
        if (!state.session) return {};
        
        const updatedParticipants = state.session.participants.filter(p => p.id !== participantId);
        
        return {
          session: {
            ...state.session,
            participants: updatedParticipants,
            updatedAt: new Date(),
          }
        };
      }, false, 'removeParticipant'),

      addStory: (story) => set((state) => {
        if (!state.session) return {};
        
        return {
          session: {
            ...state.session,
            stories: [...state.session.stories, story],
            updatedAt: new Date(),
          }
        };
      }, false, 'addStory'),

      updateStory: (updatedStory) => set((state) => {
        if (!state.session) return {};
        
        const updatedStories = state.session.stories.map(s => 
          s.id === updatedStory.id ? updatedStory : s
        );
        
        return {
          session: {
            ...state.session,
            stories: updatedStories,
            updatedAt: new Date(),
          }
        };
      }, false, 'updateStory'),

      // Voting management
      setCurrentStory: (currentStory) => set({ currentStory }, false, 'setCurrentStory'),
      
      setMyVote: (myVote) => set({ myVote }, false, 'setMyVote'),
      
      setVotingInProgress: (votingInProgress) => set({ votingInProgress }, false, 'setVotingInProgress'),

      updateStoryVote: (storyId, participantId, vote) => set((state) => {
        if (!state.session) return {};
        
        const updatedStories = state.session.stories.map(story => {
          if (story.id === storyId) {
            return {
              ...story,
              votes: {
                ...story.votes,
                [participantId]: vote,
              }
            };
          }
          return story;
        });
        
        return {
          session: {
            ...state.session,
            stories: updatedStories,
            updatedAt: new Date(),
          }
        };
      }, false, 'updateStoryVote'),

      revealVotes: (storyId, votes) => set((state) => {
        if (!state.session) return {};
        
        const updatedStories = state.session.stories.map(story => {
          if (story.id === storyId) {
            return {
              ...story,
              votes,
              status: 'completed' as const,
            };
          }
          return story;
        });
        
        return {
          session: {
            ...state.session,
            stories: updatedStories,
            updatedAt: new Date(),
          },
          votingInProgress: false,
          myVote: null,
        };
      }, false, 'revealVotes'),

      setFinalEstimate: (storyId, estimate) => set((state) => {
        if (!state.session) return {};
        
        const updatedStories = state.session.stories.map(story => {
          if (story.id === storyId) {
            return {
              ...story,
              finalEstimate: estimate,
              completedAt: new Date(),
            };
          }
          return story;
        });
        
        return {
          session: {
            ...state.session,
            stories: updatedStories,
            updatedAt: new Date(),
          }
        };
      }, false, 'setFinalEstimate'),

      // Utility actions
      reset: () => set(initialState, false, 'reset'),
      
      clearError: () => set({ error: null }, false, 'clearError'),
    }),
    {
      name: 'session-store',
    }
  )
);