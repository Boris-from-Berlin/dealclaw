const jwt = require('jsonwebtoken');

function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }

  const token = authHeader.split(' ')[1];
  if (!token.startsWith('dealclaw_')) {
    return res.status(401).json({ error: 'Invalid API key format. Expected prefix: dealclaw_' });
  }

  try {
    const decoded = jwt.verify(token.replace('dealclaw_', ''), process.env.JWT_SECRET);
    req.agent = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired API key' });
  }
}

module.exports = { authenticate };
