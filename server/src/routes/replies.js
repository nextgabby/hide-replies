import { Router } from 'express';
import { query } from '../db/index.js';
import { authMiddleware } from '../middleware/auth.js';
import { unhideReply, scanRecentReplies } from '../services/replyHider.js';

const router = Router();

// Get hidden replies (paginated)
router.get('/hidden', authMiddleware, async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const offset = (page - 1) * limit;

  try {
    const [repliesResult, countResult] = await Promise.all([
      query(
        `SELECT id, original_tweet_id, reply_id, reply_author_username, reply_text, matched_keyword, hidden_at, is_hidden
         FROM hidden_replies
         WHERE user_id = $1
         ORDER BY hidden_at DESC
         LIMIT $2 OFFSET $3`,
        [req.userId, limit, offset]
      ),
      query(
        'SELECT COUNT(*) FROM hidden_replies WHERE user_id = $1',
        [req.userId]
      ),
    ]);

    const total = parseInt(countResult.rows[0].count);

    res.json({
      replies: repliesResult.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching hidden replies:', error);
    res.status(500).json({ error: 'Failed to fetch hidden replies' });
  }
});

// Unhide a reply
router.post('/:id/unhide', authMiddleware, async (req, res) => {
  const { id } = req.params;

  try {
    // Get the reply from database
    const replyResult = await query(
      'SELECT reply_id, is_hidden FROM hidden_replies WHERE id = $1 AND user_id = $2',
      [id, req.userId]
    );

    if (replyResult.rows.length === 0) {
      return res.status(404).json({ error: 'Reply not found' });
    }

    const reply = replyResult.rows[0];

    if (!reply.is_hidden) {
      return res.status(400).json({ error: 'Reply is already unhidden' });
    }

    // Unhide via X API
    await unhideReply(req.userId, reply.reply_id);

    // Update database
    await query(
      'UPDATE hidden_replies SET is_hidden = false, unhidden_at = NOW() WHERE id = $1',
      [id]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Error unhiding reply:', error);
    res.status(500).json({ error: 'Failed to unhide reply' });
  }
});

// Get stats
router.get('/stats', authMiddleware, async (req, res) => {
  try {
    const [totalResult, todayResult, keywordsResult] = await Promise.all([
      query(
        'SELECT COUNT(*) as total FROM hidden_replies WHERE user_id = $1 AND is_hidden = true',
        [req.userId]
      ),
      query(
        `SELECT COUNT(*) as today FROM hidden_replies
         WHERE user_id = $1 AND is_hidden = true AND hidden_at >= CURRENT_DATE`,
        [req.userId]
      ),
      query(
        'SELECT COUNT(*) as keywords FROM keywords WHERE user_id = $1',
        [req.userId]
      ),
    ]);

    res.json({
      totalHidden: parseInt(totalResult.rows[0].total),
      hiddenToday: parseInt(todayResult.rows[0].today),
      activeKeywords: parseInt(keywordsResult.rows[0].keywords),
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

export default router;
