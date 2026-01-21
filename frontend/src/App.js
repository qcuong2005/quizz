import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import Home from './components/home/Home';
import QuizGame from './components/quiz/QuizGame';
import Leaderboard from './components/leaderboard/Leaderboard';
import Friends from './components/friends/Friends';
import RoomLobby from './components/room/RoomLobby';
import RoomWaiting from './components/room/RoomWaiting';
import SpectatorView from './components/quiz/SpectatorView';
import ForumHome from './components/forum/ForumHome';
import CreatePost from './components/forum/CreatePost';
import ForumPostDetail from './components/forum/ForumPostDetail';
import { ChatProvider } from './context/ChatContext';
import ChatWindow from './components/chat/ChatWindow';
import './styles/GlobalStyles.css';
import './App.css';

function App() {
  return (
    <ChatProvider>
      <Router>
        <div className="App">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/quiz" element={<QuizGame />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
            <Route path="/friends" element={<Friends />} />
            <Route path="/room" element={<RoomLobby />} />
            <Route path="/room/:roomId" element={<RoomWaiting />} />
            <Route path="/room/:roomId/spectate" element={<SpectatorView />} />

            {/* Forum Routes */}
            <Route path="/forum" element={<ForumHome />} />
            <Route path="/forum/new" element={<CreatePost />} />
            <Route path="/forum/post/:id" element={<ForumPostDetail />} />
          </Routes>
          <ChatWindow />
        </div>
      </Router>
    </ChatProvider>
  );
}

export default App;
