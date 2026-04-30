const redis = require('./db');
const crypto = require('crypto');
const bot = require('./utils/bot');

module.exports = async (req, res) => {
  try {
    if (req.method === 'GET') {
      const { coupleId } = req.query;
      if (!coupleId) return res.status(400).json({ error: 'coupleId required' });
      const wishesHash = await redis.hgetall(`wishes:${coupleId}`);
      let wishes = wishesHash ? Object.values(wishesHash) : [];
      wishes = wishes.map(w => typeof w === 'string' ? JSON.parse(w) : w);
      return res.status(200).json(wishes);
    }

    if (req.method === 'POST') {
      const { title, points, coupleId, action, wishId, telegramId, isSecret } = req.body;
      
      let user = await redis.get(`user:${telegramId}`);
      if (!user) return res.status(400).json({error: "User not found"});

      if (action === 'create') {
        const id = crypto.randomUUID();
        const wish = { id, title, points: parseInt(points), isBought: false, isSecret: !!isSecret, creatorId: user.id, createdAt: Date.now() };
        await redis.hset(`wishes:${coupleId}`, { [id]: wish });
        return res.status(200).json(wish);
      }
      
      if (action === 'buy') {
        let wish = await redis.hget(`wishes:${coupleId}`, wishId);
        if(!wish) return res.status(404).json({error: "Wish not found"});
        if(typeof wish === 'string') wish = JSON.parse(wish);
        
        if (user.balance < wish.points) {
            return res.status(400).json({error: "Not enough points"});
        }
        
        user.balance -= wish.points;
        wish.isBought = true;
        wish.buyerTelegramId = telegramId;
        
        await redis.set(`user:${telegramId}`, user);
        await redis.hset(`wishes:${coupleId}`, { [wishId]: wish });

        const couple = await redis.get(`couple:${coupleId}`);
        if(couple && couple.telegramIds) {
            const partnerTgId = couple.telegramIds.find(t => t !== telegramId);
            if (partnerTgId) {
                bot.sendMessage(partnerTgId, `🎁 <b>Сюрприз!</b>\nПартнер только что приобрел желание: <i>${wish.title}</i>!`);
            }
        }
        
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
