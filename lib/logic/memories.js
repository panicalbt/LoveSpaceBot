const redis = require('../db');
const crypto = require('crypto');

module.exports = async (req, res) => {
  const { coupleId } = req.method === 'GET' ? req.query : req.body;
  if (!coupleId) return res.status(400).json({ error: 'coupleId required' });

  try {
    if (req.method === 'GET') {
      const mems = await redis.get(`memories:${coupleId}`) || [];
      return res.status(200).json(mems);
    }

    if (req.method === 'POST') {
      const { action, memoryId, text, emoji, date, authorId } = req.body;
      let mems = await redis.get(`memories:${coupleId}`) || [];

      if (action === 'create') {
        const mem = {
          id: crypto.randomUUID(),
          text,
          emoji: emoji || '❤️',
          date: date || new Date().toISOString().split('T')[0],
          photo: req.body.photo || null,
          authorId,
          createdAt: Date.now()
        };
        mems.push(mem);
        await redis.set(`memories:${coupleId}`, mems);
        return res.status(200).json(mem);
      }

      if (action === 'delete') {
        mems = mems.filter(m => m.id !== memoryId);
        await redis.set(`memories:${coupleId}`, mems);
        return res.status(200).json({ success: true });
      }
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'DB Error' });
  }
};
