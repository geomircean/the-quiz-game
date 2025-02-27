import { useEffect, useState } from 'react';
import { useQuestionsStore } from '@/stores';
import { getAllQuestions } from '@/services/manage-questions-api';

export default function useGetAllQuestions() {
  const [questions, setQuestionList] = useState(null);
  const { setQuestions, setError } = useQuestionsStore();

  useEffect(() => {
    console.log('useEffect');
    async function getQuestions() {
      try {
        const data = await getAllQuestions();
        console.log('resulted', data);
        // setQuestionList(data);
        useQuestionsStore.getState().setQuestions({ questions: data });
      } catch (error) {
        useQuestionsStore.getState().setError({ error });
        setQuestionList(null);
      } finally {
        //hide loader
      }
    }
    throw getQuestions();
    // return () => {};
  }, [setQuestions, setError]);
  return questions;
}
//
// const fetchData = async () => {
//   try {
//     const response = await fetch('https://api.example.com/data');
//     const result = await response.json();
//     useStore.getState().setData(result); // ✅ Works outside components
//   } catch (error) {
//     console.error('Error fetching data:', error);
//   }
// };
