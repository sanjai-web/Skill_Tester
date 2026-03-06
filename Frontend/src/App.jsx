import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import Home from './pages/Home';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import InterviewSetup from './pages/InterviewSetup';
import Results from './pages/Results';
import TermsOfService from './pages/TermsOfService';
import SEOTutorial from './pages/SEOTutorial';
import PrivacyPolicy from './pages/PrivacyPolicy';
import NotFound from './pages/NotFound';

// Lazy-load the heaviest page (Monaco Editor + Speech) to reduce initial bundle
const ActiveInterview = lazy(() => import('./pages/ActiveInterview'));

const AppLayout = () => {
  const location = useLocation();
  // Hide navbar on active interview for an immersive experience and on home (has its own navbar)
  const hideNavbar = location.pathname === '/' || location.pathname.includes('/interview/active');

  return (
    <div className="app-container" style={{ display: 'flex', flexDirection: 'column', width: '100%', minHeight: '100vh', backgroundColor: 'var(--color-bg-dark)' }}>
      {!hideNavbar && <Navbar />}
      <main style={{ flex: 1, padding: hideNavbar ? '0' : '2rem' }}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/terms" element={<TermsOfService />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/seo-tutorial" element={<SEOTutorial />} />

          {/* Protected Routes */}
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/setup" element={<ProtectedRoute><InterviewSetup /></ProtectedRoute>} />
          <Route path="/interview/active" element={
            <ProtectedRoute>
              <Suspense fallback={<div style={{ textAlign: 'center', padding: '6rem', color: 'var(--color-text-muted)' }}>Loading interview...</div>}>
                <ActiveInterview />
              </Suspense>
            </ProtectedRoute>
          } />
          <Route path="/results/:id" element={<ProtectedRoute><Results /></ProtectedRoute>} />

          {/* 404 Catch-all */}
          <Route path="*" element={<NotFound />} />
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
