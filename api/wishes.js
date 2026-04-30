const redis = require('./db');
const crypto = require('crypto');

module.exports = async (req, res) => {
  try {
    if (req.method === 'GET') {
      const { coupleId } = req.query;
      if (!coupleId) return res.status(400).json({ error: 'coupleId required' });
      const wishesHash = await redis.hgetall(`wishes:${coupleId}`);
      const wishes = wishesHash ? Object.values(wishesHash) : [];
      return res.status(200).json(wishes.sort((a,b) => b.createdAt - a.createdAt));
    }

    if (req.method === 'POST') {
      const { title, points, coupleId, action, wishId, telegramId } = req.body;
      
      if (action === 'create') {
        const id = crypto.randomUUID();
        const wish = { id, title, points: parseInt(points), isBought: false, createdAt: Date.now() };
        await redis.hset(`wishes:${coupleId}`, { [id]: wish });
        return res.status(200).json(wish);
      }
      
      if (action === 'buy') {
        let user = await redis.get(`user:${telegramId}`);
        let wish = await redis.hget(`wishes:${coupleId}`, wishId);
        if(!wish) return res.status(404).json({error: "Wish not found"});
        if(typeof wish === 'string') wish = JSON.parse(wish);
        
        if (!user || user.balance < wish.points) {
          return res.status(400).json({ error: 'Not enough points' });
        }

        wish.isBought = true;
        await redis.hset(`wishes:${coupleId}`, { [wishId]: wish });
        
        user.balance -= wish.points;
        await redis.set(`user:${telegramId}`, user);
        
        return res.status(200).json(wish);
      }

      if (action === 'delete') {
         await redis.hdel(`wishes:${coupleId}`, wishId);
         return res.status(200).json({ success: true });
      }

      return res.status(400).json({ error: 'Invalid action' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'DB Error' });
  }
};
