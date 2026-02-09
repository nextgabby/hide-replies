import crypto from 'crypto';

const WEBHOOK_ENV = process.env.X_WEBHOOK_ENV || 'prod';

// Get the base URL for Account Activity API
function getAAApiUrl() {
  return `https://api.twitter.com/1.1/account_activity/all/${WEBHOOK_ENV}`;
}

// Get bearer token auth header
function getBearerAuth() {
  return `Bearer ${process.env.X_BEARER_TOKEN}`;
}

// List registered webhooks
export async function listWebhooks() {
  const response = await fetch(`${getAAApiUrl()}/webhooks.json`, {
    headers: { Authorization: getBearerAuth() },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to list webhooks: ${JSON.stringify(error)}`);
  }

  return response.json();
}

// Register a new webhook
export async function registerWebhook(webhookUrl) {
  const response = await fetch(
    `${getAAApiUrl()}/webhooks.json?url=${encodeURIComponent(webhookUrl)}`,
    {
      method: 'POST',
      headers: { Authorization: getBearerAuth() },
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to register webhook: ${JSON.stringify(error)}`);
  }

  return response.json();
}

// Delete a webhook
export async function deleteWebhook(webhookId) {
  const response = await fetch(`${getAAApiUrl()}/webhooks/${webhookId}.json`, {
    method: 'DELETE',
    headers: { Authorization: getBearerAuth() },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to delete webhook: ${JSON.stringify(error)}`);
  }

  return { success: true };
}

// Subscribe a user to account activity (requires user context OAuth)
export async function subscribeUser(accessToken) {
  const response = await fetch(`${getAAApiUrl()}/subscriptions.json`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  // 204 = success (already subscribed or newly subscribed)
  if (response.status === 204 || response.ok) {
    return { success: true };
  }

  const error = await response.json().catch(() => ({ error: 'Unknown error' }));
  throw new Error(`Failed to subscribe user: ${JSON.stringify(error)}`);
}

// Check if user is subscribed
export async function checkSubscription(accessToken) {
  const response = await fetch(`${getAAApiUrl()}/subscriptions.json`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  return response.status === 204;
}

// List all subscriptions (app level)
export async function listSubscriptions() {
  const response = await fetch(`${getAAApiUrl()}/subscriptions/list.json`, {
    headers: { Authorization: getBearerAuth() },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to list subscriptions: ${JSON.stringify(error)}`);
  }

  return response.json();
}
