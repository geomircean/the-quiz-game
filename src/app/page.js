'use client';

import { Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { useQuestionsStore } from '@/stores';
import { Button } from '@/components';
import { Cog8ToothIcon } from '@heroicons/react/20/solid';
import LandingPageQuestions from '@/components/landing-page-questions';

const Home = () => {
  const router = useRouter();
  const { scoreTeamA, scoreTeamB } = useQuestionsStore();
  const goToAdmin = () => router.push('/admin');
  // TODO(P3/P4): this page becomes the public join screen; the board of
  // tiles moves to the host's room view — see ROADMAP.md §5.
  const goToQuestion = () => {};

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
