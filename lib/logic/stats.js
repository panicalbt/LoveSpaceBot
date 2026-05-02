const redis = require('../db');

module.exports = async (req, res) => {
  const { coupleId } = req.method === 'GET' ? req.query : req.body;
  if (!coupleId) return res.status(400).json({ error: 'coupleId required' });

  try {
    // Gather all data in parallel
    const [coupleRaw, tasks, wishes, plans, memories, events] = await Promise.all([
      redis.get(`couple:${coupleId}`),
      redis.get(`tasks:${coupleId}`) || [],
      redis.get(`wishes:${coupleId}`) || [],
      redis.get(`plans:${coupleId}`) || [],
      redis.get(`memories:${coupleId}`) || [],
      redis.get(`events:${coupleId}`) || []
    ]);

    let couple = coupleRaw;
    if (typeof couple === 'string') {
      try { couple = JSON.parse(couple); } catch(e) { console.error('COUPLE_PARSE_ERROR', e); }
    }

    // Helper to ensure we have an array
    const ensureArray = (data) => {
      if (!data) return [];
      if (Array.isArray(data)) return data;
      try {
        const parsed = JSON.parse(data);
        return Array.isArray(parsed) ? parsed : [parsed];
      } catch (e) {
        return [];
      }
    };

    const tasksList = ensureArray(tasks);
    const wishesList = ensureArray(wishes);
    const plansList = ensureArray(plans);
    const memoriesList = ensureArray(memories);
    const eventsList = ensureArray(events);

    // Calculate stats
    const completedTasks = tasksList.filter(t => t && t.status === 'done').length;
    const totalTasks = tasksList.length;
    const boughtWishes = wishesList.filter(w => w && w.isBought).length;
    const totalWishes = wishesList.length;
    const completedPlans = plansList.filter(p => p && p.isDone).length;
    const totalPlans = plansList.length;
    const totalMemories = memoriesList.length;
    const totalEvents = eventsList.length;

    // Total crystals earned (sum of completed task points)
    const totalCrystalsEarned = tasksList
      .filter(t => t && t.status === 'done')
      .reduce((sum, t) => sum + (parseInt(t.points) || 0), 0);

    // Total crystals spent on wishes
    const totalCrystalsSpent = wishesList
      .filter(w => w && w.isBought)
      .reduce((sum, w) => sum + (parseInt(w.points) || 0), 0);

    // Mood stats from events (last 30 days)
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const moodEvents = eventsList.filter(e => {
        if (!e) return false;
        let eventObj = e;
        if (typeof e === 'string') {
            try { eventObj = JSON.parse(e); } catch(err) { return false; }
        }
        return eventObj.text && eventObj.text.startsWith('Чувствует себя:') && eventObj.createdAt > thirtyDaysAgo;
    }).map(e => typeof e === 'string' ? JSON.parse(e) : e);

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
      let eventObj = e;
      if (typeof e === 'string') {
          try { eventObj = JSON.parse(e); } catch(err) { return; }
      }
      if (eventObj && eventObj.createdAt) {
        const d = new Date(eventObj.createdAt).toISOString().split('T')[0];
        if (activityByDay.hasOwnProperty(d)) {
          activityByDay[d]++;
        }
      }
    });

    // Streaks info
    let maxStreak = 0;
    if (couple && couple.partnerData) {
      Object.values(couple.partnerData).forEach(p => {
        if (p && p.streak && p.streak > maxStreak) maxStreak = p.streak;
      });
    }

    const createdAt = couple ? (couple.startDate || couple.createdAt) : null;

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
    console.error('STATS_ERROR:', error);
    res.status(500).json({ error: 'DB Error', details: error.message });
  }
};
