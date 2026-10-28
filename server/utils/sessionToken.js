import { createHash, randomBytes } from 'node:crypto';

const COOKIE_NAME = 'city_pulse_session';
export const SESSION_TTL_MS = 12 * 60 * 60 * 1000;
export const createSessionToken = () => randomBytes(32).toString('base64url');
export const hashSessionToken = (token) => createHash('sha256').update(token).digest('hex');

export function setSessionCookie(res, token) {
  const production = process.env.NODE_ENV === 'production';
  const secure = production ? '; Secure' : '';
  const sameSite = production ? 'None' : 'Lax';
  res.setHeader('Set-Cookie', `${COOKIE_NAME}=${token}; HttpOnly; SameSite=${sameSite}; Path=/; Max-Age=${SESSION_TTL_MS / 1000}${secure}`);
}

export function clearSessionCookie(res) {
  const production = process.env.NODE_ENV === 'production';
  const secure = production ? '; Secure' : '';
  const sameSite = production ? 'None' : 'Lax';
  res.setHeader('Set-Cookie', `${COOKIE_NAME}=; HttpOnly; SameSite=${sameSite}; Path=/; Max-Age=0${secure}`);
}

export function getSessionCookie(req) {
  for (const part of (req.headers.cookie || '').split(';')) {
    const [name, ...value] = part.trim().split('=');
    if (name === COOKIE_NAME) return value.join("=");
  }
  return null;
}
