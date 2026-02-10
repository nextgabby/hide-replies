import crypto from 'crypto';

const WEBHOOK_ID = process.env.X_WEBHOOK_ID || '2021284043946414080';

// Get bearer token auth header
function getBearerAuth() {
  return `Bearer ${process.env.X_BEARER_TOKEN}`;
}

// Generate OAuth 1.0a signature
function generateOAuth1Signature(method, url, params, consumerSecret, tokenSecret) {
  const sortedParams = Object.keys(params).sort().map(key =>
    `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`
  ).join('&');

  const signatureBase = [
    method.toUpperCase(),
    encodeURIComponent(url),
    encodeURIComponent(sortedParams)
  ].join('&');

  const signingKey = `${encodeURIComponent(consumerSecret)}&${encodeURIComponent(tokenSecret)}`;

  const signature = crypto
    .createHmac('sha1', signingKey)
    .update(signatureBase)
    .digest('base64');

  return signature;
}

// Generate OAuth 1.0a Authorization header
function generateOAuth1Header(method, url) {
  const oauthParams = {
    oauth_consumer_key: process.env.X_API_KEY,
    oauth_nonce: crypto.randomBytes(16).toString('hex'),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: process.env.X_ACCESS_TOKEN,
    oauth_version: '1.0'
  };

  const signature = generateOAuth1Signature(
    method,
    url,
    oauthParams,
    process.env.X_API_SECRET,
    process.env.X_ACCESS_TOKEN_SECRET
  );

  oauthParams.oauth_signature = signature;

  const headerParts = Object.keys(oauthParams).sort().map(key =>
    `${encodeURIComponent(key)}="${encodeURIComponent(oauthParams[key])}"`
  ).join(', ');

  return `OAuth ${headerParts}`;
}

// List registered webhooks (v2)
export async function listWebhooks() {
  const response = await fetch('https://api.twitter.com/2/webhooks', {
    headers: { Authorization: getBearerAuth() },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(`Failed to list webhooks: ${JSON.stringify(error)}`);
  }

  return response.json();
}

// Register a new webhook (v2)
export async function registerWebhook(webhookUrl) {
  const response = await fetch('https://api.twitter.com/2/webhooks', {
    method: 'POST',
    headers: {
      Authorization: getBearerAuth(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ url: webhookUrl }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(`Failed to register webhook: ${JSON.stringify(error)}`);
  }

  return response.json();
}

// Delete a webhook (v2)
export async function deleteWebhook(webhookId) {
  const response = await fetch(`https://api.twitter.com/2/webhooks/${webhookId}`, {
    method: 'DELETE',
    headers: { Authorization: getBearerAuth() },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(`Failed to delete webhook: ${JSON.stringify(error)}`);
  }

  return { success: true };
}

// Subscribe using OAuth 1.0a (required for Account Activity API)
export async function subscribeUser() {
  const url = `https://api.twitter.com/2/webhooks/${WEBHOOK_ID}/subscriptions/all`;

  console.log('Attempting to subscribe user with OAuth 1.0a to webhook:', WEBHOOK_ID);
  console.log('Using API Key:', process.env.X_API_KEY ? 'present' : 'MISSING');
  console.log('Using Access Token:', process.env.X_ACCESS_TOKEN ? 'present' : 'MISSING');

  const authHeader = generateOAuth1Header('POST', url);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: authHeader,
    },
  });

  console.log('Subscription response status:', response.status);

  // 200/201/204 = success
  if (response.ok || response.status === 204) {
    console.log('User successfully subscribed to webhook');
    return { success: true };
  }

  const errorText = await response.text();
  console.error('Subscription failed:', response.status, errorText);

  let error;
  try {
    error = JSON.parse(errorText);
  } catch {
    error = { error: errorText || 'Unknown error' };
  }

  throw new Error(`Failed to subscribe user: ${JSON.stringify(error)}`);
}

// Check if user is subscribed using OAuth 1.0a
export async function checkSubscription() {
  const url = `https://api.twitter.com/2/webhooks/${WEBHOOK_ID}/subscriptions/all`;
  const authHeader = generateOAuth1Header('GET', url);

  const response = await fetch(url, {
    headers: { Authorization: authHeader },
  });

  return response.ok || response.status === 204;
}

// List all subscriptions
export async function listSubscriptions() {
  const url = `https://api.twitter.com/2/webhooks/${WEBHOOK_ID}/subscriptions/all`;
  const authHeader = generateOAuth1Header('GET', url);

  const response = await fetch(url, {
    headers: { Authorization: authHeader },
  });

  if (!response.ok && response.status !== 204) {
    const error = await response.json().catch(() => ({}));
    throw new Error(`Failed to list subscriptions: ${JSON.stringify(error)}`);
  }

  return response.json().catch(() => ({ subscriptions: [] }));
}
