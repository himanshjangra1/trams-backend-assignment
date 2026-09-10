import express from 'express';
import { connect, StringCodec } from 'nats';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const NATS_URL = process.env.NATS_URL || 'nats://localhost:4222';
const API_KEY = process.env.API_KEY || 'default-secret-key';

const sc = StringCodec();
let nc;

// Connect to NATS Broker
async function connectNats() {
  try {
    nc = await connect({ servers: NATS_URL });
    console.log('[API Gateway] Connected to NATS');
  } catch (err) {
    console.error('[API Gateway] Failed to connect to NATS:', err);
    setTimeout(connectNats, 3000); // Retry connection
  }
}
connectNats();

// Security Middleware: API Key Authentication
app.use((req, res, next) => {
  const clientKey = req.headers['x-api-key'];
  if (!clientKey || clientKey !== API_KEY) {
    return res.status(401).json({ error: 'Unauthorized: Invalid API Key' });
  }
  next();
});

// Endpoint: POST /api/users
app.post('/api/users', async (req, res) => {
  const { name, email } = req.body;

  if (!name || !email) {
    return res.status(400).json({ error: 'Name and email are required.' });
  }

  try {
    const payload = JSON.stringify({ name, email });
    // Send request to User Service over NATS with a 5 second timeout
    const response = await nc.request('user.create', sc.encode(payload), { timeout: 5000 });
    const result = JSON.parse(sc.decode(response.data));

    return res.status(201).json(result);
  } catch (err) {
    console.error('[API Gateway] Error processing user creation:', err.message);
    return res.status(500).json({ error: 'User service unavailable or timed out.' });
  }
});

app.listen(PORT, () => {
  console.log(`[API Gateway] Running on http://localhost:${PORT}`);
});
