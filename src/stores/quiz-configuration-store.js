import { create } from 'zustand';
import { produce } from 'immer';
import { validateNewQuiz } from '@/app/validations';

const answerStruct = { answerMessage: '', isCorrect: false };
const questionStruct = {
  questionText: '',
  tileName: '',
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
  // Hydrate the single-question editor with an existing library question.
  loadQuestion: (question) => set({ fullQuiz: [question] }),
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
  changeQuestionText: ({ questionIndex, value }) => set(state => {
    const { fullQuiz } = state;
    fullQuiz[questionIndex].questionText = value;
    return { fullQuiz };
  }),
  changeTileName: ({ questionIndex, value }) => set(state => {
    const { fullQuiz } = state;
    fullQuiz[questionIndex].tileName = value;

    return { fullQuiz };
  }),
  saveQuiz: async () => {
    const { fullQuiz, quizName } = get();
    const { validations } = validateNewQuiz({ quizName, fullQuiz });
    const { isAllValid } = validations;

    if (!isAllValid) {
      return set({ validations });
    }

    // TODO(P2): persist to Firestore quizzes/{id} with questionIds pointers
    // (src/data/quizzes.js) — see ROADMAP.md §5 P2.
    return set({ validations, fullQuiz: [] });
  },
  resetQuiz: () => set(state => ({
    fullQuiz: [],
    validations: {
      isAllValid: true,
      isQuizNameValid: true,
      fullQuizValidation: {},
    }
  })),
}));
