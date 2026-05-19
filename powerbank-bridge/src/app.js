const express = require('express');

const rentRoutes = require('./routes/rent');
const deviceRoutes = require('./routes/device');
const cabinetRoutes = require('./routes/cabinet');

const app = express();

app.use(express.json());

app.get('/', (_req, res) => {
  res.json({
    name: 'powerbank-bridge',
    status: 'ok',
    health: '/health',
    api: ['/api/rent', '/api/device', '/api/cabinet'],
  });
});

app.get('/health', (_req, res) => {
  res.json({ success: true, status: 'ok', ts: Date.now() });
});

app.use('/api/rent', rentRoutes);
app.use('/api/device', deviceRoutes);
app.use('/api/cabinet', cabinetRoutes);

app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Route not found' });
});

module.exports = app;
