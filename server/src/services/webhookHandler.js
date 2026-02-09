import crypto from 'crypto';
import { query } from '../db/index.js';
import { processReply } from './replyHider.js';

// Validate CRC challenge from Twitter
export function validateCRC(crcToken) {
  const hmac = crypto
    .createHmac('sha256', process.env.X_CLIENT_SECRET)
    .update(crcToken)
    .digest('base64');

  return `sha256=${hmac}`;
}

// Handle incoming webhook event
export async function handleWebhookEvent(event) {
  // Handle tweet create events (which include replies)
  if (event.tweet_create_events) {
    for (const tweet of event.tweet_create_events) {
      await handleTweetCreateEvent(tweet, event.for_user_id);
    }
  }
}

// Process a tweet create event
async function handleTweetCreateEvent(tweet, forUserId) {
  // Check if this is a reply
  if (!tweet.in_reply_to_user_id_str) {
    return;
  }

  // Only process replies TO the monitored user's tweets
  if (tweet.in_reply_to_user_id_str !== forUserId) {
    return;
  }

  // Find the user in our database
  const userResult = await query(
    'SELECT id, monitoring_enabled FROM users WHERE x_user_id = $1',
    [forUserId]
  );

  if (userResult.rows.length === 0) {
    console.log('User not found for webhook event:', forUserId);
    return;
  }

  const user = userResult.rows[0];

  // Check if monitoring is enabled
  if (!user.monitoring_enabled) {
    console.log('Monitoring disabled for user:', forUserId);
    return;
  }

  // Process the reply
  try {
    const result = await processReply(
      user.id,
      {
        id: tweet.id_str,
        text: tweet.text,
        author_username: tweet.user?.screen_name,
      },
      tweet.in_reply_to_status_id_str
    );

    if (result.hidden) {
      console.log(`Hidden reply ${tweet.id_str} matching keyword: ${result.matchedKeyword}`);
    }
  } catch (error) {
    console.error('Error processing reply from webhook:', error);
  }
}
