import { query } from '../db/index.js';
import { createUserClient } from './twitter.js';

// Check if reply text or author matches any of the user's keywords
export function matchesKeywords(text, authorUsername, keywords) {
  const lowerText = (text || '').toLowerCase();
  const lowerAuthor = (authorUsername || '').toLowerCase();

  for (const keyword of keywords) {
    const lowerKeyword = keyword.toLowerCase().replace(/^@/, ''); // Remove @ prefix for comparison

    // Check if keyword matches text content
    if (lowerText.includes(lowerKeyword)) {
      return keyword;
    }

    // Check if keyword matches author handle (for @handle keywords)
    if (keyword.startsWith('@') && lowerAuthor === lowerKeyword) {
      return keyword;
    }
  }

  return null;
}

// Hide a reply using X API
export async function hideReply(userId, replyId) {
  const client = await createUserClient(userId);
  // Use direct API call as the library method may not work correctly
  const result = await client.v2.put(`tweets/${replyId}/hidden`, { hidden: true });
  console.log('Hide reply result:', result);
  return result;
}

// Unhide a reply using X API
export async function unhideReply(userId, replyId) {
  const client = await createUserClient(userId);
  const result = await client.v2.put(`tweets/${replyId}/hidden`, { hidden: false });
  console.log('Unhide reply result:', result);
  return result;
}

