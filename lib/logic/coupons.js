const redis = require('../db');

module.exports = async (req, res) => {
  const { action, telegramId, coupleId } = req.body || req.query;
  if (!telegramId || !coupleId) return res.status(400).json({ error: 'Missing params' });

  try {
    if (req.method === 'GET') {
      const coupons = await redis.get(`coupons:${coupleId}`) || [];
      return res.status(200).json(coupons);
    }

    if (action === 'create') {
      const { title, description } = req.body;
      const coupons = await redis.get(`coupons:${coupleId}`) || [];
      const newCoupon = {
        id: Math.random().toString(36).substring(2, 9),
        title,
        description,
        creatorId: telegramId,
        status: 'active', // active, redeemed
        createdAt: Date.now()
      };
      coupons.push(newCoupon);
      await redis.set(`coupons:${coupleId}`, coupons);

      // Log event
      const user = await redis.get(`user:${telegramId}`);
      const event = {
        id: Math.random().toString(36).substring(2, 9),
        icon: '🎟️',
        text: `${user.firstName} создал новый купон: ${title}`,
        createdAt: Date.now()
      };
      const events = await redis.get(`events:${coupleId}`) || [];
      events.unshift(event);
      await redis.set(`events:${coupleId}`, events.slice(0, 50));

      return res.status(200).json(newCoupon);
    }

    if (action === 'redeem') {
      const { couponId: targetId } = req.body;
      const coupons = await redis.get(`coupons:${coupleId}`) || [];
      const coupon = coupons.find(c => c.id === targetId);
      if (!coupon) return res.status(404).json({ error: 'Not found' });
      
      coupon.status = 'redeemed';
      coupon.redeemedAt = Date.now();
      await redis.set(`coupons:${coupleId}`, coupons);

      // Log event
      const user = await redis.get(`user:${telegramId}`);
      const event = {
        id: Math.random().toString(36).substring(2, 9),
        icon: '✨',
        text: `${user.firstName} использовал купон: ${coupon.title}`,
        createdAt: Date.now()
      };
      const events = await redis.get(`events:${coupleId}`) || [];
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
