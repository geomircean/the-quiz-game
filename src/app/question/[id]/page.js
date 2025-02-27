'use client';

// import AnswerItem from '@/components/question';
import { useQuestionsStore } from '@/stores/active-quiz-store';
import { useRouter } from 'next/navigation';
import { use, useState } from 'react';
import { ArrowLeft, CheckCircle, XCircle } from "lucide-react"
import { Button, Card, CardTitle, CardHeader, CardContent, Question } from '@/components';
import { motion } from 'framer-motion';
import { getAlpha } from '@/utils';
import AnswerItem from '@/components/answer-item';

export default function QuestionPage({ params }) {
  const router = useRouter();
  const [showCorrectAnswer, setShowCorrectAnswer] = useState(false);
  const {
    activeQuestionIndex,
    selectedAnswerIndex,
    questions,
    setActiveQuestion,
    setSelectedAnswer,
    setScore,
  } = useQuestionsStore();
  const { id: questionId } = use(params);
  const handleExit = () => {
    setActiveQuestion(null);
    setSelectedAnswer(null);
    router.push('/');
  };

  if (!questions) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-purple-950 to-indigo-950">
        <div className="container mx-auto px-4 py-16">
          <Button
            variant="ghost"
            className="mb-8 flex items-center gap-2 text-purple-100"
            onClick={handleExit}
          >
            <ArrowLeft size={16} />
            Return to Questions
          </Button>
        </div>
      </main>
    );
  }

  const { possibleAnswers = [], category , questionText } = questions[activeQuestionIndex || questionId] || {};
  const isAnyAnswerSelected = selectedAnswerIndex !== null;
  const correctAnswer = possibleAnswers.findIndex(answer => answer.isCorrect);

  return (
    <main className="min-h-screen bg-gradient-to-b from-purple-950 to-indigo-950">
      <div className="container mx-auto px-4 py-16">
        <Button
          variant="ghost"
          className="mb-8 flex items-center gap-2 text-purple-100"
          onClick={handleExit}
        >
          <ArrowLeft size={16} />
          Return to Questions
        </Button>
        <Card className="mx-auto max-w-4xl bg-purple-800/40 text-purple-100">
          <CardHeader>
            <em>{category}</em>
            <CardTitle className="text-2xl">{questionText}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {possibleAnswers.map(({ answerMessage, isCorrect }, index) => (
              <AnswerItem
                key={index}
                index={index}
                isCorrect={isCorrect}
                isAnyAnswerSelected={isAnyAnswerSelected}
                showCorrectAnswer={showCorrectAnswer}
                isAnswerSelected={selectedAnswerIndex === index}
                onClick={() => setSelectedAnswer(index)}
              >
                <span className="mr-4 font-bold">{getAlpha(index)}.</span>
                {answerMessage}
              </AnswerItem>
            ))}
            <Button
              disabled={!isAnyAnswerSelected}
              className="w-full mt-4"
              onClick={() => {
                setScore('scoreTeamA', correctAnswer === selectedAnswerIndex);
                setShowCorrectAnswer(true);
              }}>
              Reveal Answer
            </Button>

            {/*{isSubmitted && (*/}
            {/*  <div*/}
            {/*    className={`mt-6 rounded-lg p-4 text-center ${*/}
            {/*      isCorrect ? "bg-green-700 text-green-100" : "bg-red-800 text-red-100"*/}
            {/*    }`}*/}
            {/*  >*/}
            {/*    {isCorrect*/}
            {/*     ? "Correct! Well done!"*/}
            {/*     : `Incorrect. The correct answer is: ${answerLabels[question.answers.indexOf(question.correctAnswer)]}. ${question.correctAnswer}`}*/}
            {/*  </div>*/}
            {/*)}*/}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
