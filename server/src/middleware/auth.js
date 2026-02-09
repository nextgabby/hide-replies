import jwt from 'jsonwebtoken';
import { query } from '../db/index.js';

export function authMiddleware(req, res, next) {
  const token = req.cookies.token || req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    req.xUserId = decoded.xUserId;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

export function generateToken(userId, xUserId) {
  return jwt.sign(
    { userId, xUserId },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

export async function getUserFromToken(token) {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const result = await query('SELECT * FROM users WHERE id = $1', [decoded.userId]);
    return result.rows[0] || null;
  } catch {
    return null;
  }
}
