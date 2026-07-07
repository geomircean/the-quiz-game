'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@/components';
import Loading from '@/components/loading';
import { ArrowUturnLeftIcon, PencilIcon, TrashIcon } from '@heroicons/react/20/solid';
import { useQuestions } from '@/hooks/useQuestions';
import { deleteQuestion } from '@/data/questions';
import { quizzesUsingQuestion } from '@/data/quizzes';
import { useAuth } from '@/context/auth-context';

const QuestionsList = () => {
  const router = useRouter();
  const { user } = useAuth();
  const { questions, error, isLoading } = useQuestions();
  const [deleteError, setDeleteError] = useState(null);

  const onDelete = async (id) => {
    setDeleteError(null);
    try {
      // Delete-guard: a question cannot be deleted while any quiz uses it —
      // that would leave a board with a missing tile. Name the offenders.
      const usedBy = await quizzesUsingQuestion({ ownerId: user.uid, questionId: id });
      if (usedBy.length > 0) {
        return setDeleteError(
          `This question is used by: ${usedBy.map((q) => q.name).join(', ')}. ` +
          'Remove it from those quizzes first.'
        );
      }
      await deleteQuestion(id);
    } catch (err) {
      setDeleteError(err.message);
    }
  };

  return (
    <div className="flex flex-col gap-4 text-left">
      <div className="flex justify-between py-5">
        <Button onClick={() => router.push('/admin')}><ArrowUturnLeftIcon className="size-6"/></Button>
        <Button onClick={() => router.push('/admin/question')}>Add Question</Button>
      </div>
      <h1 className="text-2xl text-center">Your Question Library</h1>
      {error && <div className="error-message text-center">Could not load questions: {error.message}</div>}
      {deleteError && <div className="error-message text-center">Could not delete: {deleteError}</div>}
      {isLoading && <Loading/>}
      {!isLoading && !questions?.length && (
        <p className="text-center italic">No questions saved yet — add your first one.</p>
      )}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {questions?.map(({ id, tileName, questionText, possibleAnswers }) => (
          <Card key={id} className="bg-purple-800/40 text-purple-100">
            <CardHeader>
              <CardTitle className="text-xl">{tileName}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <p>{questionText}</p>
              <p className="text-sm italic">{possibleAnswers?.length ?? 0} answers</p>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => router.push(`/admin/question/?id=${id}`)}>
                  <PencilIcon className="size-4 mr-1"/> Edit
                </Button>
                <Button size="sm" variant="outline" onClick={() => onDelete(id)}>
                  <TrashIcon className="size-4 mr-1 text-red-400"/> Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default QuestionsList;
