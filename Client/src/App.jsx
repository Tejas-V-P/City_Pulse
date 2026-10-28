import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, NavLink, Navigate } from 'react-router-dom';
import EventExplorer from './pages/EventExplorer';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Register from './pages/Register';
import CreateProfile from './pages/CreateProfile';
import ProfileSettings from './pages/ProfileSettings';
import './App.css';
import { API_BASE_URL, apiFetch } from './config/api';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    try {
      localStorage.removeItem('currentUser');
      localStorage.removeItem('tempUser');
      localStorage.removeItem('city_pulse_registrations');
    } catch {
      // Browser storage may be disabled; the API session remains authoritative.
    }
    let active = true;
    apiFetch(`${API_BASE_URL}/api/auth/me`).then(async (response) => {
      if (!response.ok) return null;
      const payload = await response.json();
      return payload.success ? payload.data : null;
    }).then((user) => {
      if (active && user) { setCurrentUser(user); setIsLoggedIn(true); }
    }).catch(() => {}).finally(() => { if (active) setAuthReady(true); });
    return () => { active = false; };
  }, []);

  const handleLogin = (userData) => {
    if (!userData?.id) return;
    setIsLoggedIn(true);
    setCurrentUser(userData);
  };

  const handleLogout = () => {
    apiFetch(`${API_BASE_URL}/api/auth/logout`, { method: 'POST' }).catch(() => {});
    setIsLoggedIn(false);
    setCurrentUser(null);
  };

  return (
    <Router>
      <div className="app-layout">
        <nav className="navbar">
          <div className="nav-brand">
            <Link to="/events" className="nav-brand">
              <div className="nav-logo-icon">📍</div>
              <span className="nav-title">City Pulse</span>
            </Link>
          </div>

          <div className="nav-links">
            <NavLink to="/events" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              🔍 Explore Events
            </NavLink>

            {/* "My Dashboard" is hidden on cover page and visible only when logged in */}
            {isLoggedIn && (
              <NavLink to="/dashboard" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                🎟️ My Dashboard
              </NavLink>
            )}

            {!isLoggedIn ? (
              <NavLink to="/login" className="nav-link">
                Sign In
              </NavLink>
            ) : (
              <NavLink
                to="/profile"
                className={({ isActive }) => `nav-profile-btn ${isActive ? 'active' : ''}`}
                title={currentUser?.name ? `Profile (${currentUser.name})` : 'Profile Settings'}
              >
                {currentUser?.avatar ? (
                  <img src={currentUser.avatar} alt="Profile Avatar" className="nav-profile-img" />
                ) : (
                  <div className="nav-profile-circle">
                    <span className="nav-profile-emoji">👤</span>
                  </div>
                )}
              </NavLink>
            )}

            <Link
              to={isLoggedIn ? "/events?create=true" : "/login"}
              state={!isLoggedIn ? { message: 'Please sign in or create an account to organize and publish events.', from: '/events?create=true' } : undefined}
              className="nav-link nav-btn"
            >
              + Host Event
            </Link>
          </div>
        </nav>

        <main className="main-content">
          {!authReady ? <p role="status">Checking your session…</p> : <Routes>
            <Route path="/" element={<Navigate to="/events" replace />} />
            <Route path="/events" element={<EventExplorer currentUser={currentUser} isLoggedIn={isLoggedIn} />} />
            
            {/* Dashboard is protected and displays dynamic user details */}
            <Route
              path="/dashboard"
              element={isLoggedIn ? <Dashboard currentUser={currentUser} /> : <Navigate to="/login" replace />}
            />
            
            <Route path="/login" element={<Login onLogin={handleLogin} />} />
            <Route path="/register" element={<Register onLogin={handleLogin} />} />
            <Route path="/profile" element={isLoggedIn ? <ProfileSettings currentUser={currentUser} onLogin={handleLogin} onLogout={handleLogout} /> : <Navigate to="/login" replace />} />
            <Route path="/create-profile" element={<CreateProfile onLogin={handleLogin} />} />
          </Routes>}
        </main>

        <footer className="app-footer">
          <p>© 2026 City Pulse Platform. Built with <span>♥</span> for City Event Organisers & Attendees.</p>
        </footer>
      </div>
    </Router>
  );
}

export default App;
