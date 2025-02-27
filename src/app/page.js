'use client';

// import Image from "next/image";
import { Suspense, use, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuestionsStore } from '@/stores';
import { Button } from '@/components';
import { Cog8ToothIcon } from '@heroicons/react/20/solid';
import LandingPageQuestions from '@/components/landing-page-questions';

import useGetAllQuestions from '@/hooks/useGetAllQuestions';

const Home = () => {
  const router = useRouter();
  const {
    questions,
    scoreTeamA,
    scoreTeamB,
    setActiveQuestion,
    setVisitedQuestions,
    getQuestions
  } = useQuestionsStore();
  const goToAdmin = () => router.push('/admin');
  const goToQuestion = index => {
    setActiveQuestion(index);
    setVisitedQuestions(index);
    router.push(`/question/${index}`);
  };
  useEffect(() => {
    if (!questions) {
      getQuestions();
    }
  }, []);

  return (
    <main className="min-h-screen bg-gradient-to-b from-purple-950 to-indigo-950">
      <div className="container mx-auto px-4 py-16">
        <div className="mb-12 text-center">
          <div className="w-full flex justify-end">
            <Button className="border-0" onClick={goToAdmin}>
              <Cog8ToothIcon className="size-6 text-white"/>
            </Button>
          </div>
          <div className="flex flex-row flex-wrap items-center justify-between px-12 py-4 gap-1">
            <div className="flex flex-row flex-wrap gap-x-8 gap-y-8 items-center justify-between">

              <Suspense fallback={'Loading...'}>
                <LandingPageQuestions goToQuestion={goToQuestion}/>
              </Suspense>

            </div>
            <div className="flex flex-row justify-evenly size-full">
              <div className="border-2 border-solid border-blue-300 px-8 py-4">Team A: {scoreTeamA} </div>
              <div className="border-2 border-solid border-blue-300 px-8 py-4">Team B: {scoreTeamB}</div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};


export default Home;
