import { Router } from 'express';
import { query } from '../db/index.js';
import { authMiddleware } from '../middleware/auth.js';
import { scanRecentReplies } from '../services/replyHider.js';
import { subscribeUser, checkSubscription } from '../services/webhookSetup.js';

const router = Router();

// Get monitoring status
router.get('/status', authMiddleware, async (req, res) => {
  try {
    const result = await query(
      'SELECT monitoring_enabled FROM users WHERE id = $1',
      [req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ enabled: result.rows[0].monitoring_enabled });
  } catch (error) {
    console.error('Error fetching monitoring status:', error);
    res.status(500).json({ error: 'Failed to fetch monitoring status' });
  }
});

// Toggle monitoring
router.post('/toggle', authMiddleware, async (req, res) => {
  const { enabled } = req.body;

  if (typeof enabled !== 'boolean') {
    return res.status(400).json({ error: 'enabled boolean is required' });
  }

  try {
    await query(
      'UPDATE users SET monitoring_enabled = $1, updated_at = NOW() WHERE id = $2',
      [enabled, req.userId]
    );

    res.json({ enabled });
  } catch (error) {
    console.error('Error toggling monitoring:', error);
    res.status(500).json({ error: 'Failed to toggle monitoring' });
  }
});

// Trigger historical scan
router.post('/scan', authMiddleware, async (req, res) => {
  try {
    // Set a reasonable timeout for the scan
    const results = await scanRecentReplies(req.userId);
    res.json(results);
  } catch (error) {
    console.error('Error running scan:', error);
    res.status(500).json({ error: 'Failed to run scan' });
  }
});

// Subscribe to webhook events (uses OAuth 1.0a from env vars)
router.post('/subscribe', authMiddleware, async (req, res) => {
  try {
    await subscribeUser();
    res.json({ success: true, message: 'Subscribed to webhook events' });
  } catch (error) {
    console.error('Error subscribing to webhooks:', error);
    res.status(500).json({ error: error.message });
  }
});

// Check subscription status
router.get('/subscription', authMiddleware, async (req, res) => {
  try {
    const isSubscribed = await checkSubscription();
    res.json({ subscribed: isSubscribed });
  } catch (error) {
    console.error('Error checking subscription:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
