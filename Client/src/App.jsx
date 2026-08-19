import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, NavLink, Navigate } from 'react-router-dom';
import EventExplorer from './pages/EventExplorer';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Register from './pages/Register';
import CreateProfile from './pages/CreateProfile';
import ProfileSettings from './pages/ProfileSettings';
import PulseDivider from './components/PulseDivider';
import './App.css';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return localStorage.getItem('isLoggedIn') === 'true';
  });

  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('currentUser');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const handleLogin = (userData) => {
    const baseObj = userData || {
      name: 'Logged In User',
      email: 'user@example.com',
      city: 'San Francisco',
      role: 'Event Host & Attendee'
    };
    const userObj = {
      ...baseObj,
      id: baseObj.id || baseObj.email || `user-${Date.now()}`
    };
    
    setIsLoggedIn(true);
    setCurrentUser(userObj);
    localStorage.setItem('isLoggedIn', 'true');
    localStorage.setItem('currentUser', JSON.stringify(userObj));
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setCurrentUser(null);
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('currentUser');
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

            <NavLink to="/events" className="nav-link nav-btn">
              + Host Event
            </NavLink>
          </div>
        </nav>

        <div className="navbar-pulse-line">
          <PulseDivider />
        </div>

        <main className="main-content">
          <Routes>
            <Route path="/" element={<Navigate to="/events" replace />} />
            <Route path="/events" element={<EventExplorer currentUser={currentUser} />} />
            
            {/* Dashboard is protected and displays dynamic user details */}
            <Route
              path="/dashboard"
              element={isLoggedIn ? <Dashboard currentUser={currentUser} /> : <Navigate to="/login" replace />}
            />
            
            <Route path="/login" element={<Login onLogin={handleLogin} />} />
            <Route path="/register" element={<Register />} />
            <Route path="/profile" element={isLoggedIn ? <ProfileSettings currentUser={currentUser} onLogin={handleLogin} onLogout={handleLogout} /> : <Navigate to="/login" replace />} />
            <Route path="/create-profile" element={<CreateProfile onLogin={handleLogin} />} />
          </Routes>
        </main>

        <footer className="app-footer">
          <PulseDivider className="footer-pulse-line" />
          <p>© 2026 City Pulse Platform. Built with <span>♥</span> for City Event Organisers & Attendees.</p>
        </footer>
      </div>
    </Router>
  );
}

export default App;
