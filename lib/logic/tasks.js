const redis = require('../db');
const crypto = require('crypto');
const bot = require('../utils/bot');
const { notifyPartner } = require('../utils/notify');

module.exports = async (req, res) => {
  try {
    if (req.method === 'GET') {
      const { coupleId } = req.query;
      if (!coupleId) return res.status(400).json({ error: 'coupleId required' });
      const tasksHash = await redis.hgetall(`tasks:${coupleId}`);
      let tasks = tasksHash ? Object.values(tasksHash) : [];
      tasks = tasks.map(t => typeof t === 'string' ? JSON.parse(t) : t);
      return res.status(200).json(tasks);
    }

    if (req.method === 'POST') {
      const { title, points, coupleId, action, taskId, telegramId } = req.body;
      let user = await redis.get(`user:${telegramId}`);
      if (!user) return res.status(400).json({error: "User not found"});

      if (action === 'create') {
        const id = crypto.randomUUID();
        const task = { id, title, points: parseInt(points), status: 'active', creatorId: user.id, createdAt: Date.now() };
        await redis.hset(`tasks:${coupleId}`, { [id]: task });
        
        // Notify partner
        await notifyPartner(coupleId, user.id, `📝 <b>Новое задание!</b>\nПартнер поручил вам: <i>${title}</i> за ${points}💎`);

        return res.status(200).json(task);
      }
      
      if (action === 'submit_for_review') {
        let task = await redis.hget(`tasks:${coupleId}`, taskId);
        if(!task) return res.status(404).json({error: "Task not found"});
        if(typeof task === 'string') task = JSON.parse(task);
        if (task.creatorId === user.id) return res.status(400).json({error: "Вы не можете выполнять свое же задание"});
        
        task.status = 'review';
        task.executorTelegramId = telegramId;
        await redis.hset(`tasks:${coupleId}`, { [taskId]: task });

        // Notify creator
        await notifyPartner(coupleId, user.id, `⏳ <b>Задание на проверке</b>\nПартнер выполнил задание <i>${task.title}</i>. Зайдите в приложение, чтобы принять его!`);

        return res.status(200).json(task);
      }

      if (action === 'approve') {
        let task = await redis.hget(`tasks:${coupleId}`, taskId);
        if(!task) return res.status(404).json({error: "Task not found"});
        if(typeof task === 'string') task = JSON.parse(task);
        if (task.creatorId !== user.id) return res.status(400).json({error: "Только создатель может принять задание"});
        
        task.status = 'done';
        await redis.hset(`tasks:${coupleId}`, { [taskId]: task });
        
        if (task.executorTelegramId) {
           let executor = await redis.get(`user:${task.executorTelegramId}`);
           if (executor) {
              executor.balance += task.points;
              await redis.set(`user:${task.executorTelegramId}`, executor);
              
              // Sync to partnerData
              const couple = await redis.get(`couple:${coupleId}`);
              if (couple) {
                 if (!couple.partnerData) couple.partnerData = {};
                 if (!couple.partnerData[executor.id]) couple.partnerData[executor.id] = {};
                 couple.partnerData[executor.id].balance = executor.balance;
                 await redis.set(`couple:${coupleId}`, couple);
              }

              bot.sendMessage(task.executorTelegramId, `✅ <b>Задание принято!</b>\nВам начислено ${task.points}💎 за <i>${task.title}</i>`);
           }
        }
        return res.status(200).json(task);
      }

      if (action === 'reject') {
        let task = await redis.hget(`tasks:${coupleId}`, taskId);
        if(!task) return res.status(404).json({error: "Task not found"});
        if(typeof task === 'string') task = JSON.parse(task);
        
        task.status = 'active';
        delete task.executorTelegramId;
        await redis.hset(`tasks:${coupleId}`, { [taskId]: task });

        await notifyPartner(coupleId, user.id, `❌ <b>Задание отклонено</b>\nВаше выполнение <i>${task.title}</i> было отклонено.`);

        return res.status(200).json(task);
      }

      if (action === 'delete') {
         await redis.hdel(`tasks:${coupleId}`, taskId);
         return res.status(200).json({ success: true });
      }
      return res.status(400).json({ error: 'Invalid action' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'DB Error' });
  }
};
