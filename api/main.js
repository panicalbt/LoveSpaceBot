module.exports = async (req, res) => {
  const { type } = req.query;
  if (!type || !/^[a-z_]+$/.test(type)) {
    return res.status(400).json({ error: 'Invalid type' });
  }

  try {
    // Basic security check to ensure we only load from logic folder
    const handler = require(`../lib/logic/${type}.js`);
    if (typeof handler !== 'function') {
      return res.status(500).json({ error: 'Handler is not a function' });
    }
    return await handler(req, res);
  } catch (e) {
    console.error(`Error in Hub [${type}]:`, e);
    // Handle cases where file doesn't exist
    if (e.code === 'MODULE_NOT_FOUND') {
      return res.status(404).json({ error: `Feature '${type}' not implemented` });
    }
    return res.status(500).json({ error: 'Server Hub Error' });
  }
};
