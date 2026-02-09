import { Router } from 'express';
import { validateCRC, handleWebhookEvent } from '../services/webhookHandler.js';
import { listWebhooks, registerWebhook, deleteWebhook, listSubscriptions } from '../services/webhookSetup.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// CRC challenge handler
router.get('/', (req, res) => {
  const { crc_token } = req.query;

  if (!crc_token) {
    return res.status(400).json({ error: 'Missing crc_token' });
  }

  console.log('CRC challenge received');
  const responseToken = validateCRC(crc_token);
  res.json({ response_token: responseToken });
});

// Webhook event receiver
router.post('/', async (req, res) => {
  console.log('Webhook event received:', JSON.stringify(req.body).substring(0, 200));

  // Immediately respond to Twitter
  res.sendStatus(200);

  // Process event asynchronously
  try {
    await handleWebhookEvent(req.body);
  } catch (error) {
    console.error('Error handling webhook event:', error);
  }
});

// Admin: List webhooks
router.get('/admin/webhooks', authMiddleware, async (req, res) => {
  try {
    const webhooks = await listWebhooks();
    res.json({ webhooks });
  } catch (error) {
    console.error('Error listing webhooks:', error);
    res.status(500).json({ error: error.message });
  }
});

// Admin: Register webhook
router.post('/admin/webhooks', authMiddleware, async (req, res) => {
  try {
    const webhookUrl = `${process.env.BACKEND_URL}/webhook/twitter`;
    console.log('Registering webhook:', webhookUrl);
    const result = await registerWebhook(webhookUrl);
    res.json({ success: true, webhook: result });
  } catch (error) {
    console.error('Error registering webhook:', error);
    res.status(500).json({ error: error.message });
  }
});

// Admin: Delete webhook
router.delete('/admin/webhooks/:id', authMiddleware, async (req, res) => {
  try {
    await deleteWebhook(req.params.id);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting webhook:', error);
    res.status(500).json({ error: error.message });
  }
});

// Admin: List subscriptions
router.get('/admin/subscriptions', authMiddleware, async (req, res) => {
  try {
    const subscriptions = await listSubscriptions();
    res.json({ subscriptions });
  } catch (error) {
    console.error('Error listing subscriptions:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
