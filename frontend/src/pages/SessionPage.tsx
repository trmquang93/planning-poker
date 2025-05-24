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
  
  const {
    session,
    currentParticipant,
    connectionStatus,
    error,
    setSession,
    setCurrentParticipant,
    setError,
    clearError,
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
    revoteStory
  } = useSocket();

  // Initialize session data
  useEffect(() => {
    const initializeSession = async () => {
      try {
        setIsLoading(true);
        clearError();
        
        const state = location.state as LocationState;
        
        if (state?.session && state?.participantId) {
          // We have session data from navigation
          console.log('Setting session from navigation state:', state.session);
          console.log('Participant ID:', state.participantId);
          setSession(state.session);
          
          const participant = state.session.participants.find(p => p.id === state.participantId);
          console.log('Found participant:', participant);
          if (participant) {
            setCurrentParticipant(participant);
          } else {
            console.error('Participant not found in session');
            setError('Participant not found in session');
          }
        } else if (sessionId) {
          // Fetch session data from API
          const response = await apiService.getSession(sessionId);
          setSession(response.session);
          
          // If no participant data, redirect to home
          if (!state?.participantId) {
            navigate('/', { replace: true });
            return;
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
  }, [sessionId, location.state, navigate, setSession, setCurrentParticipant, setError, clearError]);

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
    </div>
  );
};

export default SessionPage;