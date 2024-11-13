'use client';
import { useRouter } from 'next/navigation';
import QuestionConfiguration from '@/components/question-configuration';
import { Button } from '@/components';
import { useQuizConfigStore } from '@/stores/quiz-configuration-store';
import { ArrowUturnLeftIcon } from '@heroicons/react/20/solid';

const NewQuizConfiguration = ({}) => {
  const router = useRouter();
  const { quizName, fullQuiz, validations, setQuizName, addQuestion, saveQuiz } = useQuizConfigStore();
  const { isAllValid, fullQuizValidation,  } = validations;
  const goToAdmin = () => router.push('/admin');
  const changeName = ev => setQuizName({ quizName: ev.currentTarget.value });
  console.log(fullQuizValidation)

  return (
    <div className='flex flex-col justify-center gap-4'>
      <div className='flex justify-between page-header px-24 py-5'>
        <Button onClick={goToAdmin}><ArrowUturnLeftIcon className='size-6 text-foreground'/> </Button>
        <Button onClick={saveQuiz}>Save</Button>
      </div>
      <div className='mx-auto'>
      <h1 className='text-2xl'>Create new quiz</h1>
      <label className='flex flex-col w-full justify-between'>
        Quiz Name:
        <input name='quizName' type='text' value={quizName} className='text-black p-1' onChange={changeName}/>
      </label>
      <p className='text-m italic'>
        Start creating your quiz by adding your questions and answers. Don't forget to mark
        which question is correct.
      </p>

      {fullQuiz.map((item, index) =>
        <QuestionConfiguration key={`question-config-${index}`} questionIndex={index} validation={fullQuizValidation[index]}/>)}
      <Button className='mt-4' onClick={addQuestion}>Add Question</Button>
      </div>
    </div>
  );
};

export default NewQuizConfiguration;
