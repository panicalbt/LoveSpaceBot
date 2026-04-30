const { Redis } = require('@upstash/redis');

let redis;
if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });
} else {
  // Mock Redis for local dev without credentials
  const mem = {};
  redis = {
    get: async (k) => mem[k] || null,
    set: async (k, v) => { mem[k] = v; return "OK"; },
    hgetall: async (k) => mem[k] || null,
    hset: async (k, obj) => { mem[k] = { ...(mem[k]||{}), ...obj }; return 1; },
    hdel: async (k, f) => { if(mem[k]) delete mem[k][f]; return 1; }
  };
}

module.exports = redis;
