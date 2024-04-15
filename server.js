const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const { startConsumer } = require('./service/rabbitMQService');

const app = express();
const server = http.createServer(app);

app.use(express.static('public'));

const wss = new WebSocket.Server({ server });
let clientCount = 0;
let queueConnection = null; // Store the connection and channel

// Function to manage RabbitMQ consumer based on client count
async function manageRabbitMQConsumer() {
    const queueName = 'logsQueue'; // Set your queue name here

    // Start consumer if first client connects
    if (clientCount === 1) {
        queueConnection = await startConsumer(queueName, (msg) => {
            const content = msg.content.toString();
            console.log('Received message from queue:', content);
            broadcastMessage(content); // Send message to all connected WebSocket clients
        });
    }

    // Close consumer if last client disconnects
    if (clientCount === 0 && queueConnection) {
        console.log('Closing RabbitMQ connection as no clients are connected.');
        await queueConnection.channel.close();
        await queueConnection.connection.close();
        queueConnection = null;
    }
}

wss.on('connection', function connection(ws) {
    console.log('A new WebSocket client connected!');
    clientCount++;
    manageRabbitMQConsumer().catch(console.error);

    ws.on('close', () => {
        console.log('Client has disconnected.');
        clientCount--;
        manageRabbitMQConsumer().catch(console.error);
    });
});

// Function to send messages to all connected clients
function broadcastMessage(message) {
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });
}

const PORT = 4000;
server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
