const http = require('http'), fs = require('fs'), path = require('path');
const { handle } = require('./handler');
http.createServer((req, res) => {
  if (req.url.startsWith('/api/')) return handle(req, res);
  if(req.url==='/brand.png'){res.setHeader('content-type','image/png');return res.end(fs.readFileSync(path.join(__dirname,'public','brand.png')));} const f = req.url.startsWith('/admin') ? 'admin.html' : req.url.startsWith('/reset') ? 'reset.html' : null;
  if (!f) { res.statusCode = 404; return res.end('not found'); }
  res.setHeader('content-type', 'text/html; charset=utf-8'); res.end(fs.readFileSync(path.join(__dirname, 'public', f)));
}).listen(process.env.PORT || 3000, () => console.log('listening'));
