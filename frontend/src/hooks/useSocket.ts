import { useEffect, useCallback, useRef } from 'react';
import { useSessionStore } from '../stores/sessionStore';
import { socketService } from '../services/socketService';
import { SocketEvents } from '../shared/types';
import type { Session, Participant, Story } from '../shared/types';

export const useSocket = () => {
  const {
    setConnectionStatus,
    setSession,
    updateParticipant,
    removeParticipant,
    addStory,
    updateStory,
    setCurrentStory,
    setVotingInProgress,
    updateStoryVote,
    revealVotes,
    setFinalEstimate,
    setError,
    clearError,
    session,
    currentParticipant,
  } = useSessionStore();

  const isInitialized = useRef(false);

  // Initialize socket connection - but don't auto-connect
  useEffect(() => {
    if (isInitialized.current) return;
    isInitialized.current = true;

    // Set up event listeners immediately
    const setupEventListeners = () => {
      // Connection events
      socketService.on('connection_lost', () => {
        setConnectionStatus('reconnecting');
        setError('Connection lost. Attempting to reconnect...');
      });

      socketService.on('reconnected', () => {
        setConnectionStatus('connected');
        clearError();
      });

      socketService.on('reconnection_failed', () => {
        setConnectionStatus('disconnected');
        setError('Unable to reconnect to server. Please refresh the page.');
      });

      socketService.on('rejoin_session_needed', (sessionId: string, participantId: string) => {
        // Automatically rejoin session after reconnection
        if (session && currentParticipant) {
          socketService.joinSession(sessionId, currentParticipant);
        }
      });

      // Session events
      socketService.on(SocketEvents.SESSION_UPDATED, (data: { session: Session }) => {
        setSession(data.session);
      });

      socketService.on(SocketEvents.PARTICIPANT_JOINED, (data: { participant: Participant }) => {
        updateParticipant(data.participant);
      });

      socketService.on(SocketEvents.PARTICIPANT_LEFT, (data: { participantId: string }) => {
        removeParticipant(data.participantId);
      });

      // Story events - STORY_ADDED handler removed to prevent duplication
      // Stories are now handled only via SESSION_UPDATED events

      // Voting events
      socketService.on(SocketEvents.VOTING_STARTED, (data: { storyId: string }) => {
        const story = session?.stories.find(s => s.id === data.storyId);
        if (story) {
          setCurrentStory(story);
          setVotingInProgress(true);
        }
      });

      socketService.on(SocketEvents.VOTE_SUBMITTED, (data: { 
        participantId: string; 
        storyId: string; 
        hasVoted: boolean;
      }) => {
        // Update UI to show that participant has voted (without revealing the vote)
        console.info(`Participant ${data.participantId} voted on story ${data.storyId}`);
      });

      socketService.on(SocketEvents.VOTES_REVEALED, (data: { 
        storyId: string; 
        votes: Record<string, string | number>;
      }) => {
        revealVotes(data.storyId, data.votes);
      });

      socketService.on(SocketEvents.FINAL_ESTIMATE_SET, (data: { 
        storyId: string; 
        estimate: string | number;
      }) => {
        setFinalEstimate(data.storyId, data.estimate);
      });

      socketService.on(SocketEvents.REVOTE_STARTED, (data: { storyId: string }) => {
        const story = session?.stories.find(s => s.id === data.storyId);
        if (story) {
          setCurrentStory(story);
          setVotingInProgress(true);
        }
      });

      // Error handling
      socketService.on(SocketEvents.ERROR, (data: { message: string; code?: string }) => {
        console.error('Socket error:', data);
        setError(data.message);
      });
    };

    setupEventListeners();

    // Cleanup on unmount
    return () => {
      socketService.disconnect();
    };
  }, []);

  // Socket action wrappers
  const connectAndJoinSession = useCallback(async (sessionId: string, participant: Participant) => {
    try {
      setConnectionStatus('connecting');
      clearError();
      
      // Connect to socket first
      await socketService.connect();
      setConnectionStatus('connected');
      
      // Then join the session
      socketService.joinSession(sessionId, participant);
      clearError();
    } catch (error) {
      console.error('Failed to connect and join session:', error);
      setConnectionStatus('disconnected');
      setError('Failed to connect to server. Please check your connection.');
    }
  }, [clearError, setError, setConnectionStatus]);

  const joinSession = useCallback((sessionId: string, participant: Participant) => {
    if (!socketService.connected) {
      setError('Not connected to server');
      return;
    }

    try {
      socketService.joinSession(sessionId, participant);
      clearError();
    } catch (error) {
      console.error('Failed to join session:', error);
      setError('Failed to join session');
    }
  }, [clearError, setError]);

  const leaveSession = useCallback(() => {
    socketService.leaveSession();
  }, []);

  const addStoryAction = useCallback((sessionId: string, title: string, description?: string) => {
    if (!socketService.connected) {
      setError('Not connected to server');
      return;
    }

    try {
      socketService.addStory(title, description);
      clearError();
    } catch (error) {
      console.error('Failed to add story:', error);
      setError('Failed to add story');
    }
  }, [clearError, setError]);

  const startVoting = useCallback((sessionId: string, storyId: string) => {
    if (!socketService.connected) {
      setError('Not connected to server');
      return;
    }

    try {
      socketService.startVoting(storyId);
      clearError();
    } catch (error) {
      console.error('Failed to start voting:', error);
      setError('Failed to start voting');
    }
  }, [clearError, setError]);

  const submitVote = useCallback((sessionId: string, storyId: string, vote: string | number) => {
    if (!socketService.connected) {
      setError('Not connected to server');
      return;
    }

    try {
      socketService.submitVote(storyId, vote);
      clearError();
    } catch (error) {
      console.error('Failed to submit vote:', error);
      setError('Failed to submit vote');
    }
  }, [clearError, setError]);

  const revealVotesAction = useCallback((sessionId: string, storyId: string) => {
    if (!socketService.connected) {
      setError('Not connected to server');
      return;
    }

    try {
      socketService.revealVotes(storyId);
      clearError();
    } catch (error) {
      console.error('Failed to reveal votes:', error);
      setError('Failed to reveal votes');
    }
  }, [clearError, setError]);

  const setFinalEstimateAction = useCallback((sessionId: string, storyId: string, estimate: string | number) => {
    if (!socketService.connected) {
      setError('Not connected to server');
      return;
    }

    try {
      socketService.setFinalEstimate(storyId, estimate);
      clearError();
    } catch (error) {
      console.error('Failed to set final estimate:', error);
      setError('Failed to set final estimate');
    }
  }, [clearError, setError]);

  const revoteStory = useCallback((sessionId: string, storyId: string) => {
    if (!socketService.connected) {
      setError('Not connected to server');
      return;
    }

    try {
      socketService.revoteStory(storyId);
      clearError();
    } catch (error) {
      console.error('Failed to start revoting:', error);
      setError('Failed to start revoting');
    }
  }, [clearError, setError]);

  return {
    connected: socketService.connected,
    sessionId: socketService.currentSessionId,
    participantId: socketService.currentParticipantId,
    
    // Actions
    connectAndJoinSession,
    joinSession,
    leaveSession,
    addStory: addStoryAction,
    startVoting,
    submitVote,
    revealVotes: revealVotesAction,
    setFinalEstimate: setFinalEstimateAction,
    revoteStory,
  };
};