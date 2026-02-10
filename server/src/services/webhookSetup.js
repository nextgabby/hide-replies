import crypto from 'crypto';

const WEBHOOK_ID = process.env.X_WEBHOOK_ID || '2021284043946414080';

// Get bearer token auth header
function getBearerAuth() {
  return `Bearer ${process.env.X_BEARER_TOKEN}`;
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

// Subscribe a user to webhook events (v2)
export async function subscribeUser(accessToken) {
  console.log('Attempting to subscribe user to webhook:', WEBHOOK_ID);

  const response = await fetch(
    `https://api.twitter.com/2/webhooks/${WEBHOOK_ID}/subscriptions/all`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  console.log('Subscription response status:', response.status);

  // 200/201/204 = success
  if (response.ok || response.status === 204) {
    console.log('User successfully subscribed to webhook');
    return { success: true };
  }

  const error = await response.json().catch(() => ({ error: 'Unknown error' }));
  console.error('Subscription failed:', error);
  throw new Error(`Failed to subscribe user: ${JSON.stringify(error)}`);
}

// Check if user is subscribed (v2)
export async function checkSubscription(accessToken) {
  const response = await fetch(
    `https://api.twitter.com/2/webhooks/${WEBHOOK_ID}/subscriptions/all`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  return response.ok || response.status === 204;
}

// List all subscriptions (v2)
export async function listSubscriptions() {
  const response = await fetch(
    `https://api.twitter.com/2/webhooks/${WEBHOOK_ID}/subscriptions/all`,
    {
      headers: { Authorization: getBearerAuth() },
    }
  );

  if (!response.ok && response.status !== 204) {
    const error = await response.json().catch(() => ({}));
    throw new Error(`Failed to list subscriptions: ${JSON.stringify(error)}`);
  }

  return response.json().catch(() => ({ subscriptions: [] }));
}
