import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import Aurora from '../components/Aurora';
import TextType from '../components/TextType';
import { API_BASE_URL } from '../config/api';

export default function Register() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (formData.password.length < 8) {
      setErrorMsg('Password must be at least 8 characters long!');
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setErrorMsg('Passwords do not match!');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMsg(data.message || 'Registration failed. Please try again.');
        setIsSubmitting(false);
        return;
      }

      // Keep only non-sensitive profile details in browser storage.
      localStorage.setItem('tempUser', JSON.stringify(data.data));
      localStorage.setItem('currentUser', JSON.stringify(data.data));
      navigate('/create-profile', { state: { ...data.data, from: location.state?.from } });
    } catch (err) {
      setErrorMsg('Unable to reach the City Pulse server. Your account was not created. Please try again.');
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
            text={["Register", "Create Account", "Join Us Today"]}
            typingSpeed={75}
            pauseDuration={1500}
            showCursor={true}
            cursorCharacter="|"
          />

          {errorMsg && (
            <div style={{ padding: '0.75rem', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', borderRadius: '8px', color: '#fca5a5', fontSize: '0.9rem', marginBottom: '1rem', textAlign: 'center' }}>
              ⚠️ {errorMsg}
            </div>
          )}
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="name">Full Name</label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Enter your full name"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Enter your email"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Password (Minimum 8 characters)</label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Create a password (min 8 chars)"
                minLength={8}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Confirm your password"
                minLength={8}
                required
              />
            </div>

            <button type="submit" className="submit-btn">
              Register
            </button>
          </form>

          <p className="auth-link">
            Already have an account? <Link to="/login">Login here</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
