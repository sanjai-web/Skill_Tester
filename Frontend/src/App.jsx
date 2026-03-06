import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import Home from './pages/Home';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import InterviewSetup from './pages/InterviewSetup';
import ActiveInterview from './pages/ActiveInterview';
import Results from './pages/Results';
import TermsOfService from './pages/TermsOfService';

const AppLayout = () => {
  const location = useLocation();
  // Hide navbar on active interview for an immersive experience
  const hideNavbar = location.pathname.includes('/interview/active');

  return (
    <div className="app-container" style={{ display: 'flex', flexDirection: 'column', width: '100%', minHeight: '100vh', backgroundColor: 'var(--color-bg-dark)' }}>
      {!hideNavbar && <Navbar />}
      <main style={{ flex: 1, padding: hideNavbar ? '0' : '2rem' }}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/terms" element={<TermsOfService />} />

          {/* Protected Routes */}
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/setup" element={<ProtectedRoute><InterviewSetup /></ProtectedRoute>} />
          <Route path="/interview/active" element={<ProtectedRoute><ActiveInterview /></ProtectedRoute>} />
          <Route path="/results/:id" element={<ProtectedRoute><Results /></ProtectedRoute>} />
        </Routes>
      </main>
    </div>
  );
};

function App() {
  return (
    <Router>
      <AppLayout />
    </Router>
  );
}

export default App;
