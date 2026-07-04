import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

const quizzesCollection = () => collection(db, 'quizzes');

// A quiz POINTS to library questions (questionIds) — never copies them —
// so editing a library question ripples into every quiz that uses it.
// Teams use the MVP default names (custom names are a later maybe).
const toPayload = ({ name, answerMode, questionIds }) => ({
  name,
  answerMode,
  questionIds: [...questionIds],
  teams: { A: { name: 'Team 1' }, B: { name: 'Team 2' } },
});

export const subscribeToOwnQuizzes = (ownerId, onChange, onError) => {
  const ownQuizzes = query(quizzesCollection(), where('ownerId', '==', ownerId));
  return onSnapshot(
    ownQuizzes,
    (snapshot) => onChange(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))),
    onError,
  );
};

export const getQuiz = async (id) => {
  const snapshot = await getDoc(doc(db, 'quizzes', id));
  return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
};

export const addQuiz = ({ ownerId, quiz }) =>
  addDoc(quizzesCollection(), {
    ...toPayload(quiz),
    ownerId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

export const editQuiz = ({ id, quiz }) =>
  updateDoc(doc(db, 'quizzes', id), {
    ...toPayload(quiz),
    updatedAt: serverTimestamp(),
  });

export const deleteQuiz = (id) => deleteDoc(doc(db, 'quizzes', id));

// Delete-guard support: which of my quizzes still use this question?
// (Composite index ownerId + questionIds is declared in firestore.indexes.json.)
export const quizzesUsingQuestion = async ({ ownerId, questionId }) => {
  const snapshot = await getDocs(query(
    quizzesCollection(),
    where('ownerId', '==', ownerId),
    where('questionIds', 'array-contains', questionId),
  ));
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
};
