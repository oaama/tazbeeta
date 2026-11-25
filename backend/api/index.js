// Vercel / Netlify-style serverless entry: all /api/* requests route here.
module.exports = (req, res) => require('../handler').handle(req, res);
