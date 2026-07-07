import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

const questionsCollection = () => collection(db, 'questions');

// Only the payload fields below are ever written — ownerId is stamped from
// the signed-in uid, never taken from the caller's data object.
const toPayload = ({ questionText, tileName, possibleAnswers }) => ({
  questionText,
  tileName,
  possibleAnswers: possibleAnswers.map(({ answerMessage, isCorrect }) => ({ answerMessage, isCorrect })),
});

export const subscribeToOwnQuestions = (ownerId, onChange, onError) => {
  const ownQuestions = query(questionsCollection(), where('ownerId', '==', ownerId));
  return onSnapshot(
    ownQuestions,
    (snapshot) => onChange(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))),
    onError,
  );
};

export const getQuestion = async (id) => {
  const snapshot = await getDoc(doc(db, 'questions', id));
  return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
};

export const addQuestion = ({ ownerId, question }) =>
  addDoc(questionsCollection(), {
    ...toPayload(question),
    ownerId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

export const editQuestion = ({ id, question }) =>
  updateDoc(doc(db, 'questions', id), {
    ...toPayload(question),
    updatedAt: serverTimestamp(),
  });

export const deleteQuestion = (id) => deleteDoc(doc(db, 'questions', id));
