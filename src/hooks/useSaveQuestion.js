import { useEffect, useState } from 'react';
import { useQuestionsStore } from '@/stores';
import { addQuestion } from '@/services/manage-questions-api';

export default function useSaveQuestion() {
  const [questions, setQuestionList] = useState(null);
  const { setError } = useQuestionsStore();

  useEffect(() => {
    console.log('useEffect');
    async function saveQuestion() {
      try {
        const data = await addQuestion();
        console.log('resulted', data);
        // setQuestionList(data);
        // useQuestionsStore.getState().setQuestions({ questions: data });
      } catch (error) {
        // useQuestionsStore.getState().setError({ error });
        setQuestionList(null);
      } finally {
        //hide loader
      }
    }
    throw saveQuestion();
    // return () => {};
  }, [setError]);
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
