const redis = require('../db');
const crypto = require('crypto');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { coupleId, action, text, icon, authorId } = req.body;
  if (!coupleId) return res.status(400).json({ error: 'coupleId required' });

  try {
    if (action === 'get') {
      const events = await redis.lrange(`events:${coupleId}`, 0, 19) || [];
      return res.status(200).json(events);
    }

    if (action === 'add') {
      if (!text) return res.status(400).json({ error: 'text required' });
      const event = {
        id: crypto.randomUUID(),
        text,
        icon: icon || '🔔',
        authorId,
        createdAt: Date.now()
      };
      await redis.lpush(`events:${coupleId}`, event);
      await redis.ltrim(`events:${coupleId}`, 0, 49); // Keep last 50 events
      
      // Notify partner
      if (authorId) {
        const couple = await redis.get(`couple:${coupleId}`);
        if (couple && couple.partnerData) {
          const partnerId = couple.users.find(id => id !== authorId);
          if (partnerId && couple.partnerData[partnerId] && couple.partnerData[partnerId].telegramId) {
            const { sendTelegramMessage } = require('../utils/telegram');
            const authorName = couple.partnerData[authorId]?.firstName || 'Партнер';
            await sendTelegramMessage(couple.partnerData[partnerId].telegramId, `<b>Новое событие!</b>\n${event.icon} ${authorName} ${event.text}`);
          }
        }
      }
      
      return res.status(200).json(event);
    }

    res.status(400).json({ error: 'Invalid action' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'DB Error' });
  }
};
