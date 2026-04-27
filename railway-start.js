const { createServer } = require('http');
const next = require('next');

const dev = false;                   // production mode
const app = next({ dev });
const handle = app.getRequestHandler();

const port = process.env.PORT || 8080;
const host = '0.0.0.0';

app.prepare().then(() => {
  createServer((req, res) => {
    handle(req, res);
  }).listen(port, host, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://${host}:${port}`);
  });
});