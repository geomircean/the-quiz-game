// import { getAllQuestions } from '@/services/manage-questions-api';

export const apiRoutes = {
  getAllQuestions: '/api/all-questions',
  getQuestion: '/api/question/:id',
  saveQuestion: '/api/save-question',
  deleteQuestion: '/api/delete-question/:id',
  getQuiz: '/api/get-quiz/:id',
  saveQuiz: '/api/admin/save-quiz',
  editQuiz: '/api/admin/save-quiz/:id',
  deleteQuiz: '/api/delete-quiz/:id',
  setScore: 'api/set-score:/:roomId',
  getScore: '/api/get-score/:roomId',
};
