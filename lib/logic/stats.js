const redis = require('../db');

module.exports = async (req, res) => {
  const { coupleId } = req.method === 'GET' ? req.query : req.body;
  if (!coupleId) return res.status(400).json({ error: 'coupleId required' });

  try {
    // Gather all data in parallel
    const [couple, tasks, wishes, plans, memories, events] = await Promise.all([
      redis.get(`couple:${coupleId}`),
      redis.get(`tasks:${coupleId}`) || [],
      redis.get(`wishes:${coupleId}`) || [],
      redis.get(`plans:${coupleId}`) || [],
      redis.get(`memories:${coupleId}`) || [],
      redis.lrange(`events:${coupleId}`, 0, -1) || []
    ]);

    const tasksList = tasks || [];
    const wishesList = wishes || [];
    const plansList = plans || [];
    const memoriesList = memories || [];
    const eventsList = events || [];

    // Calculate stats
    const completedTasks = tasksList.filter(t => t.status === 'done').length;
    const totalTasks = tasksList.length;
    const boughtWishes = wishesList.filter(w => w.isBought).length;
    const totalWishes = wishesList.length;
    const completedPlans = plansList.filter(p => p.isDone).length;
    const totalPlans = plansList.length;
    const totalMemories = memoriesList.length;
    const totalEvents = eventsList.length;

    // Total crystals earned (sum of completed task points)
    const totalCrystalsEarned = tasksList
      .filter(t => t.status === 'done')
      .reduce((sum, t) => sum + (parseInt(t.points) || 0), 0);

    // Total crystals spent on wishes
    const totalCrystalsSpent = wishesList
      .filter(w => w.isBought)
      .reduce((sum, w) => sum + (parseInt(w.points) || 0), 0);

    // Mood stats from events (last 30 days)
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const moodEvents = eventsList.filter(e => 
      e.text && e.text.startsWith('Чувствует себя:') && e.createdAt > thirtyDaysAgo
    );
    const moodCounts = {};
    moodEvents.forEach(e => {
      const mood = e.text.replace('Чувствует себя: ', '').trim();
      moodCounts[mood] = (moodCounts[mood] || 0) + 1;
    });

    // Activity heatmap (last 7 days)
    const activityByDay = {};
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      activityByDay[key] = 0;
    }
    eventsList.forEach(e => {
      if (e.createdAt) {
        const d = new Date(e.createdAt).toISOString().split('T')[0];
        if (activityByDay.hasOwnProperty(d)) {
          activityByDay[d]++;
        }
      }
    });

    // Streaks info
    let maxStreak = 0;
    if (couple && couple.partnerData) {
      Object.values(couple.partnerData).forEach(p => {
        if (p.streak && p.streak > maxStreak) maxStreak = p.streak;
      });
    }

    const createdAt = couple ? couple.createdAt : null;

    return res.status(200).json({
      createdAt,
      completedTasks,
      totalTasks,
      boughtWishes,
      totalWishes,
      completedPlans,
      totalPlans,
      totalMemories,
      totalEvents,
      totalCrystalsEarned,
      totalCrystalsSpent,
      moodCounts,
      activityByDay,
      maxStreak
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'DB Error' });
  }
};
