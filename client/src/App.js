import React from 'react';
import { ChakraProvider, CSSReset } from '@chakra-ui/react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './components/Home';
import Room from './components/Room';

function App() {
  return (
    <ChakraProvider>
      <CSSReset />
      <Router>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/room/:roomId" element={<Room />} />
        </Routes>
      </Router>
    </ChakraProvider>
  );
}

export default App;
