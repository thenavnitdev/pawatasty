require('dotenv').config();

const app = require('./src/app');
const { connectRabbitMQ } = require('./src/config/rabbitmq');
const { startRabbitListener } = require('./src/listeners/rabbitListener');

const PORT = process.env.PORT || 3000;

async function start() {
  app.listen(PORT, () => {
    console.log(`[server] Bridge server listening on port ${PORT}`);
  });

  try {
    await connectRabbitMQ();
    console.log('[server] RabbitMQ connected');
    startRabbitListener();
    console.log('[server] RabbitMQ listener started');
  } catch (err) {
    console.error('[server] RabbitMQ unavailable — HTTP API is up, device events disabled');
    console.error(err && err.stack ? err.stack : err);
  }
}

process.on('unhandledRejection', (err) => {
  console.error('[server] unhandledRejection:', err);
});

start();
