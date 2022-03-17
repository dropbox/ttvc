import path from 'path';

import express from 'express';

const __dirname = path.dirname(new URL(import.meta.url).pathname);
const PORT = process.env.PORT ?? 3000;

const app = express();

// disable browser cache
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-cache');
  next();
});

// Pass a query parameter to artificially delay request handling
// e.g. localhost:3000/api/hello?delay=1000
app.use((req, res, next) => {
  if (req.query && req.query.delay) {
    setTimeout(next, req.query.delay);
  } else {
    next();
  }
});

app.use(express.static(path.join(__dirname, 'public')));
app.use('/dist', express.static(path.join(__dirname, '../../dist')));

// app.get('/', (req, res) => {
//   // TODO: show something useful?
// });

app.get('/api/hello', (req, res) => {
  res.send('world');
});

app.get('/test/:view', ({query, params}, res) => {
  const view = params.view;
  res.sendFile(`public/${view}.html`, {root: __dirname});
});

app.listen(PORT, () => {
  console.log(`test:server listening on http://localhost:${PORT}`);
});
