const redis = require('../db');
const crypto = require('crypto');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { action, telegramId, code } = req.body;
  if (!telegramId) return res.status(400).json({ error: 'telegramId required' });

  try {
    let user = await redis.get(`user:${telegramId}`);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (action === 'create') {
      if (user.coupleId) return res.status(400).json({ error: 'Already in couple' });
      const newCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      const coupleId = crypto.randomUUID();
      
      const couple = { id: coupleId, code: newCode, users: [user.id] };
      await redis.set(`couple:${coupleId}`, couple);
      await redis.set(`couplecode:${newCode}`, coupleId);
      await redis.sadd('couples:all', coupleId); // Add to set for cron
      
      user.coupleId = coupleId;
      await redis.set(`user:${telegramId}`, user);
      
      return res.status(200).json(couple);
    } 
    
    if (action === 'join') {
      if (!code) return res.status(400).json({ error: 'Code required' });
      const coupleId = await redis.get(`couplecode:${code}`);
      if (!coupleId) return res.status(404).json({ error: 'Invalid code' });
      
      let couple = await redis.get(`couple:${coupleId}`);
      if (!couple) return res.status(404).json({ error: 'Couple not found' });
      
      if (!couple.users.includes(user.id)) {
          couple.users.push(user.id);
          await redis.set(`couple:${coupleId}`, couple);
      }
      
      user.coupleId = coupleId;
      await redis.set(`user:${telegramId}`, user);
      
      return res.status(200).json(couple);
    }

    if (action === 'leave') {
      if (!user.coupleId) return res.status(400).json({ error: 'Not in a couple' });
      await redis.srem('couples:all', user.coupleId); // Remove from cron
      user.coupleId = null;
      await redis.set(`user:${telegramId}`, user);
      return res.status(200).json({ success: true });
    }

    res.status(400).json({ error: 'Invalid action' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'DB Error' });
  }
};
