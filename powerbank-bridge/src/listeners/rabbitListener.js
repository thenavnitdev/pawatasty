const { getChannel } = require('../config/rabbitmq');
const { handleEvent } = require('../services/eventHandler');

const QUEUE = 'device_events';

function startRabbitListener() {
  const channel = getChannel();

  channel.consume(QUEUE, async (msg) => {
    if (!msg) return;

    console.log(`[rabbitListener] Raw message from queue "${QUEUE}":`, msg.content.toString());

    try {
      const event = JSON.parse(msg.content.toString());
      await handleEvent(event);
      channel.ack(msg);
    } catch (err) {
      console.error('[rabbitListener] Failed to process message:', err.message);
      // Nack without requeue — prevent poison-pill loops
      channel.nack(msg, false, false);
    }
  });

  console.log(`[rabbitListener] Consuming queue "${QUEUE}"`);
}

module.exports = { startRabbitListener };
