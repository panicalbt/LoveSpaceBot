const redis = require('./db');
const crypto = require('crypto');

module.exports = async (req, res) => {
  try {
    if (req.method === 'GET') {
      const { coupleId } = req.query;
      if (!coupleId) return res.status(400).json({ error: 'coupleId required' });
      const tasksHash = await redis.hgetall(`tasks:${coupleId}`);
      const tasks = tasksHash ? Object.values(tasksHash) : [];
      return res.status(200).json(tasks.sort((a,b) => b.createdAt - a.createdAt));
    }

    if (req.method === 'POST') {
      const { title, points, coupleId, action, taskId, telegramId } = req.body;
      
      if (action === 'create') {
        const id = crypto.randomUUID();
        const task = { id, title, points: parseInt(points), status: 'active', createdAt: Date.now() };
        await redis.hset(`tasks:${coupleId}`, { [id]: task });
        return res.status(200).json(task);
      }
      
      if (action === 'complete') {
        let task = await redis.hget(`tasks:${coupleId}`, taskId);
        if(!task) return res.status(404).json({error: "Task not found"});
        if(typeof task === 'string') task = JSON.parse(task); // upstash sometimes returns string for hget
        
        task.status = 'done';
        await redis.hset(`tasks:${coupleId}`, { [taskId]: task });
        
        // Add points
        if (telegramId) {
           let user = await redis.get(`user:${telegramId}`);
           if (user) {
              user.balance += task.points;
              await redis.set(`user:${telegramId}`, user);
           }
        }
        return res.status(200).json(task);
      }
      
      if (action === 'delete') {
         await redis.hdel(`tasks:${coupleId}`, taskId);
         return res.status(200).json({ success: true });
      }
      return res.status(400).json({ error: 'Invalid action' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'DB Error' });
  }
};
