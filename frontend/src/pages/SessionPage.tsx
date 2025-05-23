import { useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';

const SessionPage = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // TODO: Connect to session via Socket.IO
    console.log('Connecting to session:', sessionId);
    setIsConnected(true);
    
    return () => {
      // TODO: Cleanup connection
      console.log('Disconnecting from session');
    };
  }, [sessionId]);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">
                Planning Poker
              </h1>
              <span className="ml-4 badge-secondary">
                Session: {sessionId}
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center">
                <div className={`w-2 h-2 rounded-full mr-2 ${
                  isConnected ? 'bg-success-500' : 'bg-error-500'
                }`} />
                <span className="text-sm text-gray-600">
                  {isConnected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Participants */}
          <div className="lg:col-span-1">
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Participants
              </h2>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <span className="text-sm font-medium">Demo User</span>
                  <span className="badge-success">Facilitator</span>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2">
            <div className="space-y-6">
              {/* Current Story */}
              <div className="card">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Current Story
                </h2>
                <div className="text-center py-8">
                  <p className="text-gray-500">
                    No story is currently being estimated
                  </p>
                  <button className="btn-primary mt-4">
                    Add Story
                  </button>
                </div>
              </div>

              {/* Voting Cards */}
              <div className="card">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Estimation Cards
                </h2>
                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-9 gap-3">
                  {[1, 2, 3, 5, 8, 13, 21, '?', '∞'].map((value) => (
                    <button
                      key={value}
                      className="aspect-[3/4] flex items-center justify-center text-lg font-semibold border-2 border-gray-300 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-colors"
                    >
                      {value}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default SessionPage;