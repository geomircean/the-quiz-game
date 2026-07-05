/**
 * Emulator-based verification of the Firestore security rules.
 * Run with the emulator suite up:  node scripts/verify-rules.mjs
 *
 * Proves the P1 (question library) and P2 (quizzes) rules contracts:
 * owner-only reads/writes, shape validation, createdAt immutability, the
 * delete-guard query, and catch-all denial for everyone else.
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
// P5 hardening: per-element answer validation (unrolled indexed checks).
await check('A cannot store junk inside answer entries', 'deny', () =>
  addDoc(collection(db, 'questions'), {
    ...questionPayload,
    ownerId: aliceUid,
    possibleAnswers: [{ nested: { deep: 'junk' } }],
  }));
await check('A cannot store an oversized answerMessage (>500 chars)', 'deny', () =>
  addDoc(collection(db, 'questions'), {
    ...questionPayload,
    ownerId: aliceUid,
    possibleAnswers: [{ answerMessage: 'x'.repeat(501), isCorrect: true }],
  }));
await check('A cannot store a non-boolean isCorrect', 'deny', () =>
  addDoc(collection(db, 'questions'), {
    ...questionPayload,
    ownerId: aliceUid,
    possibleAnswers: [{ answerMessage: 'Paris', isCorrect: 'yes' }],
  }));
await check('a junk entry hidden at position 2 is also rejected', 'deny', () =>
  addDoc(collection(db, 'questions'), {
    ...questionPayload,
    ownerId: aliceUid,
    possibleAnswers: [
      { answerMessage: 'Paris', isCorrect: true },
      { answerMessage: 'Lyon', isCorrect: false, leak: 1 },
    ],
  }));
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

// --- Quizzes: owner-only pointers into the library --------------------------
await signInGoogle('alice-sub', 'alice@example.com');
const quizPayload = {
  name: 'Friday Night Quiz',
  answerMode: 'firstTap',
  questionIds: [aliceDocRef.id],
  teams: { A: { name: 'Team 1' }, B: { name: 'Team 2' } },
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
};
let aliceQuizRef;
await check('A creates own quiz', 'allow', async () => {
  aliceQuizRef = await addDoc(collection(db, 'quizzes'), { ...quizPayload, ownerId: aliceUid });
});
await check('A lists own quizzes', 'allow', () =>
  getDocs(query(collection(db, 'quizzes'), where('ownerId', '==', aliceUid))));
// NOTE: the emulator serves queries WITHOUT enforcing composite indexes, so
// this only proves the RULES allow the query. The static assertion at the
// bottom of this file checks the index declaration the query needs in prod.
await check('A finds quizzes using a question (delete-guard query)', 'allow', () =>
  getDocs(query(
    collection(db, 'quizzes'),
    where('ownerId', '==', aliceUid),
    where('questionIds', 'array-contains', aliceDocRef.id),
  )));
await check('A updates own quiz', 'allow', () =>
  updateDoc(aliceQuizRef, { name: 'Friday Night Quiz v2', updatedAt: serverTimestamp() }));
await check('A cannot create quiz with invalid answerMode', 'deny', () =>
  addDoc(collection(db, 'quizzes'), { ...quizPayload, ownerId: aliceUid, answerMode: 'dictatorship' }));
await check('A cannot create quiz with zero questions', 'deny', () =>
  addDoc(collection(db, 'quizzes'), { ...quizPayload, ownerId: aliceUid, questionIds: [] }));
await check('A cannot create quiz owned by someone else', 'deny', () =>
  addDoc(collection(db, 'quizzes'), { ...quizPayload, ownerId: 'someone-else' }));
await check('A cannot rewrite quiz createdAt on update', 'deny', () =>
  updateDoc(aliceQuizRef, { createdAt: serverTimestamp() }));
await check('A cannot create quiz with empty teams map', 'deny', () =>
  addDoc(collection(db, 'quizzes'), { ...quizPayload, ownerId: aliceUid, teams: {} }));
await check('A cannot create quiz with junk inside teams', 'deny', () =>
  addDoc(collection(db, 'quizzes'), {
    ...quizPayload,
    ownerId: aliceUid,
    teams: { A: { nested: { deep: 'junk' } }, B: { name: 'Team 2' } },
  }));
await signOut(auth);

await signInGoogle('bob-sub', 'bob@example.com');
await check("B cannot read A's quiz", 'deny', () => getDoc(aliceQuizRef));
await check("B cannot list A's quizzes", 'deny', () =>
  getDocs(query(collection(db, 'quizzes'), where('ownerId', '==', aliceUid))));
await check('B cannot sweep quizzes via collection-group query', 'deny', () =>
  getDocs(collectionGroup(db, 'quizzes')));
await signOut(auth);

await signInAnonymously(auth);
await check("anon cannot read A's quiz", 'deny', () => getDoc(aliceQuizRef));
await signOut(auth);

// --- A cleans up ------------------------------------------------------------
await signInGoogle('alice-sub', 'alice@example.com');
await check('A deletes own quiz', 'allow', () => deleteDoc(aliceQuizRef));
await check('A deletes own question', 'allow', () => deleteDoc(aliceDocRef));

// --- Static assertion: the delete-guard's composite index is declared -------
// (The emulator can't test index existence — see the note above the
// delete-guard check — so at least assert the declaration file has it.)
import { readFileSync } from 'node:fs';
const indexes = JSON.parse(readFileSync(new URL('../firestore.indexes.json', import.meta.url), 'utf8'));
const hasDeleteGuardIndex = (indexes.indexes ?? []).some((idx) =>
  idx.collectionGroup === 'quizzes' &&
  (idx.fields ?? []).some((f) => f.fieldPath === 'ownerId' && f.order === 'ASCENDING') &&
  (idx.fields ?? []).some((f) => f.fieldPath === 'questionIds' && f.arrayConfig === 'CONTAINS'));
results.push({
  name: 'firestore.indexes.json declares the delete-guard composite index',
  pass: hasDeleteGuardIndex,
  got: hasDeleteGuardIndex ? 'declared' : 'MISSING',
});

// --- Report -----------------------------------------------------------------
let failed = 0;
for (const { name, pass, got } of results) {
  if (!pass) failed += 1;
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}  (got: ${got})`);
}
console.log(`\n${results.length - failed}/${results.length} checks passed`);
process.exit(failed === 0 ? 0 : 1);
