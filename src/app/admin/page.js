'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@/components';
import Loading from '@/components/loading';
import { PencilIcon, TrashIcon } from '@heroicons/react/20/solid';
import { useQuizzes } from '@/hooks/useQuizzes';
import { useLaunchQuiz } from '@/hooks/useLaunchQuiz';
import { deleteQuiz } from '@/data/quizzes';

const BASE_URL = '/admin';

const ANSWER_MODE_LABELS = {
  firstTap: 'First tap locks it',
  majority: 'Majority wins',
};

const AdminLanding = () => {
  const router = useRouter();
  const { quizzes, error, isLoading } = useQuizzes();
  const { launch, isLaunching, launchError } = useLaunchQuiz();
  const [deleteError, setDeleteError] = useState(null);

  const onDeleteQuiz = async (id, name) => {
    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return;
    setDeleteError(null);
    try {
      await deleteQuiz(id);
    } catch (err) {
      setDeleteError(err.message);
    }
  };

  return (
    <div className="flex min-h-screen flex-col flex-wrap items-center justify-around gap-1">
      <div className="flex flex-row gap-5 justify-evenly">
        <Button onClick={() => router.push(`${BASE_URL}/new-quiz-configuration`)}>Configure New Quiz</Button>
        <span className="flex flex-col items-center">
          <Button disabled onClick={() => {}}>Generate Random Quiz</Button>
          <span className="text-xs italic opacity-70">coming later</span>
        </span>
      </div>
      <div className="flex flex-row gap-2">
        <Button onClick={() => router.push(`${BASE_URL}/question`)}> Add Question To Your Database</Button>
        <Button onClick={() => router.push(`${BASE_URL}/questions-list`)}>View Questions List</Button>
      </div>
      <div className="w-full max-w-3xl">
        <h3 className="text-xl pb-4">Existing Quizzes</h3>
        {error && <div className="error-message">Could not load quizzes: {error.message}</div>}
        {deleteError && <div className="error-message">Could not delete: {deleteError}</div>}
        {launchError && <div className="error-message">Could not launch: {launchError}</div>}
        {isLoading && <Loading/>}
        {!isLoading && !quizzes?.length && (
          <p className="italic">No quizzes yet — configure your first one.</p>
        )}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {quizzes?.map(({ id, name, questionIds, answerMode }) => (
            <Card key={id} className="bg-purple-800/40 text-purple-100 text-left">
              <CardHeader>
                <CardTitle className="text-xl">{name}</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <p className="text-sm">
                  {questionIds?.length ?? 0} tiles · {ANSWER_MODE_LABELS[answerMode] ?? answerMode}
                </p>
                <div className="flex gap-2 items-center">
                  <Button
                    size="sm"
                    disabled={isLaunching}
                    onClick={() => launch(quizzes.find((q) => q.id === id))}
                  >
                    {isLaunching ? 'Starting…' : 'Launch'}
                  </Button>
                  <Button size="sm" onClick={() => router.push(`${BASE_URL}/new-quiz-configuration/?id=${id}`)}>
                    <PencilIcon className="size-4 mr-1"/> Edit
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => onDeleteQuiz(id, name)}>
                    <TrashIcon className="size-4 mr-1 text-red-400"/> Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminLanding;
