import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Aurora from '../components/Aurora';
import TextType from '../components/TextType';
import { API_BASE_URL, apiFetch } from '../config/api';

export default function ProfileSettings({ currentUser, onLogin, onLogout }) {
  const activeUser = currentUser || {};

  const [username, setUsername] = useState(activeUser.name || '');
  const [email, setEmail] = useState(activeUser.email || '');
  const [password, setPassword] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [bio, setBio] = useState(activeUser.bio || '');
  const [occupation, setOccupation] = useState(activeUser.occupation || 'Student');
  const [location, setLocation] = useState(activeUser.city || 'San Francisco');
  const [photoPreview, setPhotoPreview] = useState(activeUser.avatar || null);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file && file.size > 180 * 1024) { setErrorMsg('Profile images must be 180 KB or smaller.'); return; }
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSuccessMsg('');
    setErrorMsg('');

    if (password && password.length < 12) {
      setErrorMsg('Password must be at least 12 characters long!');
      return;
    }

    const userId = activeUser.id;
    const payload = {
      name: username.trim() || 'User',
      email: email.trim(),
      city: location || 'San Francisco',
      bio: bio,
      occupation: occupation,
      avatar: photoPreview || activeUser.avatar || '',
      currentPassword
    };

    if (password) {
      payload.password = password;
      payload.currentPassword = currentPassword;
    }

    setIsSubmitting(true);

    try {
      const res = await apiFetch(`${API_BASE_URL}/api/auth/profile/${encodeURIComponent(userId)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMsg(data.message || 'Profile update failed.');
        return;
      }
      if (onLogin) onLogin(data.data);
      setSuccessMsg('Profile updated successfully.');
      setPassword('');
      setCurrentPassword('');
      setTimeout(() => navigate('/dashboard'), 800);
    } catch {
      setErrorMsg('Unable to reach the City Pulse server. Your profile was not changed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogoutClick = () => {
    if (onLogout) onLogout();
    navigate('/login');
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
        <div className="auth-card profile-setup-card">
          <TextType
            as="h1"
            text={["My Profile Settings", "Edit Account Details", "Update Password"]}
            typingSpeed={75}
            pauseDuration={1500}
            showCursor={true}
            cursorCharacter="|"
          />

          {successMsg && (
            <div style={{ padding: '0.75rem', background: 'rgba(34, 197, 94, 0.15)', border: '1px solid #22c55e', borderRadius: '8px', color: '#86efac', fontSize: '0.9rem', marginBottom: '1rem', textAlign: 'center' }}>
              ✅ {successMsg}
            </div>
          )}

          {errorMsg && (
            <div style={{ padding: '0.75rem', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', borderRadius: '8px', color: '#fca5a5', fontSize: '0.9rem', marginBottom: '1rem', textAlign: 'center' }}>
              ⚠️ {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Profile Photo Upload */}
            <div className="form-group photo-upload-group">
              <label>Profile Photo</label>
              <div className="photo-upload-container">
                <label htmlFor="photoInput" className="photo-upload-label">
                  {photoPreview ? (
                    <img src={photoPreview} alt="Profile Preview" className="photo-preview-img" />
                  ) : (
                    <div className="photo-placeholder">
                      <span className="photo-icon">📷</span>
                      <span className="photo-text">Add Photo</span>
                    </div>
                  )}
                </label>
                <input
                  type="file"
                  id="photoInput"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  className="photo-file-input"
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="username">Full Name / Username</label>
              <input
                type="text"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Your full name"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Your email address"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="currentPassword">Current Password (required to change email or password)</label>
              <input type="password" id="currentPassword" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} autoComplete="current-password" />
            </div>

            <div className="form-group">
              <label htmlFor="password">Change Password (Optional, min 12 chars)</label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter new password (leave blank to keep current)"
                minLength={12}
              />
            </div>

            <div className="form-group">
              <label htmlFor="occupation">I am a...</label>
              <select
                id="occupation"
                value={occupation}
                onChange={(e) => setOccupation(e.target.value)}
                className="role-select"
              >
                <option value="Student">Student</option>
                <option value="Worker">Worker / Employee</option>
                <option value="Freelancer">Freelancer</option>
                <option value="Business Owner">Business Owner</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="location">City Location</label>
              <input
                type="text"
                id="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. San Francisco, New York, London"
              />
            </div>

            <div className="form-group">
              <label htmlFor="bio">Bio</label>
              <textarea
                id="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell us a little bit about yourself..."
                rows={3}
              />
            </div>

            <button type="submit" className="submit-btn" disabled={isSubmitting}>
              {isSubmitting ? 'Saving Settings...' : '💾 Save Profile Settings'}
            </button>

            {onLogout && (
              <button
                type="button"
                onClick={handleLogoutClick}
                className="btn-logout-secondary"
                style={{
                  marginTop: '1rem',
                  width: '100%',
                  background: 'rgba(239, 68, 68, 0.15)',
                  color: '#fca5a5',
                  border: '1px solid #ef4444',
                  padding: '0.75rem',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  fontWeight: 600,
                  transition: 'all 0.2s ease'
                }}
              >
                🚪 Logout of Account
              </button>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
