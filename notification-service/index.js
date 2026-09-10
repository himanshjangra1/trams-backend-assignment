import { connect, StringCodec } from 'nats';
import dotenv from 'dotenv';

dotenv.config();

const NATS_URL = process.env.NATS_URL || 'nats://localhost:4222';
const sc = StringCodec();

async function start() {
  try {
    const nc = await connect({ servers: NATS_URL });
    console.log('[Notification Service] Connected to NATS');

    // Subscribe to 'user.created' events asynchronously
    const sub = nc.subscribe('user.created');
    console.log('[Notification Service] Listening for "user.created" events...');

    for await (const msg of sub) {
      try {
        const user = JSON.parse(sc.decode(msg.data));
        console.log(`\n==================================================`);
        console.log(`[NOTIFICATION SERVICE] Sending welcome email...`);
        console.log(`To: ${user.email}`);
        console.log(`Subject: Welcome aboard, ${user.name}!`);
        console.log(`==================================================\n`);
      } catch (err) {
        console.error('[Notification Service] Error processing notification:', err);
      }
    }
  } catch (err) {
    console.error('[Notification Service] Connection failed:', err);
    setTimeout(start, 3000);
  }
}

start();
