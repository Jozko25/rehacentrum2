const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.json({ 
    message: 'Minimal server is working!',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Minimal health check' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Minimal server running on 0.0.0.0:${PORT}`);
});