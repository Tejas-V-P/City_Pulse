// Central place for the backend API base URL.
// In development it falls back to localhost:5000 (the default Express port).
// In production, set VITE_API_URL in your deployment environment (e.g. Vercel
// project settings) to your deployed backend's URL, e.g.
// https://city-pulse-api.onrender.com
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
