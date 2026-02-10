import crypto from 'crypto';
import { query } from '../db/index.js';
import { processReply } from './replyHider.js';

// Validate CRC challenge from Twitter
// Uses Consumer Secret (API Secret), not OAuth 2.0 Client Secret
export function validateCRC(crcToken) {
  const secret = process.env.X_API_SECRET || process.env.X_CLIENT_SECRET;
  const hmac = crypto
    .createHmac('sha256', secret)
    .update(crcToken)
    .digest('base64');

  console.log('CRC validation - using secret:', secret ? 'present' : 'MISSING');
  return `sha256=${hmac}`;
}

// Handle incoming webhook event
export async function handleWebhookEvent(event) {
  console.log('=== WEBHOOK EVENT RECEIVED ===');
  console.log('Event keys:', Object.keys(event));
  console.log('Full event:', JSON.stringify(event, null, 2).substring(0, 2000));

  // v1.1 format: tweet_create_events
  if (event.tweet_create_events) {
    console.log('Processing v1.1 tweet_create_events');
    for (const tweet of event.tweet_create_events) {
      await handleTweetCreateEvent(tweet, event.for_user_id);
    }
  }

  // v2 format: Check for different possible event structures
  if (event.data) {
    console.log('Processing v2 data event');
    await handleV2Event(event);
  }

  // Account Activity events might come in different formats
  if (event.tweet_create_event) {
    console.log('Processing single tweet_create_event');
    await handleTweetCreateEvent(event.tweet_create_event, event.for_user_id);
  }

  // Handle direct reply events
  if (event.reply) {
    console.log('Processing reply event');
    await handleReplyEvent(event.reply, event.for_user_id);
  }
}

// Handle v2 API event format
async function handleV2Event(event) {
  const data = event.data;

  // Check if this is a tweet/reply
  if (data.referenced_tweets) {
    const replyRef = data.referenced_tweets.find(ref => ref.type === 'replied_to');
    if (replyRef) {
      console.log('Found reply in v2 format:', data.id);

      // Get the user this is in reply to
      const forUserId = event.matching_rules?.[0]?.tag || event.for_user_id;

      // Find user in database by checking if the replied-to tweet is theirs
      const users = await query('SELECT id, x_user_id, monitoring_enabled FROM users');

      for (const user of users.rows) {
        if (!user.monitoring_enabled) continue;

        // Process the reply
        try {
          const result = await processReply(
            user.id,
            {
              id: data.id,
              text: data.text,
              author_username: event.includes?.users?.find(u => u.id === data.author_id)?.username,
            },
            replyRef.id
          );

          if (result.hidden) {
            console.log(`Hidden reply ${data.id} matching keyword: ${result.matchedKeyword}`);
          }
        } catch (error) {
          console.error('Error processing v2 reply:', error);
        }
      }
    }
  }
}

// Handle reply event
async function handleReplyEvent(reply, forUserId) {
  console.log('Processing reply event for user:', forUserId);

  const userResult = await query(
    'SELECT id, monitoring_enabled FROM users WHERE x_user_id = $1',
    [forUserId]
  );

  if (userResult.rows.length === 0) {
    console.log('User not found for webhook event:', forUserId);
    return;
  }

  const user = userResult.rows[0];

  if (!user.monitoring_enabled) {
    console.log('Monitoring disabled for user:', forUserId);
    return;
  }

  try {
    const result = await processReply(
      user.id,
      {
        id: reply.id || reply.id_str,
        text: reply.text,
        author_username: reply.author?.username || reply.user?.screen_name,
      },
      reply.in_reply_to_tweet_id || reply.in_reply_to_status_id_str
    );

    if (result.hidden) {
      console.log(`Hidden reply ${reply.id} matching keyword: ${result.matchedKeyword}`);
    }
  } catch (error) {
    console.error('Error processing reply from webhook:', error);
  }
}

// Process a tweet create event (v1.1 format)
async function handleTweetCreateEvent(tweet, forUserId) {
  console.log('Processing tweet create event:', tweet.id_str);
  console.log('Tweet text:', tweet.text?.substring(0, 100));
  console.log('In reply to user:', tweet.in_reply_to_user_id_str);
  console.log('For user:', forUserId);

  // Check if this is a reply
  if (!tweet.in_reply_to_user_id_str) {
    console.log('Not a reply, skipping');
    return;
  }

  // Only process replies TO the monitored user's tweets
  if (tweet.in_reply_to_user_id_str !== forUserId) {
    console.log('Reply not to monitored user, skipping');
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
    } else {
      console.log(`Reply ${tweet.id_str} not hidden:`, result.reason);
    }
  } catch (error) {
    console.error('Error processing reply from webhook:', error);
  }
}
