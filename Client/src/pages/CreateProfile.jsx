import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Aurora from '../components/Aurora';
import TextType from '../components/TextType';
import { API_BASE_URL } from '../config/api';

export default function CreateProfile({ onLogin }) {
  const locationState = useLocation().state || {};
  const tempUser = (() => {
    try {
      return JSON.parse(localStorage.getItem('tempUser')) || {};
    } catch {
      return {};
    }
  })();

  const [username, setUsername] = useState(tempUser.name || locationState.name || '');
  const [bio, setBio] = useState(tempUser.bio || '');
  const [occupation, setOccupation] = useState(tempUser.occupation || 'Student');
  const [location, setLocation] = useState(tempUser.city || 'San Francisco');
  const [photoPreview, setPhotoPreview] = useState(tempUser.avatar || null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
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
    setIsSubmitting(true);

    const baseUser = tempUser.name ? tempUser : (locationState.name ? locationState : {});
    const userData = {
      ...baseUser,
      id: baseUser.id || baseUser._id || `user-${Date.now()}`,
      name: username.trim() || baseUser.name || 'User',
      email: baseUser.email || 'user@example.com',
      city: location || 'San Francisco',
      bio: bio,
      occupation: occupation,
      role: 'Event Host & Attendee',
      avatar: photoPreview || null
    };

    // Update in database if userId exists
    if (userData.id && userData.id !== 'user-1' && !userData.id.startsWith('user-')) {
      try {
        await fetch(`${API_BASE_URL}/api/auth/profile/${encodeURIComponent(userData.id)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: userData.name,
            city: userData.city,
            bio: userData.bio,
            occupation: userData.occupation,
            avatar: userData.avatar
          })
        });
      } catch {
        // ignore
      }
    }

    if (onLogin) onLogin(userData);
    setIsSubmitting(false);
    navigate('/dashboard');
  };

  return (
    <div className="auth-page-wrapper">
      <Aurora
        colorStops={["#ffb020", "#4de8d0", "#0a0c12"]}
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
