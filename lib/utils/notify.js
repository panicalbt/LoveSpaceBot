const redis = require('../db');
const bot = require('./bot');

async function notifyPartner(coupleId, authorId, message) {
    if (!coupleId || !authorId || !message) return;
    try {
        const couple = await redis.get(`couple:${coupleId}`);
        if (!couple || !couple.partnerData) return;
        
        const partnerId = couple.users.find(id => id !== authorId);
        if (partnerId && couple.partnerData[partnerId] && couple.partnerData[partnerId].telegramId) {
            await bot.sendMessage(couple.partnerData[partnerId].telegramId, message);
        }
    } catch (e) {
        console.error("Notify error:", e);
    }
}

module.exports = { notifyPartner };
