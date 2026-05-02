const path = require('path');

module.exports = async (req, res) => {
  // Extract the endpoint name from the URL
  // Example: /api/auth -> auth
  // Example: /api/data?type=tasks -> data
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;
  let endpoint = pathname.split('/').pop();

  // Special case for root /api or trailing slash
  if (!endpoint || endpoint === 'api') {
    return res.status(200).json({ status: 'LoveSpace API is running' });
  }

  // Handle /api/data special routing
  if (endpoint === 'data') {
    endpoint = req.query.type || 'data_handler';
  }

  try {
    console.log(`Routing to: ${endpoint}`);
    const handler = require(`../lib/logic/${endpoint}.js`);
    return await handler(req, res);
  } catch (error) {
    console.error(`Error routing to ${endpoint}:`, error);
    return res.status(404).json({ error: `Endpoint ${endpoint} not found` });
  }
};
