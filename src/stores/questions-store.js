import { create } from 'zustand';
import { questions } from './mock-data';

export const useQuestionsStore = create((set) => ({
  questions,
  visitedQuestions: [],
  activeQuestionIndex: null,
  selectedAnswerIndex: null,
  scoreTeamA: 0,
  scoreTeamB: 0,
  setVisitedQuestions: (index) => set((state)=> ({ visitedQuestions: state.visitedQuestions(index) })),
  setActiveQuestion: (index) => set({ activeQuestionIndex: index }),
  setSelectedAnswer: (index) => set({ selectedAnswerIndex: index }),
  setScore : (team, hasCorrectAnswer) => set((state)=> ({ [team]: state[team] + (hasCorrectAnswer ? 1 : 0) })),
}));
