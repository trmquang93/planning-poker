import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Lobby from './components/Lobby';
import GameRoom from './components/GameRoom';
import './App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<Lobby />} />
          <Route path="/session/:sessionId" element={<GameRoom />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
