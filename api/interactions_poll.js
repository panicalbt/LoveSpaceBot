const redis = require('../db');

module.exports = async (req, res) => {
  const { coupleId, telegramId } = req.query;
  if (!coupleId) return res.status(400).json({ error: 'coupleId required' });

  try {
    const interaction = await redis.get(`last_interaction:${coupleId}`);
    
    // If there is a new interaction and it's not from the current user
    if (interaction && interaction.from !== telegramId && (Date.now() - interaction.timestamp) < 5000) {
      // Clear it so it doesn't trigger again
      // Actually, better to just return it and let client handle "seen"
      return res.status(200).json(interaction);
    }
    
    return res.status(200).json(null);
  } catch (error) {
    return res.status(500).json({ error: 'Server error' });
  }
};
