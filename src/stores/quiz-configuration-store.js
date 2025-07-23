import { create } from 'zustand';
import { produce } from 'immer';
import { validateNewQuiz } from '@/app/validations';
import { saveQuiz } from '@/services/manage-quiz-api';


const answerStruct = { answerMessage: '', isCorrect: false };
const questionStruct = {
  description: '',
  category: '',
  possibleAnswers: [],
};

export const useQuizConfigStore = create((set, get) => ({
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
      fullQuiz.push({ ...questionStruct, possibleAnswers: [{ ...answerStruct }] });
      return { fullQuiz };
    }),
  setupSingleQuestion: () => set(state => {
    return { fullQuiz: [{ ...questionStruct, possibleAnswers: [{ ...answerStruct }] }] };
  }),
  addAnswer: ({ questionIndex }) => set(state => {
    const { fullQuiz } = state;
    const { possibleAnswers } = fullQuiz[questionIndex];
    fullQuiz[questionIndex].possibleAnswers = [...possibleAnswers, { ...answerStruct }];
    return { fullQuiz };
  }),
  deleteAnswer: ({ questionIndex, answerIndex }) => set(state => {
    const { fullQuiz } = state;
    const { possibleAnswers } = fullQuiz[questionIndex];
    possibleAnswers.splice(answerIndex, 1);
    fullQuiz[questionIndex].possibleAnswers = possibleAnswers;
    return { fullQuiz };
  }),
  updateAnswer: ({ questionIndex, answerIndex, value }) => set(state => {
    const { fullQuiz } = state;
    fullQuiz[questionIndex].possibleAnswers[answerIndex].answerMessage = value;
    return { fullQuiz };
  }),
  updateIsCorrect: ({ questionIndex, answerIndex, value }) => set(state => {
    const { fullQuiz } = state;
    fullQuiz[questionIndex].possibleAnswers = fullQuiz[questionIndex]
      .possibleAnswers.map((answer, answerInd) => ({ ...answer, isCorrect: answerInd === answerIndex }));

    return { fullQuiz };
  }),
  changeQuestionDescription: ({ questionIndex, value }) => set(state => {
    const { fullQuiz } = state;
    fullQuiz[questionIndex].description = value;
    return { fullQuiz };
  }),
  changeQuestionCategory: ({ questionIndex, value }) => set(state => {
    const { fullQuiz } = state;
    fullQuiz[questionIndex].category = value;

    return { fullQuiz };
  }),
  saveQuiz: async () => {
    const fullQuiz = get().fullQuiz;
    const { validations } = validateNewQuiz({ fullQuiz });
    const { isAllValid } = validations;
    console.log(fullQuiz);

    if (!isAllValid) {
      console.log('not valid', validations);
      return set({ validations });
    }

    try {
      const res = await saveQuiz(fullQuiz);
      return set({ isAllValid, res, validations, fullQuiz: [] });
    } catch (error) {
      return set({ isAllValid: false, error: error.message, });
    }
  },
  resetQuiz: () => set(state => ({
    fullQuiz: [],
    validations: {
      isAllValid: true,
      isQuizNameValid: true,
      fullQuizValidation: {},
    }
  })),
  saveQuestion: () => set(state => {
    const fullQuizValidation = validateNewQuiz(state);
    return { validations: { ...state.validations, fullQuizValidation, } };
  }),
}));
