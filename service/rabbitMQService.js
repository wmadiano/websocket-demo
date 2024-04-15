// rabbitMQService.js
const amqp = require('amqplib');
const env = require('dotenv').config();

async function startConsumer(queueName, processMessageCallback) {
    const connectionString = process.env.AMQP_CONNECTION_STRING;
    const connection = await amqp.connect(connectionString);
    const channel = await connection.createChannel();
    await channel.assertQueue(queueName, { durable: true });
    console.log(`Waiting for messages in ${queueName}. To exit press CTRL+C`);

    channel.consume(queueName, async (msg) => {
        if (msg !== null) {
            await processMessageCallback(msg);
            channel.ack(msg);
        }
    });

    return { channel, connection }; // Returning these to possibly close them outside this function
}

async function publishToQueue(queueName, data) {
    const connectionString = process.env.AMQP_CONNECTION_STRING;
    const connection = await amqp.connect(connectionString);
    const channel = await connection.createChannel();
    await channel.assertQueue(queueName, { durable: true });
    channel.sendToQueue(queueName, Buffer.from(JSON.stringify(data)), { persistent: true });
    console.log("Published to queue " + queueName);
    await channel.close();
    await connection.close();
  }

module.exports = { startConsumer, publishToQueue};
