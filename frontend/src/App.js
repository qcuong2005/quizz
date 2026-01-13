import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import './App.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/" element={<Home />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

const Home = () => {
  return (
    <div className="App">
      <header className="App-header">
        <h1>Welcome to Tet Quiz App</h1>
        <div style={{ marginTop: '20px' }}>
          <a href="/login" style={{ color: 'white', marginRight: '20px' }}>Login</a>
          <a href="/register" style={{ color: 'white' }}>Register</a>
        </div>
      </header>
    </div>
  );
};

export default App;
