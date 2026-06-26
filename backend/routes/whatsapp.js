import express from 'express';
import { logWhatsAppNotification } from '../utils/whatsappLogger.js';

const router = express.Router();

router.post('/log', async (req, res) => {
  try {
    const { to, message, trigger, openedBy } = req.body;
    if (!to || !message || !trigger) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    await logWhatsAppNotification(to, message, trigger, openedBy || 'system');
    res.json({ success: true });
  } catch (err) {
    console.error('WhatsApp Log Error:', err);
    res.status(500).json({ error: 'Failed to log notification' });
  }
});

export default router;
