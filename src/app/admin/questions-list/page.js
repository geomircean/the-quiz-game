'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Loading from '@/components/loading';
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

  const tagButton = (tag, active, extra = '') => (
    <button
      key={tag}
      type="button"
      onClick={() => toggleTag(tag)}
      className={`rounded-full px-3 py-1 text-sm transition ${extra}`}
      style={active
        ? { background: 'var(--primary)', color: 'var(--primary-foreground)', fontWeight: 700 }
        : { background: 'rgba(56,189,248,.12)', color: '#8FD4F5' }}
    >
      {tag}
    </button>
  );

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-6 py-8 sm:px-10">
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={() => router.push('/admin')} className="text-sm hover:text-foreground" style={{ color: '#7C8DB5' }}>← Studio</button>
        <span style={{ color: '#33456F' }}>/</span>
        <h1 className="font-display tracking-[0.06em]" style={{ fontSize: 30 }}>LIBRARY</h1>
        <button
          type="button"
          onClick={() => router.push('/admin/question')}
          className="ml-auto rounded-xl bg-primary px-5 py-2.5 font-display tracking-wide text-primary-foreground hover:bg-primary/90"
          style={{ fontSize: 15 }}
        >
          + ADD QUESTION
        </button>
      </div>

      {error && <div className="error-message">Could not load questions: {error.message}</div>}
      {deleteError && <div className="error-message">Could not delete: {deleteError}</div>}
      {isLoading && <Loading/>}
      {!isLoading && !questions?.length && (
        <div className="rounded-2xl border border-dashed border-white/10 p-12 text-center" style={{ background: 'var(--card)' }}>
          <p className="italic" style={{ color: '#9FB4DE' }}>No questions saved yet — add your first one.</p>
        </div>
      )}

      {!!questions?.length && (
        <div className="flex flex-col gap-3">
          <input
            type="text"
            placeholder="Search questions…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-md rounded-xl px-4 py-2.5 text-sm text-foreground outline-none placeholder:text-[#5A6E9E] focus:border-primary"
            style={{ background: 'var(--card)', border: '2px solid rgba(255,255,255,.1)' }}
          />
          {allTags.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              {allTags.map((tag) => tagButton(tag, selectedTags.includes(tag)))}
              {selectedTags.length > 0 && (
                <button type="button" className="text-sm underline" style={{ color: '#9FB4DE' }} onClick={() => setSelectedTags([])}>clear</button>
              )}
            </div>
          )}
          {filteredQuestions.length === 0 && <p className="text-sm italic" style={{ color: '#9FB4DE' }}>No questions match.</p>}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredQuestions.map(({ id, tileName, questionText, possibleAnswers, tags }) => (
          <div key={id} className="flex flex-col gap-3 rounded-2xl p-5" style={{ background: 'var(--card)', border: '1px solid rgba(255,255,255,.08)' }}>
            <div>
              <div className="font-display tracking-[0.03em]" style={{ fontSize: 18 }}>{tileName.toUpperCase()}</div>
              <p className="mt-1.5 text-[15px]" style={{ color: '#C7D2EC' }}>{questionText}</p>
            </div>
            <p className="text-xs" style={{ color: '#7C8DB5' }}>{possibleAnswers?.length ?? 0} answer{(possibleAnswers?.length ?? 0) === 1 ? '' : 's'}</p>
            {(tags ?? []).length > 0 && (
              <div className="flex flex-wrap gap-1.5">{tags.map((tag) => tagButton(tag, selectedTags.includes(tag)))}</div>
            )}
            <div className="mt-auto flex gap-2 pt-1">
              <button type="button" onClick={() => router.push(`/admin/question/?id=${id}`)} className="rounded-[10px] border border-white/[.16] px-3.5 py-2 text-sm font-semibold text-[#C7D2EC] hover:bg-accent">Edit</button>
              <button type="button" onClick={() => onDelete(id, tileName)} className="rounded-[10px] border px-3.5 py-2 text-sm font-semibold" style={{ borderColor: 'rgba(229,72,77,.4)', color: '#F0A0A3' }}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default QuestionsList;
