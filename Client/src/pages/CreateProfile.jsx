import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Aurora from '../components/Aurora';
import TextType from '../components/TextType';
import { API_BASE_URL, apiFetch } from '../config/api';

export default function CreateProfile({ onLogin }) {
  const locationState = useLocation().state || {};
  const tempUser = locationState;

  const [username, setUsername] = useState(tempUser.name || locationState.name || '');
  const [bio, setBio] = useState(tempUser.bio || '');
  const [occupation, setOccupation] = useState(tempUser.occupation || 'Student');
  const [location, setLocation] = useState(tempUser.city || 'San Francisco');
  const [photoPreview, setPhotoPreview] = useState(tempUser.avatar || null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
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
    setErrorMsg('');
    const baseUser = tempUser.id ? tempUser : locationState;
    if (!baseUser?.id) { setErrorMsg('Your account session is missing. Please sign in again.'); return; }
    setIsSubmitting(true);
    try {
      const res = await apiFetch(`${API_BASE_URL}/api/auth/profile/${encodeURIComponent(baseUser.id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: username.trim(), city: location.trim(), bio, occupation, avatar: photoPreview || ''
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Profile could not be saved.');
      if (onLogin) onLogin(data.data);
      const redirectTarget = locationState?.from || '/dashboard';
      navigate(redirectTarget, { replace: true });
    } catch (err) {
      setErrorMsg(err.message || 'Unable to reach the City Pulse server.');
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
        <div className="auth-card profile-setup-card">
          <TextType
            as="h1"
            text={["Create Profile", "Setup Account", "Almost There"]}
            typingSpeed={75}
            pauseDuration={1500}
            showCursor={true}
            cursorCharacter="|"
          />

          {errorMsg && <div role="alert" className="form-error">{errorMsg}</div>}
          <form onSubmit={handleSubmit}>
            {/* Profile Photo Upload (Optional) */}
            <div className="form-group photo-upload-group">
              <label>Profile Photo (Optional)</label>
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
              {isSubmitting ? 'Saving Profile...' : '🚀 Complete Setup & Open Dashboard'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
