import { create } from 'zustand';
import { produce } from 'immer';
import { validateNewQuiz } from '@/app/validations';

const answerStruct = { answerLabel: '', isCorrect: false };
const questionStruct = {
  description: '',
  answers: [],
};

export const useQuizConfigStore = create((set) => ({
  quizId: '',
  quizName: '',
  fullQuiz: [],
  validations: {
    isAllValid: true,
    isQuizNameValid: true,
    fullQuizValidation: {},
  },
  setQuizName: ({ quizName }) => set({ quizName }),
  addQuestion: () =>
    set(state => {
      const { fullQuiz } = state;
      fullQuiz.push({ ...questionStruct, answers: [{ ...answerStruct }] });
      return { fullQuiz };
    }),
  addAnswer: ({ questionIndex }) => set(state => {
    const { fullQuiz } = state;
    const { answers } = fullQuiz[questionIndex];
    fullQuiz[questionIndex].answers = [...answers, { ...answerStruct }];
    return { fullQuiz };
  }),
  deleteAnswer: ({ questionIndex, answerIndex }) => set(state => {
    const { fullQuiz } = state;
    const { answers } = fullQuiz[questionIndex];
    answers.splice(answerIndex, 1);
    fullQuiz[questionIndex].answers = answers;
    return { fullQuiz };
  }),
  updateAnswer: ({ questionIndex, answerIndex, value }) => set(state => {
    const { fullQuiz } = state;
    fullQuiz[questionIndex].answers[answerIndex].answerLabel = value;
    return { fullQuiz };
  }),
  updateIsCorrect: ({ questionIndex, answerIndex, value }) => set(state => {
    const { fullQuiz } = state;
    fullQuiz[questionIndex].answers[answerIndex].isCorrect = value;
    return { fullQuiz };
  }),
  changeQuestionDescription: ({ questionIndex, value }) => set(state => {
    const { fullQuiz } = state;
    fullQuiz[questionIndex].description = value;

    return { fullQuiz };
  }),
  saveQuiz: () => set(state => {
    const validations = validateNewQuiz(state);
    if (!validations.isAllValid) return { validations };

  }),
}));
