const redis = require('./db');
const crypto = require('crypto');

module.exports = async (req, res) => {
  try {
    if (req.method === 'GET') {
      const { coupleId } = req.query;
      if (!coupleId) return res.status(400).json({ error: 'coupleId required' });
      const plansHash = await redis.hgetall(`plans:${coupleId}`);
      let plans = plansHash ? Object.values(plansHash) : [];
      plans = plans.map(p => typeof p === 'string' ? JSON.parse(p) : p);
      return res.status(200).json(plans);
    }

    if (req.method === 'POST') {
      const { type, text, coupleId, action, planId, telegramId, date } = req.body;
      
      if (action === 'create') {
        const id = crypto.randomUUID();
        const plan = { id, type, text, date: date || null, isDone: false, completedBy: [], createdAt: Date.now() };
        await redis.hset(`plans:${coupleId}`, { [id]: plan });
        return res.status(200).json(plan);
      }
      
      if (action === 'complete') {
        let plan = await redis.hget(`plans:${coupleId}`, planId);
        if(!plan) return res.status(404).json({error: "Plan not found"});
        if(typeof plan === 'string') plan = JSON.parse(plan);
        
        let user = await redis.get(`user:${telegramId}`);

        if (!plan.completedBy) plan.completedBy = [];
        if (!plan.completedBy.includes(user.id)) {
            plan.completedBy.push(user.id);
        }
        
        const couple = await redis.get(`couple:${coupleId}`);
        if (couple && plan.completedBy.length >= couple.users.length) {
            plan.isDone = true;
        }

        await redis.hset(`plans:${coupleId}`, { [planId]: plan });
        return res.status(200).json(plan);
      }

      if (action === 'delete') {
         await redis.hdel(`plans:${coupleId}`, planId);
         return res.status(200).json({ success: true });
      }

      return res.status(400).json({ error: 'Invalid action' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'DB Error' });
  }
};
