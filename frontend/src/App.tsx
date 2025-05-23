import { Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import SessionPage from './pages/SessionPage';
import NotFoundPage from './pages/NotFoundPage';

function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/session/:sessionId" element={<SessionPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </div>
  );
}

export default App;