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
    
    const now = new Date();
    const today = now.toISOString().split('T')[0];

    if (!user) {
      user = {
        id: crypto.randomUUID(),
        telegramId: tgid,
        firstName: userData.first_name,
        photoUrl: userData.photo_url || null,
        theme: 'dark',
        accent: 'pink',
        balance: 0,
        coupleId: null,
        streak: 1,
        lastActiveDate: today
      };
      await redis.set(`user:${tgid}`, user);
    } else {
      // Update streak
      if (user.lastActiveDate !== today) {
         const yesterdayDate = new Date(now);
         yesterdayDate.setDate(yesterdayDate.getDate() - 1);
         const yesterday = yesterdayDate.toISOString().split('T')[0];
         
         if (user.lastActiveDate === yesterday) {
             user.streak = (user.streak || 1) + 1;
         } else {
             user.streak = 1;
         }
         user.lastActiveDate = today;
      }
      
      // Update photo if changed
      if (userData.photo_url && user.photoUrl !== userData.photo_url) {
         user.photoUrl = userData.photo_url;
      }
      await redis.set(`user:${tgid}`, user);
    }
    
    let couple = null;
    if (user.coupleId) {
      couple = await redis.get(`couple:${user.coupleId}`);
      // Sync partner's photoUrl to couple
      if (couple) {
          if (!couple.partnerData) couple.partnerData = {};
          if (!couple.partnerData[user.id]) couple.partnerData[user.id] = {};
          couple.partnerData[user.id].photoUrl = user.photoUrl;
          couple.partnerData[user.id].streak = user.streak;
          couple.partnerData[user.id].firstName = user.firstName;
          couple.partnerData[user.id].telegramId = user.telegramId;
          await redis.set(`couple:${user.coupleId}`, couple);
      }
    }
    
    res.status(200).json({ ...user, couple });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'DB Error' });
  }
};
