import { apiRoutes } from '@/api-routes';

export const getQuiz = async () => {
  try {
    const res = await fetch(apiRoutes.getQuiz);
    if (!res.ok) throw new Error('Failed to fetch quiz');
    return await res.json();
  } catch (error) {
    throw new Error(error.message);
  }

};

export const saveQuiz = async (quiz) => {
  try {
    const res = await fetch(apiRoutes.saveQuiz, { method: 'POST', body: JSON.stringify(quiz) });
    if (!res.ok) throw new Error('Failed to add quiz');
    return await res.json();
  } catch (error) {
    throw new Error(error.message);
  }
};

export const editQuiz = async (quiz) => {
  try {
    const res = await fetch(apiRoutes.saveQuiz, { method: 'PUT', body: JSON.stringify(quiz) });
    if (!res.ok) throw new Error('Failed to update quiz');
    return await res.json();
  } catch (error) {
    throw new Error(error.message);
  }
};

export const deleteQuiz = async (quizId) => {
  try {
    const res = await fetch(`/api/quiz/${quizId}`, { method: 'DELETE', body: JSON.stringify({ quizId }) });
    if (!res.ok) throw new Error('Failed to delete quiz');
    return await res.json();
  } catch (error) {
    throw new Error(error.message);
  }
};
