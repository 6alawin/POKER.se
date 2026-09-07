import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { resolve } from 'path';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import pool from './db';
import { InitDB } from './db/initdb';
import userRoutes from './routes/users';

dotenv.config({ path: resolve(__dirname, '../.env') });

const firebaseProjectId = process.env.FIREBASE_PROJECT_ID;
const firebaseClientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const firebasePrivateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
const firebaseAdminReady = Boolean(firebaseProjectId && firebaseClientEmail && firebasePrivateKey);

if (firebaseAdminReady && getApps().length === 0) {
  initializeApp({ credential: cert({ projectId: firebaseProjectId, clientEmail: firebaseClientEmail, privateKey: firebasePrivateKey }) });
}

const app = express();
const normalizeOrigin = (origin: string): string => origin.trim().replace(/\/$/, '');
const configuredOrigins = (process.env.CLIENT_ORIGIN ?? '')
  .split(',')
  .map(normalizeOrigin)
  .filter(Boolean);
const allowedOrigins = new Set([
  ...configuredOrigins,
  'http://localhost:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
]);

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(normalizeOrigin(origin))) return callback(null, true);
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

type RoomMember = { id: string; name: string; isHost: boolean };
type PokerRoom = { pin: string; maxPlayers: number; members: RoomMember[]; started: boolean; gameState?: unknown };
type RoomReply = (reply: { ok: boolean; room?: PokerRoom; error?: string }) => void;
const pokerRooms = new Map<string, PokerRoom>();

function createPin(): string {
  let pin = '';
  do pin = Math.floor(1000 + Math.random() * 9000).toString(); while (pokerRooms.has(pin));
  return pin;
}

function cleanName(value: unknown): string {
  if (typeof value !== 'string') return 'Player';
  return value.trim().replace(/[^a-zA-Z0-9_\-ก-๙]/g, '').slice(0, 16) || 'Player';
}

function visibleGameState(state: unknown, viewerId: string): unknown {
  if (!state || typeof state !== 'object') return state;
  const snapshot = structuredClone(state) as { phase?: unknown; players?: Array<{ id?: unknown; holeCards?: unknown[] }> };
  if (snapshot.phase !== 'showdown' && Array.isArray(snapshot.players)) {
    snapshot.players = snapshot.players.map((player) => player.id === viewerId ? player : { ...player, holeCards: [] });
  }
  return snapshot;
}

function removeSocketFromRoom(socketId: string, requestedPin?: string): void {
  for (const [pin, room] of pokerRooms) {
    if (requestedPin && pin !== requestedPin) continue;
    const member = room.members.find((item) => item.id === socketId);
    if (!member) continue;
    room.members = room.members.filter((item) => item.id !== socketId);
    if (member.isHost || room.members.length === 0) {
      io.to(pin).emit('room:closed');
      pokerRooms.delete(pin);
    } else {
      io.to(pin).emit('room:updated', room);
    }
  }
}

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('room:create', (payload: { name?: unknown; maxPlayers?: unknown }, reply: RoomReply) => {
    removeSocketFromRoom(socket.id);
    const allowedSizes = [2, 6, 9];
    const maxPlayers = Number(payload?.maxPlayers);
    if (!allowedSizes.includes(maxPlayers)) return reply({ ok: false, error: 'INVALID TABLE SIZE.' });
    const pin = createPin();
    const room: PokerRoom = { pin, maxPlayers, started: false, members: [{ id: socket.id, name: cleanName(payload?.name), isHost: true }] };
    pokerRooms.set(pin, room);
    void socket.join(pin);
    reply({ ok: true, room });
  });

  socket.on('room:join', (payload: { name?: unknown; pin?: unknown }, reply: RoomReply) => {
    const pin = typeof payload?.pin === 'string' ? payload.pin : '';
    const room = pokerRooms.get(pin);
    if (!room) return reply({ ok: false, error: 'ROOM PIN NOT FOUND.' });
    if (room.started) return reply({ ok: false, error: 'THIS GAME HAS ALREADY STARTED.' });
    if (room.members.length >= room.maxPlayers) return reply({ ok: false, error: 'THIS ROOM IS FULL.' });
    removeSocketFromRoom(socket.id);
    room.members.push({ id: socket.id, name: cleanName(payload?.name), isHost: false });
    void socket.join(pin);
    io.to(pin).emit('room:updated', room);
    reply({ ok: true, room });
  });

  socket.on('room:repin', (payload: { pin?: unknown }, reply: RoomReply) => {
    const oldPin = typeof payload?.pin === 'string' ? payload.pin : '';
    const room = pokerRooms.get(oldPin);
    if (!room || !room.members.some((member) => member.id === socket.id && member.isHost)) return reply({ ok: false, error: 'ONLY THE HOST CAN CHANGE THE PIN.' });
    const newPin = createPin();
    pokerRooms.delete(oldPin);
    room.pin = newPin;
    pokerRooms.set(newPin, room);
    for (const member of room.members) {
      const memberSocket = io.sockets.sockets.get(member.id);
      if (memberSocket) { void memberSocket.leave(oldPin); void memberSocket.join(newPin); }
    }
    io.to(newPin).emit('room:updated', room);
    reply({ ok: true, room });
  });

  socket.on('room:start', (payload: { pin?: unknown }, reply: RoomReply) => {
    const pin = typeof payload?.pin === 'string' ? payload.pin : '';
    const room = pokerRooms.get(pin);
    if (!room || !room.members.some((member) => member.id === socket.id && member.isHost)) return reply({ ok: false, error: 'ONLY THE HOST CAN START THE GAME.' });
    if (room.members.length < 2) return reply({ ok: false, error: 'WAIT FOR AT LEAST ONE FRIEND.' });
    room.started = true;
    io.to(pin).emit('room:started', room);
    reply({ ok: true, room });
  });

  socket.on('game:state', (payload: { pin?: unknown; state?: unknown }) => {
    const pin = typeof payload?.pin === 'string' ? payload.pin : '';
    const room = pokerRooms.get(pin);
    if (!room?.members.some((member) => member.id === socket.id && member.isHost)) return;
    room.gameState = payload.state;
    for (const member of room.members) {
      if (member.id !== socket.id) io.to(member.id).emit('game:state', visibleGameState(payload.state, member.id));
    }
  });

  socket.on('game:action', (payload: { pin?: unknown; action?: unknown; amount?: unknown }) => {
    const pin = typeof payload?.pin === 'string' ? payload.pin : '';
    const room = pokerRooms.get(pin);
    const member = room?.members.find((item) => item.id === socket.id);
    const host = room?.members.find((item) => item.isHost);
    if (!room?.started || !member || !host) return;
    io.to(host.id).emit('game:action', { playerId: socket.id, action: payload.action, amount: payload.amount });
  });

  socket.on('game:sync', (payload: { pin?: unknown }, reply: (state: unknown) => void) => {
    const pin = typeof payload?.pin === 'string' ? payload.pin : '';
    const room = pokerRooms.get(pin);
    if (!room?.members.some((member) => member.id === socket.id)) return reply(null);
    reply(visibleGameState(room.gameState ?? null, socket.id));
  });

  socket.on('room:leave', (payload: { pin?: unknown }) => removeSocketFromRoom(socket.id, typeof payload?.pin === 'string' ? payload.pin : undefined));
  socket.on('disconnect', () => removeSocketFromRoom(socket.id));
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
