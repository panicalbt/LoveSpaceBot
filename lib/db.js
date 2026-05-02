const { Redis } = require('@upstash/redis');

let redis;
if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });
} else {
  // If no env variables are set, we create a proxy that throws an error
  redis = new Proxy({}, {
    get: function() {
      throw new Error("ОШИБКА: Не добавлены ключи Upstash Redis (UPSTASH_REDIS_REST_URL) в переменные окружения Vercel!");
    }
  });
}

module.exports = redis;
