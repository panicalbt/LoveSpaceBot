const redis = require('../db');
const questionsList = [
    "Какое ваше любимое совместное воспоминание за этот год?",
    "Что вас сегодня больше всего рассмешило?",
    "Какой фильм или сериал описывает наши отношения?",
    "Если бы мы могли поехать куда угодно прямо сейчас, куда бы мы отправились?",
    "Что во мне вам больше всего нравится?",
    "Какая ваша самая смешная детская история?",
    "Что самое лучшее произошло с вами на этой неделе?",
    "Какой ваш любимый способ расслабиться после тяжелого дня?",
    "Если бы у нас был свободный день без обязательств, как бы мы его провели?",
    "Какая наша общая традиция вам нравится больше всего?"
];

module.exports = async (req, res) => {
    try {
        const { coupleId } = req.method === 'GET' ? req.query : req.body;
        if (!coupleId) return res.status(400).json({error: "coupleId required"});
        
        // Use current date string as a key
        const todayStr = new Date().toISOString().split('T')[0];
        
        // Pick a question based on days since epoch so it changes every day
        const dayIndex = Math.floor(Date.now() / 86400000) % questionsList.length;
        const text = questionsList[dayIndex];
        const questionKey = `questions:${coupleId}:${todayStr}`;

        if (req.method === 'GET') {
            let data = await redis.get(questionKey);
            if (!data) data = { text, answers: {} };
            return res.status(200).json(data);
        }

        if (req.method === 'POST') {
            const { telegramId, answer } = req.body;
            let user = await redis.get(`user:${telegramId}`);
            if(!user) return res.status(404).json({error: "User not found"});

            let data = await redis.get(questionKey);
            if (!data) data = { text, answers: {} };
            
            data.answers[user.id] = answer;
            await redis.set(questionKey, data);
            
            return res.status(200).json(data);
        }
    } catch(e) {
        console.error(e);
        res.status(500).json({error: "DB Error"});
    }
}
