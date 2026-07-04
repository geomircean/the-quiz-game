'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@/components';
import Loading from '@/components/loading';
import { ArrowUturnLeftIcon, PencilIcon, TrashIcon } from '@heroicons/react/20/solid';
import { useQuestions } from '@/hooks/useQuestions';
import { deleteQuestion } from '@/data/questions';

const QuestionsList = () => {
  const router = useRouter();
  const { questions, error, isLoading } = useQuestions();
  const [deleteError, setDeleteError] = useState(null);

  const onDelete = async (id) => {
    // TODO(P2): delete-guard — block deleting a question referenced by any
    // quiz and list the quizzes that use it (ROADMAP.md §5 P2).
    setDeleteError(null);
    try {
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
