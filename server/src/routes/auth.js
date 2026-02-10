import { Router } from 'express';
import crypto from 'crypto';
import { query } from '../db/index.js';
import { generateAuthUrl, exchangeCodeForTokens } from '../services/twitter.js';
import { generateToken, authMiddleware } from '../middleware/auth.js';
import { subscribeUser } from '../services/webhookSetup.js';

const router = Router();

// Store for OAuth state and code verifiers (in production, use Redis)
const oauthStore = new Map();

// Initiate OAuth flow
router.get('/login', (req, res) => {
  const state = crypto.randomBytes(32).toString('hex');

  const callbackUrl = `${process.env.BACKEND_URL}/api/auth/callback`;

  const { url, codeVerifier } = generateAuthUrl(callbackUrl, state);

  // Store state and verifier for callback (use the verifier returned by the library)
  oauthStore.set(state, { codeVerifier, createdAt: Date.now() });

  // Clean up old entries (older than 10 minutes)
  for (const [key, value] of oauthStore.entries()) {
    if (Date.now() - value.createdAt > 10 * 60 * 1000) {
      oauthStore.delete(key);
    }
  }

  res.redirect(url);
});

// OAuth callback
router.get('/callback', async (req, res) => {
  const { code, state, error } = req.query;

  if (error) {
    return res.redirect(`${process.env.FRONTEND_URL}?error=${encodeURIComponent(error)}`);
  }

  if (!code || !state) {
    return res.redirect(`${process.env.FRONTEND_URL}?error=missing_params`);
  }

  const stored = oauthStore.get(state);
  if (!stored) {
    return res.redirect(`${process.env.FRONTEND_URL}?error=invalid_state`);
  }

  oauthStore.delete(state);

  try {
    const callbackUrl = `${process.env.BACKEND_URL}/api/auth/callback`;
    const { client, accessToken, refreshToken, expiresIn } = await exchangeCodeForTokens(
      code,
      stored.codeVerifier,
      callbackUrl
    );

    // Get user info from Twitter
    const { data: twitterUser } = await client.v2.me();

    const expiresAt = new Date(Date.now() + expiresIn * 1000);

    // Upsert user in database
    const result = await query(
      `INSERT INTO users (x_user_id, x_username, access_token, refresh_token, token_expires_at)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (x_user_id)
       DO UPDATE SET
         x_username = EXCLUDED.x_username,
         access_token = EXCLUDED.access_token,
         refresh_token = EXCLUDED.refresh_token,
         token_expires_at = EXCLUDED.token_expires_at,
         updated_at = NOW()
       RETURNING id`,
      [twitterUser.id, twitterUser.username, accessToken, refreshToken, expiresAt]
    );

    const userId = result.rows[0].id;

    // Subscribe user to Account Activity API for real-time webhook events
    try {
      await subscribeUser();
      console.log('User subscribed to Account Activity API');
    } catch (subError) {
      console.error('Failed to subscribe user to webhooks (non-fatal):', subError.message);
    }

    // Generate JWT
    const token = generateToken(userId, twitterUser.id);

    // Set cookie (for same-domain setups)
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // Also pass token in URL for cross-domain setups
    res.redirect(`${process.env.FRONTEND_URL}?auth=success&token=${encodeURIComponent(token)}`);
  } catch (error) {
    console.error('OAuth callback error:', error);
    res.redirect(`${process.env.FRONTEND_URL}?error=auth_failed`);
  }
});

// Get current user
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const result = await query(
      'SELECT id, x_user_id, x_username, monitoring_enabled, created_at FROM users WHERE id = $1',
      [req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user: result.rows[0] });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Logout
router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ success: true });
});

export default router;
