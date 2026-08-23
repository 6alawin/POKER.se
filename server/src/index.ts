import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';

dotenv.config();

const firebaseProjectId = process.env.FIREBASE_PROJECT_ID;
const firebaseClientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const firebasePrivateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
const firebaseAdminReady = Boolean(firebaseProjectId && firebaseClientEmail && firebasePrivateKey);

if (firebaseAdminReady && getApps().length === 0) {
  initializeApp({ credential: cert({ projectId: firebaseProjectId, clientEmail: firebaseClientEmail, privateKey: firebasePrivateKey }) });
}

const app = express();
app.use(cors());
app.use(express.json());

app.get('/', (_req, res) => {
  res.json({ message: 'Poker.io server is running' });
});

app.post('/auth/verify', async (req, res) => {
  const { idToken } = req.body as { idToken?: unknown };
  if (typeof idToken !== 'string' || !idToken) return res.status(400).json({ message: 'A Firebase ID token is required.' });
  if (!firebaseAdminReady) return res.status(503).json({ message: 'Firebase Admin is not configured on this server.' });

  try {
    const decodedToken = await getAuth().verifyIdToken(idToken);
    const profile = await getFirestore().collection('users').doc(decodedToken.uid).get();
    return res.status(200).json({
      uid: decodedToken.uid,
      email: decodedToken.email ?? null,
      name: decodedToken.name ?? null,
      picture: decodedToken.picture ?? null,
      username: profile.data()?.username ?? null,
      needsUsername: !profile.exists,
    });
  } catch {
    return res.status(401).json({ message: 'Invalid or expired Firebase ID token.' });
  }
});

app.post('/auth/profile', async (req, res) => {
  const { idToken, username } = req.body as { idToken?: unknown; username?: unknown };
  if (typeof idToken !== 'string' || typeof username !== 'string') return res.status(400).json({ message: 'ID token and username are required.' });
  const cleanUsername = username.trim();
  if (!/^[a-zA-Z0-9_]{3,16}$/.test(cleanUsername)) return res.status(400).json({ message: 'Username must be 3–16 letters, numbers, or underscores.' });
  if (!firebaseAdminReady) return res.status(503).json({ message: 'Firebase Admin is not configured on this server.' });

  try {
    const decodedToken = await getAuth().verifyIdToken(idToken);
    await getFirestore().collection('users').doc(decodedToken.uid).set({
      username: cleanUsername,
      email: decodedToken.email ?? null,
      displayName: decodedToken.name ?? null,
      photoURL: decodedToken.picture ?? null,
      updatedAt: FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    return res.status(201).json({ uid: decodedToken.uid, username: cleanUsername });
  } catch {
    return res.status(401).json({ message: 'Invalid or expired Firebase ID token.' });
  }
});

const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: 'http://localhost:5173' } });

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
