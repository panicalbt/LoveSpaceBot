module.exports = {
   sendMessage: async (chatId, text) => {
      const token = process.env.TELEGRAM_BOT_TOKEN;
      if (!token || !chatId) return;
      try {
         // Use dynamic import for node-fetch if running in older Node, 
         // but Vercel Node 18+ has native fetch
         await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ chat_id: chatId, text: text, parse_mode: 'HTML' })
         });
      } catch(e) { 
         console.error("Bot API error", e); 
      }
   }
};
