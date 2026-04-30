const redis = require('./db');
const { verifyTelegramAuth, getUserData } = require('./utils/telegramAuth');
const crypto = require('crypto');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  
  const { initData } = req.body;
  if (!initData) return res.status(400).json({ error: 'Missing initData' });

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  let userData;
  
  if (botToken && process.env.NODE_ENV === 'production') {
    if (!verifyTelegramAuth(initData, botToken)) return res.status(403).json({ error: 'Invalid hash' });
    userData = getUserData(initData);
  } else {
    userData = getUserData(initData) || { id: 999999, first_name: 'DemoUser' };
  }
  
  if (!userData) return res.status(400).json({ error: 'User data not found' });

  try {
    const tgid = String(userData.id);
    let user = await redis.get(`user:${tgid}`);
    
    if (!user) {
      user = {
        id: crypto.randomUUID(),
        telegramId: tgid,
        firstName: userData.first_name,
        theme: 'dark',
        accent: 'pink',
        balance: 0,
        coupleId: null
      };
      await redis.set(`user:${tgid}`, user);
    }
    
    let couple = null;
    if (user.coupleId) {
      couple = await redis.get(`couple:${user.coupleId}`);
    }
    
    // Support frontend updates (theme/accent)
    if (req.body.updateData) {
      user = { ...user, ...req.body.updateData };
      await redis.set(`user:${tgid}`, user);
    }

    res.status(200).json({ ...user, couple });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'DB Error' });
  }
};
