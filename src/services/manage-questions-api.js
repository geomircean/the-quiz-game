import { apiRoutes } from '@/api-routes';

export const getAllQuestions = async () => {
  try {
    const res = await fetch(apiRoutes.getAllQuestions);
    if (!res.ok) throw new Error('Failed to fetch questions');
    return  await res.json();
  } catch (error) {
    throw new Error(error.message);
  }

};

export const addQuestion = async (question) => {
  try {
    const res = await fetch('/api/add-question', { method: 'POST', body: JSON.stringify(question) });
    if (!res.ok) throw new Error('Failed to add question');
    return await res.json();
  } catch (error) {
    throw new Error(error.message);
  }
};
