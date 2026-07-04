import { create } from 'zustand';

// TODO(P3): this store becomes a thin projection of the live RTDB room
// (role, roomCode, room snapshot, my player) — see ROADMAP.md §5 P3.
export const useQuestionsStore = create((set) => ({
  questions: null,
  visitedQuestions: [],
  activeQuestionIndex: null,
  selectedAnswerIndex: null,
  scoreTeamA: 0,
  scoreTeamB: 0,
  setVisitedQuestions: (index) => set((state) => ({ visitedQuestions: [...state.visitedQuestions, index] })),
  setActiveQuestion: (index) => set({ activeQuestionIndex: index }),
  setSelectedAnswer: (index) => set({ selectedAnswerIndex: index }),
  setScore: (team, hasCorrectAnswer) => set((state) => ({ [team]: state[team] + (hasCorrectAnswer ? 1 : 0) })),
  setQuestions: ({ questions } = {}) => set({ questions }),
  clearQuestions: () => set({ questions: null }),
  setError: ({ error }) => set({ error }),
  // TODO(P1): replace with a Firestore subscription (src/data/questions.js).
  getQuestions: async () => set({ questions: null }),
}));
