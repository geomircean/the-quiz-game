'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, CardContent, CardHeader, CardTitle, Input } from '@/components';
import Loading from '@/components/loading';
import { ArrowUturnLeftIcon, PencilIcon, TrashIcon } from '@heroicons/react/20/solid';
import { useQuestions } from '@/hooks/useQuestions';
import { deleteQuestion } from '@/data/questions';
import { quizzesUsingQuestion } from '@/data/quizzes';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/context/toast-context';

const QuestionsList = () => {
  const router = useRouter();
  const { user } = useAuth();
  const { questions, error, isLoading } = useQuestions();
  const { showToast } = useToast();
  const [deleteError, setDeleteError] = useState(null);
  const [search, setSearch] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);

  const toggleTag = (tag) =>
    setSelectedTags((current) => current.includes(tag)
      ? current.filter((t) => t !== tag)
      : [...current, tag]);

  const allTags = [...new Set((questions ?? []).flatMap((q) => q.tags ?? []))].sort();
  const normalizedSearch = search.trim().toLowerCase();
  // Selected tags narrow (AND); search matches tile name or question text.
  const filteredQuestions = (questions ?? []).filter((q) => {
    if (selectedTags.some((tag) => !(q.tags ?? []).includes(tag))) return false;
    if (!normalizedSearch) return true;
    return q.tileName.toLowerCase().includes(normalizedSearch)
      || q.questionText.toLowerCase().includes(normalizedSearch);
  });

  const onDelete = async (id, tileName) => {
    if (!window.confirm(`Delete "${tileName}"? This cannot be undone.`)) return;
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
      showToast('Question deleted');
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
      {!!questions?.length && (
        <div className="flex flex-col gap-3">
          <Input
            type="text"
            placeholder="Search questions…"
            value={search}
            className="max-w-md"
            onChange={(e) => setSearch(e.target.value)}
          />
          {allTags.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              {allTags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className={`rounded-full px-3 py-1 text-sm transition-colors ${
                    selectedTags.includes(tag)
                      ? 'bg-purple-500 text-white'
                      : 'bg-purple-900/50 text-purple-200 hover:bg-purple-700/60'
                  }`}
                >
                  {tag}
                </button>
              ))}
              {selectedTags.length > 0 && (
                <button type="button" className="text-sm underline opacity-80" onClick={() => setSelectedTags([])}>
                  clear
                </button>
              )}
            </div>
          )}
          {filteredQuestions.length === 0 && (
            <p className="italic text-sm">No questions match.</p>
          )}
        </div>
      )}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredQuestions.map(({ id, tileName, questionText, possibleAnswers, tags }) => (
          <Card key={id} className="bg-purple-800/40 text-purple-100">
            <CardHeader>
              <CardTitle className="text-xl">{tileName}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <p>{questionText}</p>
              <p className="text-sm italic">{possibleAnswers?.length ?? 0} answers</p>
              {(tags ?? []).length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {tags.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      className="rounded-full bg-purple-900/50 px-2 py-0.5 text-xs text-purple-200 hover:bg-purple-700/60"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <Button size="sm" onClick={() => router.push(`/admin/question/?id=${id}`)}>
                  <PencilIcon className="size-4 mr-1"/> Edit
                </Button>
                <Button size="sm" variant="destructive" onClick={() => onDelete(id, tileName)}>
                  <TrashIcon className="size-4 mr-1"/> Delete
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
