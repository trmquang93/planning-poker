import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSessionStore } from '../stores/sessionStore';
import { apiService } from '../services/apiService';

const HomePage = () => {
  const [sessionCode, setSessionCode] = useState('');
  const [participantName, setParticipantName] = useState('');
  const [facilitatorName, setFacilitatorName] = useState('');
  const [sessionTitle, setSessionTitle] = useState('');
  const [scale, setScale] = useState<'FIBONACCI' | 'T_SHIRT' | 'POWERS_OF_2'>('FIBONACCI');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isFromInviteLink, setIsFromInviteLink] = useState(false);
  
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { isCreating, isJoining, error, setIsCreating, setIsJoining, setError, clearError } = useSessionStore();

  // Handle invite link URL parameters
  useEffect(() => {
    const joinCode = searchParams.get('join');
    if (joinCode) {
      setSessionCode(joinCode.toUpperCase());
      setIsFromInviteLink(true);
      // Clear the URL parameter to clean up the address bar
      setSearchParams({});
      console.info('Auto-filled session code from invite link:', joinCode);
    }
  }, [searchParams, setSearchParams]);

  const handleCreateSession = async () => {
    if (!facilitatorName.trim() || !sessionTitle.trim()) {
      setError('Please fill in all required fields');
      return;
    }

    setIsCreating(true);
    clearError();

    try {
      const response = await apiService.createSession({
        title: sessionTitle.trim(),
        facilitatorName: facilitatorName.trim(),
        scale,
      });

      console.log('Session created:', response);
      
      // Navigate to the session page with the session data
      navigate(`/session/${response.session.id}`, {
        state: {
          session: response.session,
          participantId: response.participantId,
          isCreator: true,
        },
      });
      
      console.log('Navigating to session page');
    } catch (error) {
      console.error('Failed to create session:', error);
      setError(error instanceof Error ? error.message : 'Failed to create session');
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinSession = async () => {
    if (!sessionCode.trim() || !participantName.trim()) {
      setError('Please fill in all required fields');
      return;
    }

    setIsJoining(true);
    clearError();

    try {
      const response = await apiService.joinSession({
        sessionCode: sessionCode.trim().toUpperCase(),
        participantName: participantName.trim(),
      });

      // Navigate to the session page with the session data
      navigate(`/session/${response.session.id}`, {
        state: {
          session: response.session,
          participantId: response.participantId,
          isCreator: false,
        },
      });
    } catch (error) {
      console.error('Failed to join session:', error);
      setError(error instanceof Error ? error.message : 'Failed to join session');
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <div className="min-h-screen-safe flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Planning Poker
          </h1>
          <p className="text-lg text-gray-600">
            Real-time estimation for agile teams
          </p>
        </div>

        {error && (
          <div className="card bg-error-50 border-error-200">
            <p className="text-error-800 text-sm">{error}</p>
            <button 
              onClick={clearError}
              className="text-error-600 hover:text-error-800 text-xs mt-2"
            >
              Dismiss
            </button>
          </div>
        )}

        <div className="space-y-6">
          {/* Create Session */}
          <div className="card">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Create New Session
            </h2>
            {!showCreateForm ? (
              <button
                onClick={() => setShowCreateForm(true)}
                className="btn-primary w-full"
              >
                Create Session
              </button>
            ) : (
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Session Title (e.g., Sprint Planning)"
                  value={sessionTitle}
                  onChange={(e) => setSessionTitle(e.target.value)}
                  className="input"
                  maxLength={100}
                />
                <input
                  type="text"
                  placeholder="Your Name (Facilitator)"
                  value={facilitatorName}
                  onChange={(e) => setFacilitatorName(e.target.value)}
                  className="input"
                  maxLength={50}
                />
                <select
                  value={scale}
                  onChange={(e) => setScale(e.target.value as any)}
                  className="input"
                >
                  <option value="FIBONACCI">Fibonacci (1, 2, 3, 5, 8, 13...)</option>
                  <option value="T_SHIRT">T-Shirt (XS, S, M, L, XL...)</option>
                  <option value="POWERS_OF_2">Powers of 2 (1, 2, 4, 8, 16...)</option>
                </select>
                <div className="flex space-x-3">
                  <button
                    onClick={() => setShowCreateForm(false)}
                    className="btn-outline flex-1"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateSession}
                    disabled={isCreating || !sessionTitle.trim() || !facilitatorName.trim()}
                    className="btn-primary flex-1"
                  >
                    {isCreating ? 'Creating...' : 'Create'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Join Session */}
          <div className="card">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Join Existing Session
            </h2>
            <div className="space-y-4">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Session Code (e.g., ABC123)"
                  value={sessionCode}
                  onChange={(e) => {
                    setSessionCode(e.target.value.toUpperCase());
                    setIsFromInviteLink(false); // Clear invite link flag when manually editing
                  }}
                  className={`input ${isFromInviteLink ? 'border-green-500 bg-green-50' : ''}`}
                  maxLength={6}
                />
                {isFromInviteLink && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <span className="text-green-600 text-sm font-medium">✓ From invite link</span>
                  </div>
                )}
              </div>
              <input
                type="text"
                placeholder="Your Name"
                value={participantName}
                onChange={(e) => setParticipantName(e.target.value)}
                className="input"
                maxLength={50}
              />
              <button
                onClick={handleJoinSession}
                disabled={isJoining || !sessionCode || !participantName}
                className="btn-primary w-full"
              >
                {isJoining ? 'Joining...' : 'Join Session'}
              </button>
            </div>
          </div>
        </div>

        <div className="text-center text-sm text-gray-500">
          <p>No accounts required • Free to use</p>
        </div>
      </div>
    </div>
  );
};

export default HomePage;