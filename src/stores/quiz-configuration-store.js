import { create } from 'zustand';

const answerStruct = { answerMessage: '', isCorrect: false };
const questionStruct = {
  questionText: '',
  tileName: '',
  possibleAnswers: [],
  tags: [],
};

// Form state for the single-question editor (QuestionConfiguration).
// Quiz assembly lives in the builder page itself — a quiz is just a name,
// an answer mode and pointers to library questions (see src/data/quizzes.js).
export const useQuizConfigStore = create((set) => ({
  fullQuiz: [],
  setupSingleQuestion: () => set(() => {
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
  updateIsCorrect: ({ questionIndex, answerIndex }) => set(state => {
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
  addTag: ({ questionIndex, value }) => set(state => {
    const { fullQuiz } = state;
    const tag = value.trim().toLowerCase();
    const tags = fullQuiz[questionIndex].tags ?? [];
    if (tag && !tags.includes(tag) && tags.length < 10) {
      fullQuiz[questionIndex].tags = [...tags, tag];
    }
    return { fullQuiz };
  }),
  removeTag: ({ questionIndex, tag }) => set(state => {
    const { fullQuiz } = state;
    fullQuiz[questionIndex].tags = (fullQuiz[questionIndex].tags ?? []).filter((t) => t !== tag);
    return { fullQuiz };
  }),
  resetQuiz: () => set({ fullQuiz: [] }),
}));
