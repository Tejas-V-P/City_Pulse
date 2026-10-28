// Centralized API configuration for City Pulse.
const configuredApiUrl = import.meta.env.VITE_API_URL;
if (import.meta.env.PROD && !configuredApiUrl) {
  throw new Error('VITE_API_URL must be set to the deployed City Pulse API URL in production.');
}
export const API_BASE_URL = (configuredApiUrl || 'http://localhost:5000').replace(/[/]+$/, '');

export function apiFetch(url, options = {}) {
  return fetch(url, {
    ...options,
    credentials: 'include',
    headers: { ...(options.headers || {}) }
  });
}
