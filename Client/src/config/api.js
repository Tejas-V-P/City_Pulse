// Centralized API configuration and authentication helpers for City Pulse
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

/**
 * Retrieve the saved auth token from localStorage
 */
export const getAuthToken = () => {
  try {
    const directToken = localStorage.getItem('token');
    if (directToken) return directToken;
    const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
    return user.token || '';
  } catch {
    return '';
  }
};

/**
 * Persist the auth token in localStorage
 */
export const setAuthToken = (token) => {
  if (token) {
    localStorage.setItem('token', token);
  } else {
    localStorage.removeItem('token');
  }
};

/**
 * Remove the auth token from localStorage
 */
export const removeAuthToken = () => {
  localStorage.removeItem('token');
};

/**
 * Return HTTP headers with Content-Type and Bearer authorization
 */
export const getAuthHeaders = (extraHeaders = {}) => {
  const token = getAuthToken();
  const headers = {
    'Content-Type': 'application/json',
    ...extraHeaders
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};
