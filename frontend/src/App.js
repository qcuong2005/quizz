import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import Home from './components/home/Home';
import QuizGame from './components/quiz/QuizGame';
import Leaderboard from './components/leaderboard/Leaderboard';
import RoomLobby from './components/room/RoomLobby';
import RoomWaiting from './components/room/RoomWaiting';
import './styles/GlobalStyles.css';
import './App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/quiz" element={<QuizGame />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/room" element={<RoomLobby />} />
          <Route path="/room/:roomId" element={<RoomWaiting />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
