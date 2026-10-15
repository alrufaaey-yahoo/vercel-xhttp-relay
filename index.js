const http = require('http');
const { relay } = require('./relay');

const port = Number(process.env.PORT || 3000);
http.createServer(relay).listen(port, () => {
  console.log(`Local relay listening on http://localhost:${port}`);
});
