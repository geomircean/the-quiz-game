import { apiRoutes } from '@/api-routes';

export const getAllQuestions = async () => {
  try {
    const res = await fetch(apiRoutes.getAllQuestions);
    if (!res.ok) throw new Error('Failed to fetch questions');
    return await res.json();
  } catch (error) {
    throw new Error(error.message);
  }

};

export const addQuestion = async (question) => {
  try {
    console.log('im at the service spot')
    const res = await fetch('/api/save-question', { method: 'POST', body: JSON.stringify(question) });
    console.log('post fetch');
    if (!res.ok) throw new Error('Failed to add question');
    return await res.json();
  } catch (error) {
    throw new Error(error.message);
  }
};

export const editQuestion = async (question) => {
  try {
    const res = await fetch('/api/save-question', { method: 'PUT', body: JSON.stringify(question) });
    if (!res.ok) throw new Error('Failed to update question');
    return await res.json();
  } catch (error) {
    throw new Error(error.message);
  }
};

export const deleteQuestion = async (questionId) => {
  try {
    const res = await fetch(`/api/questions/${questionId}`, { method: 'DELETE', body: JSON.stringify({ questionId }) });
    if (!res.ok) throw new Error('Failed to delete question');
    return await res.json();
  } catch (error) {
    throw new Error(error.message);
  }
};
