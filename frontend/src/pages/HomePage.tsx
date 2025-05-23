import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const HomePage = () => {
  const [sessionCode, setSessionCode] = useState('');
  const [participantName, setParticipantName] = useState('');
  const navigate = useNavigate();

  const handleCreateSession = () => {
    // TODO: Implement session creation
    console.log('Creating session...');
    navigate('/session/demo-session');
  };

  const handleJoinSession = () => {
    // TODO: Implement session joining
    console.log('Joining session:', sessionCode, 'as', participantName);
    navigate(`/session/${sessionCode.toLowerCase()}`);
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

        <div className="space-y-6">
          {/* Create Session */}
          <div className="card">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Create New Session
            </h2>
            <button
              onClick={handleCreateSession}
              className="btn-primary w-full"
            >
              Create Session
            </button>
          </div>

          {/* Join Session */}
          <div className="card">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Join Existing Session
            </h2>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Session Code (e.g., ABC123)"
                value={sessionCode}
                onChange={(e) => setSessionCode(e.target.value.toUpperCase())}
                className="input"
                maxLength={6}
              />
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
                disabled={!sessionCode || !participantName}
                className="btn-primary w-full"
              >
                Join Session
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