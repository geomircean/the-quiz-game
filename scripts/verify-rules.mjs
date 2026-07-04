/**
 * Emulator-based verification of the Firestore security rules.
 * Run with the emulator suite up:  node scripts/verify-rules.mjs
 *
 * Proves the P1 contract: a Quizmaster owns a private library; another
 * Quizmaster and an anonymous guest can neither read nor write it, and the
 * catch-all denies everything else.
 */
import { initializeApp } from 'firebase/app';
import {
  GoogleAuthProvider,
  connectAuthEmulator,
  getAuth,
  signInAnonymously,
  signInWithCredential,
  signOut,
} from 'firebase/auth';
import {
  addDoc,
  collection,
  collectionGroup,
  connectFirestoreEmulator,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';

const app = initializeApp({
  apiKey: 'demo-api-key',
  authDomain: 'demo-the-quiz-game.firebaseapp.com',
  projectId: 'demo-the-quiz-game',
});
const auth = getAuth(app);
const db = getFirestore(app);
connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
connectFirestoreEmulator(db, '127.0.0.1', 8181);

// The Auth emulator accepts fake Google credentials: a JSON claims blob.
const signInGoogle = (sub, email) =>
  signInWithCredential(auth, GoogleAuthProvider.credential(JSON.stringify({ sub, email })));

const results = [];
const check = async (name, expectation, fn) => {
  try {
    await fn();
    results.push({ name, pass: expectation === 'allow', got: 'allow' });
  } catch (error) {
    const denied = error.code === 'permission-denied';
    results.push({
      name,
      pass: expectation === 'deny' ? denied : false,
      got: denied ? 'deny' : `error:${error.code ?? error.message}`,
    });
  }
};

const questionPayload = {
  questionText: 'What is the capital of France?',
  tileName: 'Geography 1',
  possibleAnswers: [
    { answerMessage: 'Paris', isCorrect: true },
    { answerMessage: 'Lyon', isCorrect: false },
  ],
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
};

// --- Quizmaster A: full CRUD on own library -------------------------------
const alice = await signInGoogle('alice-sub', 'alice@example.com');
const aliceUid = alice.user.uid;

let aliceDocRef;
await check('A creates own question', 'allow', async () => {
  aliceDocRef = await addDoc(collection(db, 'questions'), { ...questionPayload, ownerId: aliceUid });
});
await check('A reads own question', 'allow', () => getDoc(aliceDocRef));
await check('A lists own questions', 'allow', () =>
  getDocs(query(collection(db, 'questions'), where('ownerId', '==', aliceUid))));
await check('A updates own question', 'allow', () =>
  updateDoc(aliceDocRef, { tileName: 'Geography (edited)', updatedAt: serverTimestamp() }));
await check('A cannot create a question owned by someone else', 'deny', () =>
  addDoc(collection(db, 'questions'), { ...questionPayload, ownerId: 'someone-else' }));
await check('A cannot transfer ownership on update', 'deny', () =>
  updateDoc(aliceDocRef, { ownerId: 'someone-else' }));
await check('A cannot write junk shape (extra field)', 'deny', () =>
  addDoc(collection(db, 'questions'), { ...questionPayload, ownerId: aliceUid, isCorrectLeak: true }));
await check('A cannot create without ownerId', 'deny', () =>
  addDoc(collection(db, 'questions'), { ...questionPayload }));
await check('A cannot forge createdAt as a string', 'deny', () =>
  addDoc(collection(db, 'questions'), { ...questionPayload, ownerId: aliceUid, createdAt: 'yesterday' }));
await check('A cannot rewrite createdAt on update', 'deny', () =>
  updateDoc(aliceDocRef, { createdAt: serverTimestamp() }));
await check('A cannot write to an arbitrary collection', 'deny', () =>
  setDoc(doc(db, 'random-collection/some-doc'), { hello: 'world' }));
// KNOWN GAP (P5): rules cannot loop over list elements, so nested junk
// inside possibleAnswers entries is currently ALLOWED for the owner.
// Documented here so the suite tracks it rather than hides it.
await check('KNOWN-GAP(P5): owner may store junk inside answer entries', 'allow', async () => {
  const junkRef = await addDoc(collection(db, 'questions'), {
    ...questionPayload,
    ownerId: aliceUid,
    possibleAnswers: [{ nested: { deep: 'junk' } }],
  });
  await deleteDoc(junkRef);
});
await signOut(auth);

// --- Quizmaster B: cannot touch A's library --------------------------------
await signInGoogle('bob-sub', 'bob@example.com');
await check('B cannot read A question doc', 'deny', () => getDoc(aliceDocRef));
await check("B cannot list A's questions", 'deny', () =>
  getDocs(query(collection(db, 'questions'), where('ownerId', '==', aliceUid))));
await check("B cannot update A's question", 'deny', () => updateDoc(aliceDocRef, { tileName: 'hacked' }));
await check("B cannot delete A's question", 'deny', () => deleteDoc(aliceDocRef));
await check('B cannot sweep questions via collection-group query', 'deny', () =>
  getDocs(collectionGroup(db, 'questions')));
await signOut(auth);

// --- Anonymous guest (a player): no library access at all ------------------
const anon = await signInAnonymously(auth);
await check('anon cannot create questions', 'deny', () =>
  addDoc(collection(db, 'questions'), { ...questionPayload, ownerId: anon.user.uid }));
await check('anon cannot read A question doc', 'deny', () => getDoc(aliceDocRef));
await check('anon cannot list any questions', 'deny', () =>
  getDocs(query(collection(db, 'questions'), where('ownerId', '==', aliceUid))));
await check('anon cannot sweep questions via collection-group query', 'deny', () =>
  getDocs(collectionGroup(db, 'questions')));
await signOut(auth);

// --- A cleans up ------------------------------------------------------------
await signInGoogle('alice-sub', 'alice@example.com');
await check('A deletes own question', 'allow', () => deleteDoc(aliceDocRef));

// --- Report -----------------------------------------------------------------
let failed = 0;
for (const { name, pass, got } of results) {
  if (!pass) failed += 1;
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}  (got: ${got})`);
}
console.log(`\n${results.length - failed}/${results.length} checks passed`);
process.exit(failed === 0 ? 0 : 1);
