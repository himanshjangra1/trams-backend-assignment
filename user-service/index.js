import { connect, StringCodec } from 'nats';
import dotenv from 'dotenv';

dotenv.config();

const NATS_URL = process.env.NATS_URL || 'nats://localhost:4222';
const sc = StringCodec();

// In-memory user database simulation
const users = [];

async function start() {
  try {
    const nc = await connect({ servers: NATS_URL });
    console.log('[User Service] Connected to NATS');

    // Subscribe to incoming user creation requests (Request-Reply Pattern)
    const sub = nc.subscribe('user.create');
    console.log('[User Service] Listening for "user.create" requests...');

    for await (const msg of sub) {
      try {
        const data = JSON.parse(sc.decode(msg.data));
        const newUser = { id: users.length + 1, name: data.name, email: data.email, createdAt: new Date() };
        users.push(newUser);

        console.log(`[User Service] User saved: ${newUser.email}`);

        // 1. Respond back to API Gateway
        msg.respond(sc.encode(JSON.stringify({ status: 'success', user: newUser })));

        // 2. Publish an asynchronous event to NATS for Notification Service
        nc.publish('user.created', sc.encode(JSON.stringify(newUser)));
        console.log(`[User Service] Published "user.created" event for ID: ${newUser.id}`);

      } catch (err) {
        console.error('[User Service] Error handling message:', err);
        msg.respond(sc.encode(JSON.stringify({ status: 'error', message: 'Failed to create user' })));
      }
    }
  } catch (err) {
    console.error('[User Service] Connection failed:', err);
    setTimeout(start, 3000);
  }
}

start();
