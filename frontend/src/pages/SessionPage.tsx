import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useSessionStore } from '../stores/sessionStore';
import { useSocket } from '../hooks/useSocket';
import { apiService } from '../services/apiService';
import StoryManager from '../components/StoryManager';
import VotingInterface from '../components/VotingInterface';
import SessionSummary from '../components/SessionSummary';
import type { Session, Participant, EstimationValue } from '../shared/types';

interface LocationState {
  session?: Session;
  participantId?: string;
  isCreator?: boolean;
}

const SessionPage = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [hasJoinedSocket, setHasJoinedSocket] = useState(false);
  const [pendingTransfer, setPendingTransfer] = useState<{ participantId: string; participantName: string } | null>(null);
  
  const {
    session,
    currentParticipant,
    connectionStatus,
    error,
    facilitatorDisconnected,
    setSession,
    setCurrentParticipant,
    setError,
    clearError,
    clearFacilitatorDisconnected,
    reset,
    loadPersistedSession,
    saveSession,
    clearPersistedSession,
  } = useSessionStore();

  const { 
    connected, 
    connectAndJoinSession, 
    leaveSession, 
    addStory, 
    startVoting, 
    submitVote, 
    revealVotes, 
    setFinalEstimate,
    revoteStory,
    transferFacilitator,
    requestFacilitator
  } = useSocket();

  // Initialize session data
  useEffect(() => {
    const initializeSession = async () => {
      try {
        console.log('🔄 SessionPage: Initializing session', { sessionId, locationState: location.state });
        setIsLoading(true);
        clearError();
        
        const state = location.state as LocationState;
        
        if (state?.session && state?.participantId) {
          // We have session data from navigation - use it and save to persistence
          console.log('🔄 SessionPage: Using session from navigation state:', state.session);
          console.log('🔄 SessionPage: Participant ID:', state.participantId);
          setSession(state.session);
          
          const participant = state.session.participants.find(p => p.id === state.participantId);
          console.log('🔄 SessionPage: Found participant:', participant);
          if (participant) {
            setCurrentParticipant(participant);
            // Save to localStorage for page refresh
            console.log('💾 SessionPage: Saving session to localStorage');
            setTimeout(() => saveSession(), 0); // Save after state is set
          } else {
            console.error('Participant not found in session');
            setError('Participant not found in session');
          }
        } else if (sessionId) {
          // No navigation state - try localStorage first, then API
          console.log('🔍 SessionPage: No navigation state, checking localStorage first');
          loadPersistedSession();
          
          // Check if we loaded a session that matches the URL
          const currentState = useSessionStore.getState();
          if (currentState.session?.id === sessionId && currentState.currentParticipant) {
            console.log('💾 SessionPage: Restored session from localStorage:', currentState.session);
            // Session restored from localStorage, we're good to go!
          } else {
            // No valid localStorage session, try API as fallback
            console.log('🌐 SessionPage: No localStorage session, trying API:', sessionId);
            try {
              const response = await apiService.getSession(sessionId);
              console.log('🌐 SessionPage: API response received:', response);
              setSession(response.session);
              
              // If no participant data, redirect to home
              if (!state?.participantId) {
                console.log('🔄 SessionPage: No participant data from API, redirecting to home');
                navigate('/', { replace: true });
                return;
              }
            } catch (apiError) {
              // Session doesn't exist on server (404) or other API error
              console.warn('❌ SessionPage: Session not found on server or localStorage, redirecting to home:', apiError);
              clearPersistedSession(); // Clear any stale localStorage data
              reset(); // Clear any stale session data
              navigate('/', { replace: true });
              return;
            }
          }
        } else {
          navigate('/', { replace: true });
          return;
        }
      } catch (error) {
        console.error('Failed to initialize session:', error);
        setError(error instanceof Error ? error.message : 'Failed to load session');
        navigate('/', { replace: true });
      } finally {
        setIsLoading(false);
      }
    };

    initializeSession();
  }, [sessionId, location.state, navigate, setSession, setCurrentParticipant, setError, clearError, reset, loadPersistedSession, saveSession, clearPersistedSession]);

  // Connect and join WebSocket session when session and participant are ready
  useEffect(() => {
    if (session && currentParticipant && !isLoading && !hasJoinedSocket) {
      connectAndJoinSession(session.id, currentParticipant);
      setHasJoinedSocket(true);
    }
  }, [session, currentParticipant, isLoading, hasJoinedSocket, connectAndJoinSession]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      leaveSession();
      setHasJoinedSocket(false);
    };
  }, [leaveSession]);

  const handleLeaveSession = () => {
    leaveSession();
    setHasJoinedSocket(false);
    clearPersistedSession(); // Clear localStorage when leaving
    navigate('/', { replace: true });
  };

  const copySessionCode = () => {
    if (session?.code) {
      navigator.clipboard.writeText(session.code);
      // TODO: Show toast notification
    }
  };

  const copySessionLink = () => {
    const link = `${window.location.origin}/?join=${session?.code}`;
    navigator.clipboard.writeText(link);
    // TODO: Show toast notification
  };

  // Story and voting handlers
  const handleAddStory = (title: string, description?: string) => {
    if (session) {
      addStory(session.id, title, description);
    }
  };

  const handleStartVoting = (storyId: string) => {
    if (session) {
      startVoting(session.id, storyId);
    }
  };

  const handleSubmitVote = (storyId: string, vote: EstimationValue) => {
    if (session) {
      submitVote(session.id, storyId, vote);
    }
  };

  const handleRevealVotes = (storyId: string) => {
    if (session) {
      revealVotes(session.id, storyId);
    }
  };

  const handleFinalizeEstimate = (storyId: string, estimate: EstimationValue) => {
    if (session) {
      setFinalEstimate(session.id, storyId, estimate);
    }
  };

  const handleRevoteStory = (storyId: string) => {
    if (session) {
      revoteStory(session.id, storyId);
    }
  };

  const handleTransferFacilitator = (newFacilitatorId: string) => {
    const participant = session?.participants.find(p => p.id === newFacilitatorId);
    if (participant) {
      setPendingTransfer({ participantId: newFacilitatorId, participantName: participant.name });
    }
  };

  const confirmTransferFacilitator = () => {
    if (pendingTransfer) {
      transferFacilitator(pendingTransfer.participantId);
      setPendingTransfer(null);
    }
  };

  const cancelTransferFacilitator = () => {
    setPendingTransfer(null);
  };

  const handleVolunteerFacilitator = () => {
    requestFacilitator();
    clearFacilitatorDisconnected();
  };

  const handleDismissVolunteerModal = () => {
    clearFacilitatorDisconnected();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading session...</p>
        </div>
      </div>
    );
  }

  if (!session || !currentParticipant) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Session not found</p>
          <button 
            onClick={() => navigate('/')} 
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  const getConnectionStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return 'bg-green-500';
      case 'connecting': 
      case 'reconnecting': return 'bg-yellow-500';
      default: return 'bg-red-500';
    }
  };

  const getConnectionStatusText = () => {
    switch (connectionStatus) {
      case 'connected': return 'Connected';
      case 'connecting': return 'Connecting...';
      case 'reconnecting': return 'Reconnecting...';
      default: return 'Disconnected';
    }
  };

  const onlineParticipants = session.participants.filter(p => p.isOnline);
  const offlineParticipants = session.participants.filter(p => !p.isOnline);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-semibold text-gray-900">
                {session.title}
              </h1>
              <div className="flex items-center space-x-2">
                <span className="bg-gray-100 text-gray-800 px-2.5 py-0.5 text-xs font-medium rounded-full">
                  Code: {session.code}
                </span>
                <button
                  onClick={copySessionCode}
                  className="text-xs text-blue-600 hover:text-blue-800"
                >
                  Copy
                </button>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${getConnectionStatusColor()}`} />
                <span className="text-sm text-gray-600">
                  {getConnectionStatusText()}
                </span>
              </div>
              <button
                onClick={handleLeaveSession}
                className="border border-gray-300 text-gray-700 hover:bg-gray-50 px-4 py-2 rounded-md transition-colors text-sm"
              >
                Leave Session
              </button>
            </div>
          </div>
        </div>
      </header>

      {error && (
        <div className="bg-red-50 border-b border-red-200 px-4 py-3">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <p className="text-red-800 text-sm">{error}</p>
            <button 
              onClick={clearError}
              className="text-red-600 hover:text-red-800 text-xs"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Participants & Summary */}
          <div className="lg:col-span-1 space-y-6">
            {/* Session Summary */}
            <SessionSummary session={session} />
            
            {/* Participants */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">
                  Participants ({session.participants.length})
                </h2>
                <button
                  onClick={copySessionLink}
                  className="text-xs text-blue-600 hover:text-blue-800"
                >
                  Invite Link
                </button>
              </div>
              
              <div className="space-y-3">
                {/* Online Participants */}
                {onlineParticipants.map(participant => (
                  <div
                    key={participant.id}
                    className={`flex items-center justify-between p-3 rounded-lg ${
                      participant.id === currentParticipant.id 
                        ? 'bg-blue-50 border border-blue-200' 
                        : 'bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-2 bg-green-500 rounded-full" />
                      <span className="text-sm font-medium text-gray-900">
                        {participant.name}
                        {participant.id === currentParticipant.id && ' (You)'}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      {participant.role === 'facilitator' && (
                        <span className="bg-blue-100 text-blue-800 px-2.5 py-0.5 text-xs font-medium rounded-full">Facilitator</span>
                      )}
                      {/* Show "Make Facilitator" button for members if current user is facilitator */}
                      {participant.role === 'member' && 
                       currentParticipant.role === 'facilitator' && 
                       participant.id !== currentParticipant.id && (
                        <button
                          onClick={() => handleTransferFacilitator(participant.id)}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 text-xs font-medium rounded transition-colors"
                        >
                          Make Facilitator
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                {/* Offline Participants */}
                {offlineParticipants.map(participant => (
                  <div
                    key={participant.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-gray-100 opacity-60"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-2 bg-gray-400 rounded-full" />
                      <span className="text-sm text-gray-600">
                        {participant.name}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500">Offline</span>
                  </div>
                ))}
              </div>

              {session.participants.length === 1 && (
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-yellow-800 text-sm">
                    Share the session code <strong>{session.code}</strong> with your team members to get started.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2">
            <div className="space-y-6">
              {/* Voting Interface */}
              <VotingInterface
                session={session}
                currentParticipant={currentParticipant}
                onSubmitVote={handleSubmitVote}
              />

              {/* Story Manager */}
              <StoryManager
                session={session}
                currentParticipant={currentParticipant}
                onAddStory={handleAddStory}
                onStartVoting={handleStartVoting}
                onRevealVotes={handleRevealVotes}
                onFinalizeEstimate={handleFinalizeEstimate}
                onRevoteStory={handleRevoteStory}
              />
            </div>
          </div>
        </div>
      </main>

      {/* Facilitator Transfer Confirmation Modal */}
      {pendingTransfer && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
          <div className="relative p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3 text-center">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Transfer Facilitator Role
              </h3>
              <p className="text-sm text-gray-500 mb-6">
                Are you sure you want to transfer your facilitator role to{' '}
                <span className="font-medium text-gray-900">{pendingTransfer.participantName}</span>?
              </p>
              <p className="text-xs text-gray-400 mb-6">
                You will become a regular member and will no longer be able to manage stories or control voting.
              </p>
              <div className="flex justify-center space-x-3">
                <button
                  onClick={cancelTransferFacilitator}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmTransferFacilitator}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  Transfer Role
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Volunteer Facilitator Modal */}
      {facilitatorDisconnected && currentParticipant?.role === 'member' && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
          <div className="relative p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3 text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100 mb-4">
                <svg
                  className="h-6 w-6 text-yellow-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Facilitator Disconnected
              </h3>
              <p className="text-sm text-gray-500 mb-2">
                <span className="font-medium text-gray-900">{facilitatorDisconnected.facilitatorName}</span> has disconnected from the session.
              </p>
              <p className="text-sm text-gray-500 mb-6">
                Would you like to volunteer to become the new facilitator?
              </p>
              <div className="flex justify-center space-x-3">
                <button
                  onClick={handleDismissVolunteerModal}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
                >
                  No, Wait
                </button>
                <button
                  onClick={handleVolunteerFacilitator}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  Yes, Volunteer
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-4">
                As facilitator, you'll be able to manage stories, start voting, and control the session flow.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SessionPage;