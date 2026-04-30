const redis = require('./db');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { telegramId, status, dailyNote } = req.body;
  if (!telegramId) return res.status(400).json({ error: 'telegramId required' });

  try {
    let user = await redis.get(`user:${telegramId}`);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (status !== undefined) user.status = status;
    if (dailyNote !== undefined) user.dailyNote = dailyNote;
    if (req.body.updateData) {
       user = { ...user, ...req.body.updateData };
    }

    await redis.set(`user:${telegramId}`, user);

    if (user.coupleId) {
       let couple = await redis.get(`couple:${user.coupleId}`);
       if (couple) {
          if (!couple.partnerData) couple.partnerData = {};
          couple.partnerData[user.id] = { 
              status: user.status, 
              dailyNote: user.dailyNote, 
              firstName: user.firstName 
          };
          await redis.set(`couple:${user.coupleId}`, couple);
       }
    }

    res.status(200).json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'DB Error' });
  }
};
