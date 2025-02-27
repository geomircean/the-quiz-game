import { create } from 'zustand';
import { getAllQuestions } from '@/services/manage-questions-api';

export const useQuestionsStore = create((set) => ({
  questions: null,
  visitedQuestions: [],
  activeQuestionIndex: null,
  selectedAnswerIndex: null,
  scoreTeamA: 0,
  scoreTeamB: 0,
  setVisitedQuestions: (index) => set((state)=> ({ visitedQuestions: [...state.visitedQuestions, index] })),
  setActiveQuestion: (index) => set({ activeQuestionIndex: index }),
  setSelectedAnswer: (index) => set({ selectedAnswerIndex: index }),
  setScore: (team, hasCorrectAnswer) => set((state)=> ({ [team]: state[team] + (hasCorrectAnswer ? 1 : 0) })),
  setQuestions: ({ questions } = {}) => set({ questions }),
  clearQuestions: () => set({ questions: null }),
  setError: ({ error }) => set({ error }),
  getQuestions: async () => {
    try {
      const data = await getAllQuestions();
      return set({ questions: data });
    } catch (error) {
      //do something on error
      return set({ questions: null });
    }
  }
}));
