const crypto = require('crypto');

function verifyTelegramAuth(initData, botToken) {
  try {
    const urlParams = new URLSearchParams(initData);
    const hash = urlParams.get('hash');
    urlParams.delete('hash');
    
    const dataCheckString = Array.from(urlParams.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');
      
    const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
    const calculatedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
    
    return calculatedHash === hash;
  } catch (e) {
    return false;
  }
}

function getUserData(initData) {
  try {
    const urlParams = new URLSearchParams(initData);
    const user = urlParams.get('user');
    if (user) {
      return JSON.parse(decodeURIComponent(user));
    }
  } catch (e) {
    console.error('Failed to parse initData user', e);
  }
  return null;
}

module.exports = { verifyTelegramAuth, getUserData };
