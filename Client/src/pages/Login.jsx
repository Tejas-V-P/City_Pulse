import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import Aurora from '../components/Aurora';
import TextType from '../components/TextType';
import { API_BASE_URL, apiFetch } from '../config/api';

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const noticeMsg = location.state?.message || '';
  const redirectTarget = location.state?.from || '/dashboard';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (password.length < 12) {
      setErrorMsg('Password must be at least 12 characters long!');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await apiFetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          password: password
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMsg(data.message || 'Login failed. Please check your credentials.');
        setIsSubmitting(false);
        return;
      }

      if (onLogin) onLogin(data.data);
      navigate(redirectTarget, { replace: true });
    } catch {
      setErrorMsg('Unable to reach the City Pulse server. Please try again when the service is available.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-page-wrapper">
      <Aurora
        colorStops={["#7cff67", "#B497CF", "#5227FF"]}
        blend={0.5}
        amplitude={1.0}
        speed={1.3}
      />
      <div className="auth-container">
        <div className="auth-card">
          <TextType
            as="h1"
            text={["Login", "Welcome Back", "Sign In"]}
            typingSpeed={75}
            pauseDuration={1500}
            showCursor={true}
            cursorCharacter="|"
          />

          {noticeMsg && (
            <div style={{
              padding: '0.85rem 1rem',
              background: 'rgba(99, 102, 241, 0.15)',
              border: '1px solid rgba(99, 102, 241, 0.4)',
              borderRadius: '8px',
              color: '#c7d2fe',
              fontSize: '0.9rem',
              marginBottom: '1rem',
              textAlign: 'center',
              lineHeight: 1.4
            }}>
              ✨ {noticeMsg}
            </div>
          )}

          {errorMsg && (
            <div style={{ padding: '0.75rem', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', borderRadius: '8px', color: '#fca5a5', fontSize: '0.9rem', marginBottom: '1rem', textAlign: 'center' }}>
              ⚠️ {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Password (Minimum 12 characters)</label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password (min 12 chars)"
                minLength={12}
                required
              />
            </div>

            <button type="submit" className="submit-btn" disabled={isSubmitting}>
              {isSubmitting ? 'Signing in...' : 'Login & Continue'}
            </button>
          </form>

          <p className="auth-link">
            Don't have an account? <Link to="/register" state={location.state}>Register here</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
