const redis = require('../db');

module.exports = async (req, res) => {
  const { coupleId } = req.method === 'GET' ? req.query : req.body;
  if (!coupleId) return res.status(400).json({ error: 'coupleId required' });

  try {
    if (req.method === 'GET') {
      const canvas = await redis.get(`canvas:${coupleId}`) || { strokes: [] };
      return res.status(200).json(canvas);
    }

    if (req.method === 'POST') {
      const { action, stroke, authorId } = req.body;

      if (action === 'addStroke') {
        if (!stroke) return res.status(400).json({ error: 'stroke required' });
        let canvas = await redis.get(`canvas:${coupleId}`) || { strokes: [] };
        canvas.strokes.push({ ...stroke, authorId, createdAt: Date.now() });
        // Keep last 500 strokes to avoid oversized data
        if (canvas.strokes.length > 500) {
          canvas.strokes = canvas.strokes.slice(-500);
        }
        await redis.set(`canvas:${coupleId}`, canvas);
        return res.status(200).json({ success: true });
      }

      if (action === 'clear') {
        await redis.set(`canvas:${coupleId}`, { strokes: [] });
        return res.status(200).json({ success: true });
      }

      if (action === 'saveToTimeline') {
        // Save canvas image as a memory
        const { imageData } = req.body;
        if (!imageData) return res.status(400).json({ error: 'imageData required' });
        
        const crypto = require('crypto');
        let mems = await redis.get(`memories:${coupleId}`) || [];
        const mem = {
          id: crypto.randomUUID(),
          text: 'Совместный рисунок 🎨',
          emoji: '🎨',
          date: new Date().toISOString().split('T')[0],
          photo: imageData,
          authorId,
          createdAt: Date.now()
        };
        mems.push(mem);
        await redis.set(`memories:${coupleId}`, mems);

        // Clear canvas after saving
        await redis.set(`canvas:${coupleId}`, { strokes: [] });
        return res.status(200).json(mem);
      }
    }

    res.status(400).json({ error: 'Invalid action' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'DB Error' });
  }
};
