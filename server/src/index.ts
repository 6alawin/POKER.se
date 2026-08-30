import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import pool from './db';
import { InitDB } from './db/initdb';
import userRoutes from './routes/users';
import { createRoomsRouter } from "./routes/rooms";


dotenv.config();

const firebaseProjectId = process.env.FIREBASE_PROJECT_ID;
const firebaseClientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const firebasePrivateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
const firebaseAdminReady = Boolean(firebaseProjectId && firebaseClientEmail && firebasePrivateKey);

if (firebaseAdminReady && getApps().length === 0) {
  initializeApp({ credential: cert({ projectId: firebaseProjectId, clientEmail: firebaseClientEmail, privateKey: firebasePrivateKey }) });
}

const app = express();
const clientOrigin = process.env.CLIENT_ORIGIN ?? 'http://localhost:5173';
const allowedOrigins = new Set([clientOrigin, 'http://localhost:5173', 'http://localhost:5174']);

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin)) return callback(null, true);
    return callback(new Error(`Origin ${origin} is not allowed by CORS.`));
  },
}));
app.use(express.json());
app.use('/api/users', userRoutes);


app.get('/', (_req, res) => {
  res.json({ message: 'Poker.io server is running' });
});

function getIdToken(req: express.Request, bodyToken: unknown): string | null {
  if (typeof bodyToken === 'string' && bodyToken) return bodyToken;
  const authorization = req.headers.authorization;
  if (!authorization?.startsWith('Bearer ')) return null;
  const token = authorization.slice('Bearer '.length).trim();
  return token || null;
}

app.post('/auth/verify', async (req, res) => {
  const { idToken: bodyToken } = req.body as { idToken?: unknown };
  const idToken = getIdToken(req, bodyToken);
  if (!idToken) return res.status(400).json({ message: 'A Firebase ID token is required.' });
  if (!firebaseAdminReady) return res.status(503).json({ message: 'Firebase Admin is not configured on this server.' });

  try {
    const decodedToken = await getAuth().verifyIdToken(idToken);
    const profile = await pool.query('SELECT * FROM "user" WHERE uid = $1', [decodedToken.uid]);
    const user = profile.rows[0];

    return res.status(200).json({
      uid: decodedToken.uid,
      email: decodedToken.email ?? null,
      name: decodedToken.name ?? null,
      picture: decodedToken.picture ?? null,
      username: user?.username ?? null,
      user: user ?? null,
      needsUsername: profile.rowCount === 0,
    });
  } catch (error) {
    console.error('AUTH VERIFY ERROR:', error);
    return res.status(401).json({ message: 'Invalid token or database lookup failed.' });
  }
});

app.post('/auth/profile', async (req, res) => {
  const { idToken: bodyToken, username } = req.body as { idToken?: unknown; username?: unknown };
  const idToken = getIdToken(req, bodyToken);
  if (typeof idToken !== 'string' || typeof username !== 'string') return res.status(400).json({ message: 'ID token and username are required.' });
  const cleanUsername = username.trim();
  if (!/^[a-zA-Z0-9_]{3,16}$/.test(cleanUsername)) return res.status(400).json({ message: 'Username must be 3–16 letters, numbers, or underscores.' });
  if (!firebaseAdminReady) return res.status(503).json({ message: 'Firebase Admin is not configured on this server.' });

  try {
    const decodedToken = await getAuth().verifyIdToken(idToken);
    const result = await pool.query(
      `INSERT INTO "user" (uid, email, username, current_card_skin, current_table_skin, picture_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (uid)
       DO UPDATE SET email = EXCLUDED.email, username = EXCLUDED.username
       RETURNING *`,
      [decodedToken.uid, decodedToken.email ?? null, cleanUsername, 'default_card', 'default_table', 'cowboy'],
    );

    return res.status(201).json({ uid: decodedToken.uid, username: cleanUsername, user: result.rows[0] });
  } catch (error) {
    console.error('AUTH PROFILE ERROR:', error);
    return res.status(401).json({ message: 'Invalid token or profile save failed.' });
  }
});

const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: [...allowedOrigins] } });

app.use("/api/rooms", createRoomsRouter(io));

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  socket.on('room:subscribe', (tableId: unknown) => {
    if (typeof tableId === 'string' && /^\d{4}$/.test(tableId)) socket.join(`room:${tableId}`);
  });
});

const PORT = process.env.PORT || 3000;

async function startServer(): Promise<void> {
  try {
    await InitDB();
    httpServer.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('DATABASE INITIALIZATION ERROR:', error);
    await pool.end();
    process.exitCode = 1;
  }
}

void startServer();

console.log('DB URL:', process.env.DATABASE_URL);
