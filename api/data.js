module.exports = async (req, res) => {
  const { type } = req.query;
  if (!type || !/^[a-z]+$/.test(type)) return res.status(400).json({ error: 'Invalid type' });

  try {
    const handler = require(`./_logic/${type}.js`);
    return await handler(req, res);
  } catch (e) {
    console.error(`Error routing to ${type}:`, e);
    return res.status(404).json({ error: `Handler for ${type} not found` });
  }
};
