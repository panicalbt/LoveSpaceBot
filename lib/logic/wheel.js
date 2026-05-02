const redis = require('../db');
const crypto = require('crypto');

module.exports = async (req, res) => {
  const { coupleId } = req.method === 'GET' ? req.query : req.body;
  if (!coupleId) return res.status(400).json({ error: 'coupleId required' });

  try {
    if (req.method === 'GET') {
      const items = await redis.get(`wheel:${coupleId}`) || [
        { id: '1', text: 'Посмотреть фильм', color: '#ec4899' },
        { id: '2', text: 'Заказать пиццу', color: '#3b82f6' },
        { id: '3', text: 'Пойти гулять', color: '#10b981' },
        { id: '4', text: 'Массаж', color: '#ef4444' }
      ];
      return res.status(200).json(items);
    }

    if (req.method === 'POST') {
      const { action, itemId, text, color } = req.body;
      let items = await redis.get(`wheel:${coupleId}`) || [
        { id: '1', text: 'Посмотреть фильм', color: '#ec4899' },
        { id: '2', text: 'Заказать пиццу', color: '#3b82f6' },
        { id: '3', text: 'Пойти гулять', color: '#10b981' },
        { id: '4', text: 'Массаж', color: '#ef4444' }
      ];

      if (action === 'add') {
        const item = { id: crypto.randomUUID(), text, color: color || '#ec4899' };
        items.push(item);
        await redis.set(`wheel:${coupleId}`, items);
        return res.status(200).json(item);
      }

      if (action === 'delete') {
        items = items.filter(i => i.id !== itemId);
        await redis.set(`wheel:${coupleId}`, items);
        return res.status(200).json({ success: true });
      }
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'DB Error' });
  }
};
