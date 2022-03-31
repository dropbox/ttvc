import path from 'path';

import express from 'express';

const __dirname = path.dirname(new URL(import.meta.url).pathname);
const PORT = process.env.PORT ?? 3000;

const app = express();

// disable browser cache
app.use((req, res, next) => {
  res.header('Cache-Control', 'no-cache');
  res.header('Vary', '*'); // macOS safari doesn't respect Cache-Control
  next();
});

// Pass a query parameter to artificially delay request handling
// e.g. localhost:3000/api/hello?delay=1000
app.use(({query}, res, next) => {
  if (typeof query?.delay === 'string') {
    setTimeout(next, Number.parseInt(query.delay));
  } else {
    next();
  }
});

// allow loading static assets from the server's /public directory
app.use(express.static(path.join(__dirname, 'public')));
// allow loading compiled library code from /dist
app.use('/dist', express.static(path.join(__dirname, '../../dist')));
// allow loading libraries from node_modules
app.use('/node_modules', express.static(path.join(__dirname, '../../node_modules')));

// app.get('/', (req, res) => {
//   // TODO: show something useful?
// });

// For parsing application/json
app.use(express.json());

// respond to API requests
app.get('/api', (req, res) => {
  res.send('hello world!');
});
// if a request is made with the POST method, return the request body in the response
app.post('/api', (req, res) => {
  res.json(req.body);
});

app.get('/test/:view', ({params}, res) => {
  const view = params.view;
  res.sendFile(`test/e2e/${view}/index.html`, {root: '.'});
});

app.listen(PORT, () => {
  console.log(`test:server listening on http://localhost:${PORT}`);
});
