const redis = require('../lib/db');
const bot = require('../lib/utils/bot');

module.exports = async (req, res) => {
    // Vercel Cron will hit this endpoint via GET
    try {
        const couples = await redis.smembers('couples:all');
        if (!couples || couples.length === 0) return res.status(200).json({ status: 'no couples' });

        const today = new Date().toISOString().split('T')[0];

        for (const coupleId of couples) {
            const couple = await redis.get(`couple:${coupleId}`);
            if (!couple || !couple.partnerData) continue;

            // Optional: check plans for today
            const plansHash = await redis.hgetall(`plans:${coupleId}`);
            let plans = plansHash ? Object.values(plansHash) : [];
            plans = plans.map(p => typeof p === 'string' ? JSON.parse(p) : p);
            
            const todayPlans = plans.filter(p => !p.isDone && (p.date === today || p.type === 'day'));

            let message = "Доброе утро! 💕 Зайдите в LoveSpace, чтобы посмотреть Вопрос дня, обновить статус и выполнить задания партнера.";
            if (todayPlans.length > 0) {
                message += `\n\n📌 <b>У вас есть планы на сегодня (${todayPlans.length}):</b>\n`;
                todayPlans.forEach(p => {
                    message += `- <i>${p.text}</i>\n`;
                });
            }

            // Send to both partners
            for (const userId in couple.partnerData) {
                const tgId = couple.partnerData[userId].telegramId;
                if (tgId) {
                    await bot.sendMessage(tgId, message);
                }
            }
        }

        res.status(200).json({ status: 'ok', couplesCount: couples.length });
    } catch (e) {
        console.error('Cron error', e);
        res.status(500).json({ error: 'Cron error' });
    }
};
