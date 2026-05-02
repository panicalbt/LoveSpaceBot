const redis = require('../db');

module.exports = async (req, res) => {
  try {
    const { action, telegramId, coupleId } = req.body;
    if (!telegramId || !coupleId) {
        console.error('INTERACTIONS_MISSING_PARAMS:', req.body);
        return res.status(400).json({ error: 'Missing params' });
    }

    if (action === 'hug') {
      let user = await redis.get(`user:${telegramId}`);
      if (typeof user === 'string') {
        try { user = JSON.parse(user); } catch(e) { console.error('USER_PARSE_ERROR', e); }
      }
      if (!user) {
        console.error('INTERACTIONS_USER_NOT_FOUND:', telegramId);
        return res.status(404).json({ error: 'User not found' });
      }
      
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
      if (!events || !Array.isArray(events)) {
        // Try parsing if it was stored as string
        if (typeof events === 'string') {
          try { events = JSON.parse(events); } catch(e) { events = []; }
        } else {
          events = [];
        }
      }
      
      events.unshift(event);
      await redis.set(`events:${coupleId}`, events.slice(0, 50));

      return res.status(200).json({ success: true });
    }

    res.status(400).json({ error: 'Invalid action' });
  } catch (error) {
    console.error('INTERACTIONS_CATCH_ERROR:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
};
