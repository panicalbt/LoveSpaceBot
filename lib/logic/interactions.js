const redis = require('../db');

module.exports = async (req, res) => {
  const { action, telegramId, coupleId } = req.body;
  if (!telegramId || !coupleId) return res.status(400).json({ error: 'Missing params' });

  try {
    if (action === 'hug') {
      const user = await redis.get(`user:${telegramId}`);
      if (!user) return res.status(404).json({ error: 'User not found' });
      
      // Store the last interaction to notify partner
      const interaction = {
        type: 'hug',
        from: user.id,
        fromName: user.firstName || 'Партнер',
        timestamp: Date.now()
      };
      
      await redis.set(`last_interaction:${coupleId}`, interaction);
      
      // Log event
      const event = {
        id: Math.random().toString(36).substring(2, 9),
        icon: '❤️',
        text: `${user.firstName || 'Партнер'} отправил(а) вам обнимашку!`,
        createdAt: Date.now()
      };
      
      let events = await redis.get(`events:${coupleId}`);
      if (!Array.isArray(events)) events = [];
      
      events.unshift(event);
      await redis.set(`events:${coupleId}`, events.slice(0, 50));

      return res.status(200).json({ success: true });
    }

    res.status(400).json({ error: 'Invalid action' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};
