import { verifyToken, signToken } from '../utils/jwt.js';

export const generateToken = signToken;

/**
 * Middleware: Enforce JWT Authentication on protected endpoints
 */
export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'] || req.headers['x-access-token'];
  let token = null;

  if (authHeader) {
    if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1]?.trim();
    } else if (typeof authHeader === 'string') {
      token = authHeader.trim();
    }
  }

  if (!token) {
    return res.status(401).json({
      status: 401,
      success: false,
      error: 'Unauthorized',
      message: 'Access Denied: No authentication token provided. Please log in to proceed.'
    });
  }

  try {
    const decoded = verifyToken(token);
    req.user = decoded;
    next();
  } catch (err) {
    const isExpired = err.name === 'TokenExpiredError';
    return res.status(401).json({
      status: 401,
      success: false,
      error: 'Unauthorized',
      message: isExpired
        ? 'Session expired. Please log in again to renew your session.'
        : 'Invalid or forged authentication token. Access denied.'
    });
  }
};

export const requireAuth = authenticateToken;

/**
 * Middleware: Optional authentication (attaches user if token is valid, allows guest otherwise)
 */
export const optionalAuthenticate = (req, res, next) => {
  const authHeader = req.headers['authorization'] || req.headers['x-access-token'];
  let token = null;

  if (authHeader) {
    if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1]?.trim();
    } else if (typeof authHeader === 'string') {
      token = authHeader.trim();
    }
  }

  if (token) {
    try {
      const decoded = verifyToken(token);
      req.user = decoded;
    } catch {
      req.user = null;
    }
  } else {
    req.user = null;
  }
  next();
};

/**
 * Middleware: Role-Based Access Control (Admin Only)
 */
export const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      status: 401,
      success: false,
      error: 'Unauthorized',
      message: 'Authentication required.'
    });
  }

  const role = String(req.user.role || '').toLowerCase();
  if (role !== 'admin') {
    return res.status(403).json({
      status: 403,
      success: false,
      error: 'Forbidden',
      message: 'Access Denied: This administrative endpoint requires Administrator privileges.'
    });
  }

  next();
};

/**
 * Middleware: Role-Based Access Control (Event Host / Organizer or Admin)
 */
export const requireOrganizerOrAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      status: 401,
      success: false,
      error: 'Unauthorized',
      message: 'Authentication required.'
    });
  }

  const role = String(req.user.role || '').toLowerCase();
  const isHost = role.includes('organizer') || role.includes('host') || role === 'admin';

  if (!isHost) {
    return res.status(403).json({
      status: 403,
      success: false,
      error: 'Forbidden',
      message: 'Access Denied: Only Event Organizers or Administrators can perform this action.'
    });
  }

  next();
};

/**
 * Middleware: Protect against Insecure Direct Object References (IDOR)
 * Verifies that the authenticated user matches the target user in params or is an admin.
 */
export const requireUserMatchOrAdmin = (paramName = 'userId') => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        status: 401,
        success: false,
        error: 'Unauthorized',
        message: 'Authentication required.'
      });
    }

    const targetUserId = String(req.params[paramName] || '').trim();
    const currentUserId = String(req.user.id || '').trim();
    const currentUserEmail = String(req.user.email || '').toLowerCase().trim();
    const isAdmin = String(req.user.role || '').toLowerCase() === 'admin';

    // Allow if admin or ID matches (or email matches ID for legacy users)
    if (isAdmin || currentUserId === targetUserId || currentUserEmail === targetUserId.toLowerCase()) {
      return next();
    }

    return res.status(403).json({
      status: 403,
      success: false,
      error: 'Forbidden',
      message: 'Access Denied: You do not have permission to view or modify another user’s account or data.'
    });
  };
};

export const requireSelfOrAdmin = requireUserMatchOrAdmin;
