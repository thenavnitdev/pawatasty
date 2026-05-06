require('dotenv').config();

const app = require('./src/app');
const { connectRabbitMQ } = require('./src/config/rabbitmq');
const { startRabbitListener } = require('./src/listeners/rabbitListener');

const PORT = process.env.PORT || 3000;

async function start() {
  try {
    await connectRabbitMQ();
    console.log('[server] RabbitMQ connected');

    startRabbitListener();
    console.log('[server] RabbitMQ listener started');

    app.listen(PORT, () => {
      console.log(`[server] Bridge server running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('[server] Fatal startup error');
    console.error(err && err.stack ? err.stack : err);
    if (err && err.code) console.error('[server] code:', err.code);
    if (err && err.errors) err.errors.forEach((e, i) => console.error(`[server] cause[${i}]:`, e));
    process.exit(1);
  }
}

start();
