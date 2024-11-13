'use client';

import Question from '@/components/question';
import { useQuestionsStore } from '@/stores/active-quiz-store';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function QuestionPage({ params }) {
  const router = useRouter();
  const [showCorrectAnswer, setShowCorrectAnswer] = useState(false);
  const {
    activeQuestionIndex,
    selectedAnswerIndex,
    questions,
    setActiveQuestion,
    setSelectedAnswer,
    setScore
  } = useQuestionsStore();
  const { possibleAnswers = [] } = questions[activeQuestionIndex || params.id] || {};
  const handleExit = () => {
    setActiveQuestion(null);
    setSelectedAnswer(null);
    router.push('/');
  };
  const isAnyAnswerSelected = selectedAnswerIndex !== null;
  const correctAnswer = possibleAnswers.findIndex(answer => answer.isCorrect);

  return (
    <main className='flex min-h-screen flex-col flex-wrap items-center justify-between p-32 gap-1'>
      <button className='text-2xl' onClick={handleExit}> Return to Questions</button>
      <div>
        <h2 className='my-8 text-xl font-medium sm:text-4xl'>In Ulan-Ude, capitala regiunii autonome Buretia din Rusia,
          exista traditia ca tinerii insuratei sa: </h2>
        <ol className='list-[upper-alpha] list-inside'>
          {possibleAnswers.map(({ answerMessage, isCorrect }, index) => (
            <Question
              key={`answer-${index}`}
              index={index}
              answerMessage={answerMessage}
              showCorrectAnswer={showCorrectAnswer}
              isCorrect={isCorrect}
              isAnswerSelected={selectedAnswerIndex === index}
              isAnyAnswerSelected={isAnyAnswerSelected}
              onClick={() => setSelectedAnswer(index)}
            >
              {answerMessage}
            </Question>
          ))}
        </ol>
      </div>
      <button disabled={!isAnyAnswerSelected} className='text-2xl' onClick={() => {
        setScore('scoreTeamA', correctAnswer === selectedAnswerIndex);
        setShowCorrectAnswer(true);
      }}>
        Reveal Answer
      </button>
    </main>
  );
}
