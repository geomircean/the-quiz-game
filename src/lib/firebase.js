import { getApp, getApps, initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth } from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore';
import { connectDatabaseEmulator, getDatabase } from 'firebase/database';

// Web config is public by design: it only identifies the project.
// Authorization lives in firestore.rules / database.rules.json.
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const missingKeys = Object.entries(firebaseConfig)
  .filter(([, value]) => !value)
  .map(([key]) => key);

if (missingKeys.length > 0) {
  throw new Error(
    `Missing Firebase config value(s): ${missingKeys.join(', ')}. ` +
    'Copy .env.example to .env.local and fill in every NEXT_PUBLIC_FIREBASE_* key ' +
    '(NEXT_PUBLIC_* values are inlined at build time, so CI must set them too).'
  );
}

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const rtdb = getDatabase(app);

// Local development against the emulator suite (`npm run emulators`).
// A `demo-*` project id needs no real Firebase project at all.
if (
  process.env.NEXT_PUBLIC_FIREBASE_USE_EMULATORS === 'true' &&
  typeof window !== 'undefined' &&
  !globalThis.__firebaseEmulatorsConnected
) {
  // Ports match the "emulators" block in firebase.json.
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, '127.0.0.1', 8181);
  connectDatabaseEmulator(rtdb, '127.0.0.1', 9000);
  globalThis.__firebaseEmulatorsConnected = true;
}
