import { Router } from 'express';
import { query } from '../db/index.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// Get all keywords for user
router.get('/', authMiddleware, async (req, res) => {
  try {
    const result = await query(
      'SELECT id, keyword, created_at FROM keywords WHERE user_id = $1 ORDER BY created_at DESC',
      [req.userId]
    );
    res.json({ keywords: result.rows });
  } catch (error) {
    console.error('Error fetching keywords:', error);
    res.status(500).json({ error: 'Failed to fetch keywords' });
  }
});

// Add keywords (comma-separated)
router.post('/', authMiddleware, async (req, res) => {
  const { keywords } = req.body;

  if (!keywords || typeof keywords !== 'string') {
    return res.status(400).json({ error: 'Keywords string is required' });
  }

  // Parse comma-separated keywords
  const keywordList = keywords
    .split(',')
    .map(k => k.trim())
    .filter(k => k.length > 0 && k.length <= 255);

  if (keywordList.length === 0) {
    return res.status(400).json({ error: 'No valid keywords provided' });
  }

  try {
    const added = [];
    const duplicates = [];

    for (const keyword of keywordList) {
      try {
        const result = await query(
          'INSERT INTO keywords (user_id, keyword) VALUES ($1, $2) ON CONFLICT (user_id, keyword) DO NOTHING RETURNING id, keyword',
          [req.userId, keyword]
        );
        if (result.rows.length > 0) {
          added.push(result.rows[0]);
        } else {
          duplicates.push(keyword);
        }
      } catch (error) {
        console.error('Error adding keyword:', keyword, error);
      }
    }

    res.json({ added, duplicates, message: `Added ${added.length} keywords` });
  } catch (error) {
    console.error('Error adding keywords:', error);
    res.status(500).json({ error: 'Failed to add keywords' });
  }
});

// Delete a keyword
router.delete('/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;

  try {
    const result = await query(
      'DELETE FROM keywords WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Keyword not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting keyword:', error);
    res.status(500).json({ error: 'Failed to delete keyword' });
  }
});

export default router;