// Process a reply and hide it if it matches keywords
export async function processReply(userId, reply, originalTweetId) {
  // Get user's keywords
  const keywordsResult = await query(
    'SELECT keyword FROM keywords WHERE user_id = $1',
    [userId]
  );
  const keywords = keywordsResult.rows.map(row => row.keyword);

  if (keywords.length === 0) {
    return { hidden: false, reason: 'no_keywords' };
  }

  // Check if reply matches any keyword (by text or author)
  const matchedKeyword = matchesKeywords(reply.text, reply.author_username, keywords);

  if (!matchedKeyword) {
    return { hidden: false, reason: 'no_match' };
  }

  // Check if already hidden
  const existingResult = await query(
    'SELECT id FROM hidden_replies WHERE reply_id = $1',
    [reply.id]
  );

  if (existingResult.rows.length > 0) {
    return { hidden: false, reason: 'already_processed' };
  }

  try {
    // Hide the reply via X API
    await hideReply(userId, reply.id);

    // Log to database
    await query(
      `INSERT INTO hidden_replies
       (user_id, original_tweet_id, reply_id, reply_author_username, reply_text, matched_keyword)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId, originalTweetId, reply.id, reply.author_username || null, reply.text, matchedKeyword]
    );

    return { hidden: true, matchedKeyword };
  } catch (error) {
    console.error('Error hiding reply:', error);
    throw error;
  }
}

// Scan recent replies for a user's tweets and process them
export async function scanRecentReplies(userId) {
  console.log('Starting scan for user:', userId);

  const userResult = await query(
    'SELECT x_user_id, x_username FROM users WHERE id = $1',
    [userId]
  );

  if (userResult.rows.length === 0) {
    throw new Error('User not found');
  }

  const { x_user_id, x_username } = userResult.rows[0];
  console.log('Scanning for X user:', x_username, x_user_id);

  const client = await createUserClient(userId);

  const results = {
    tweetsScanned: 0,
    repliesProcessed: 0,
    repliesHidden: 0,
  };

  // Get user's keywords first
  const keywordsResult = await query(
    'SELECT keyword FROM keywords WHERE user_id = $1',
    [userId]
  );
  const keywords = keywordsResult.rows.map(row => row.keyword);
  console.log('Keywords to search for:', keywords);

  if (keywords.length === 0) {
    console.log('No keywords configured');
    return results;
  }

  // Approach 1: Get mentions timeline (replies that mention the user)
  console.log('Fetching mentions timeline...');
  try {
    const mentions = await client.v2.userMentionTimeline(x_user_id, {
      max_results: 100,
      'tweet.fields': ['author_id', 'text', 'in_reply_to_user_id', 'conversation_id', 'referenced_tweets'],
      expansions: ['author_id', 'referenced_tweets.id'],
    });

    console.log(`Found ${mentions.data?.data?.length || mentions.data?.length || 0} mentions`);
    console.log('Mentions meta:', mentions.meta);

    const mentionData = mentions.data?.data || mentions.data || [];

    for (const mention of mentionData) {
      // Check if this is a reply (has in_reply_to_user_id or referenced_tweets with replied_to)
      const isReply = mention.in_reply_to_user_id ||
        mention.referenced_tweets?.some(rt => rt.type === 'replied_to');

      if (!isReply) {
        console.log(`Skipping mention ${mention.id} - not a reply`);
        continue;
      }

      // Skip own tweets
      if (mention.author_id === x_user_id) continue;

      results.repliesProcessed++;
      console.log(`Processing reply ${mention.id}: "${mention.text?.substring(0, 80)}..."`);

      const author = mentions.includes?.users?.find(u => u.id === mention.author_id);

      const processResult = await processReply(userId, {
        id: mention.id,
        text: mention.text,
        author_username: author?.username,
      }, mention.conversation_id || mention.id);

      if (processResult.hidden) {
        console.log(`Hidden reply ${mention.id} - matched: ${processResult.matchedKeyword}`);
        results.repliesHidden++;
      } else {
        console.log(`Reply ${mention.id} not hidden: ${processResult.reason}`);
      }
    }
  } catch (error) {
    console.error('Error fetching mentions:', error.message, error);
  }

  // Approach 2: Get replies to specific recent tweets
  console.log('\nFetching user timeline to check for replies...');
  try {
    const userTweets = await client.v2.userTimeline(x_user_id, {
      max_results: 20,
      'tweet.fields': ['conversation_id', 'public_metrics'],
    });

    const tweetsData = userTweets.data?.data || userTweets.data || [];
    console.log(`Found ${tweetsData.length} tweets`);

    for (const tweet of tweetsData) {
      results.tweetsScanned++;

      // Skip tweets with no replies
      if (!tweet.public_metrics?.reply_count || tweet.public_metrics.reply_count === 0) {
        continue;
      }

      console.log(`Tweet ${tweet.id} has ${tweet.public_metrics.reply_count} replies`);

      // Search for replies in this conversation
      try {
        const searchQuery = `conversation_id:${tweet.id}`;
        const convReplies = await client.v2.search(searchQuery, {
          max_results: 100,
          'tweet.fields': ['author_id', 'text', 'in_reply_to_user_id'],
          expansions: ['author_id'],
        });

        // Handle different response formats
        let repliesData = [];
        if (Array.isArray(convReplies.data)) {
          repliesData = convReplies.data;
        } else if (convReplies.data?.data && Array.isArray(convReplies.data.data)) {
          repliesData = convReplies.data.data;
        } else if (convReplies._realData?.data && Array.isArray(convReplies._realData.data)) {
          repliesData = convReplies._realData.data;
        }
        console.log(`Found ${repliesData.length} tweets in conversation ${tweet.id}`);

        for (const reply of repliesData) {
          if (reply.author_id === x_user_id) continue;
          if (reply.id === tweet.id) continue; // Skip the original tweet

          results.repliesProcessed++;
          console.log(`Reply ${reply.id}: "${reply.text?.substring(0, 60)}..."`);

          const author = convReplies.includes?.users?.find(u => u.id === reply.author_id);

          const processResult = await processReply(userId, {
            id: reply.id,
            text: reply.text,
            author_username: author?.username,
          }, tweet.id);

          if (processResult.hidden) {
            console.log(`Hidden reply ${reply.id} - matched: ${processResult.matchedKeyword}`);
            results.repliesHidden++;
          }
        }
      } catch (searchError) {
        console.error(`Error searching conversation ${tweet.id}:`, searchError.message);
      }
    }
  } catch (error) {
    console.error('Error fetching user timeline:', error.message);
  }

  console.log('\nScan complete:', results);
  return results;
}
