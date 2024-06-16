// import Image from "next/image";
'use client';

import { useRouter } from 'next/navigation';
import Card from '@/components/card';
import { useQuestionsStore } from '@/stores/questions-store';
import { Button } from '@/components';
import { Cog8ToothIcon } from '@heroicons/react/20/solid';


const Home = () => {
  const router = useRouter();
  const { scoreTeamA, scoreTeamB } = useQuestionsStore();
  const { questions, setActiveQuestion } = useQuestionsStore();
  const goToAdmin = () => router.push('/admin');
  const goToQuestion = index => {
    setActiveQuestion(index);
    router.push(`/question/${index}`);
  };

  return (
    <main className="flex min-h-screen flex-col p-4 gap-1">
      <div className="w-full flex justify-end">
        <Button className='border-0' onClick={goToAdmin}>
          <Cog8ToothIcon className="size-6 text-white"/>
        </Button>
      </div>
      <div className='flex flex-row flex-wrap items-center justify-between px-12 py-4 gap-1'>
        <div className="flex flex-row flex-wrap gap-x-8 gap-y-8 items-center justify-between">
          {questions.map(({ questionName }, index) => (
            <Card key={`question-${index}`} title={questionName} onClick={() => goToQuestion(index)}/>
          ))}
        </div>
        <div className="flex flex-row justify-evenly size-full">
          <div className="border-2 border-solid border-blue-300 px-8 py-4">Team A: {scoreTeamA} </div>
          <div className="border-2 border-solid border-blue-300 px-8 py-4">Team B: {scoreTeamB}</div>
        </div>
      </div>
    </main>
  );
};

export default Home;
