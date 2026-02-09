import { TwitterApi } from 'twitter-api-v2';
import { query } from '../db/index.js';

// Create OAuth2 client for user authentication
export function createOAuth2Client() {
  return new TwitterApi({
    clientId: process.env.X_CLIENT_ID,
    clientSecret: process.env.X_CLIENT_SECRET,
  });
}

// Create authenticated client for a specific user
export async function createUserClient(userId) {
  const result = await query(
    'SELECT access_token, refresh_token, token_expires_at FROM users WHERE id = $1',
    [userId]
  );

  if (result.rows.length === 0) {
    throw new Error('User not found');
  }

  const { access_token, refresh_token, token_expires_at } = result.rows[0];

  // Check if token needs refresh
  const now = new Date();
  const expiresAt = new Date(token_expires_at);

  if (expiresAt <= now) {
    // Token expired, refresh it
    const oauth2Client = createOAuth2Client();
    const { accessToken, refreshToken, expiresIn } = await oauth2Client.refreshOAuth2Token(refresh_token);

    const newExpiresAt = new Date(Date.now() + expiresIn * 1000);

    await query(
      'UPDATE users SET access_token = $1, refresh_token = $2, token_expires_at = $3, updated_at = NOW() WHERE id = $4',
      [accessToken, refreshToken, newExpiresAt, userId]
    );

    return new TwitterApi(accessToken);
  }

  return new TwitterApi(access_token);
}

// Create app-only client using bearer token
export function createAppClient() {
  return new TwitterApi(process.env.X_BEARER_TOKEN);
}

// OAuth scopes needed for the application
export const OAUTH_SCOPES = [
  'tweet.read',
  'tweet.moderate.write',
  'users.read',
  'offline.access'
];

// Generate OAuth2 authorization URL
export function generateAuthUrl(callbackUrl, state) {
  const client = createOAuth2Client();
  return client.generateOAuth2AuthLink(callbackUrl, {
    scope: OAUTH_SCOPES,
    state,
  });
}

// Exchange authorization code for tokens
export async function exchangeCodeForTokens(code, codeVerifier, callbackUrl) {
  const client = createOAuth2Client();
  return client.loginWithOAuth2({
    code,
    codeVerifier,
    redirectUri: callbackUrl,
  });
}
