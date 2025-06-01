import { useEffect, useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import SessionPage from './pages/SessionPage';
import NotFoundPage from './pages/NotFoundPage';
import { apiService } from './services/apiService';
import { keepAliveService } from './services/keepAliveService';

function App() {
  const [isWarmingUp, setIsWarmingUp] = useState(true);
  const [warmupFailed, setWarmupFailed] = useState(false);

  useEffect(() => {
    // Skip warmup in test environment
    if (typeof global !== 'undefined' && (global as any).__TEST_DISABLE_WARMUP__) {
      setIsWarmingUp(false);
      return;
    }

    // Warmup the backend server when the app starts
    const warmupBackend = async () => {
      console.log('🚀 App starting - initiating backend warmup...');
      
      try {
        const success = await apiService.warmupServer();
        setWarmupFailed(!success);
        
        // Start keep-alive service after successful warmup
        if (success) {
          keepAliveService.start();
        }
      } catch (error) {
        console.error('Failed to warmup backend:', error);
        setWarmupFailed(true);
      } finally {
        setIsWarmingUp(false);
      }
    };

    warmupBackend();

    // Cleanup keep-alive service on unmount
    return () => {
      keepAliveService.stop();
    };
  }, []);

  // Show a subtle loading indicator during warmup
  if (isWarmingUp) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Starting up...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {warmupFailed && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                Server may be starting up. Initial requests might take longer than usual.
              </p>
            </div>
          </div>
        </div>
      )}
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/session/:sessionId" element={<SessionPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </div>
  );
}

export default App;