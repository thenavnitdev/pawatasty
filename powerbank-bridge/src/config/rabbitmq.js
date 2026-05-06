const amqplib = require('amqplib');

let channel = null;

async function connectRabbitMQ() {
  const connection = await amqplib.connect(
    process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672'
  );
  channel = await connection.createChannel();
  await channel.assertQueue('device_events', { durable: true });
  return channel;
}

function getChannel() {
  if (!channel) {
    throw new Error('[rabbitmq] Channel not initialised — call connectRabbitMQ() first');
  }
  return channel;
}

module.exports = { connectRabbitMQ, getChannel };
