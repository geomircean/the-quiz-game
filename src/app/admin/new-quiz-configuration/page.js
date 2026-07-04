'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button, Checkbox, Input, Label, RadioGroup, RadioGroupItem } from '@/components';
import Loading from '@/components/loading';
import { ArrowUturnLeftIcon } from '@heroicons/react/20/solid';
import { useAuth } from '@/context/auth-context';
import { useQuestions } from '@/hooks/useQuestions';
import { validateQuizConfig } from '@/app/validations';
import { addQuiz, editQuiz, getQuiz } from '@/data/quizzes';

// A quiz is a name + answer mode + POINTERS into the question library.
// Teams use the MVP defaults (Team 1 / Team 2). Edit mode: ?id=<docId>.
const QuizBuilder = () => {
  const router = useRouter();
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const { questions, isLoading: libraryLoading } = useQuestions();

  const [name, setName] = useState('');
  const [answerMode, setAnswerMode] = useState('firstTap');
  const [selectedIds, setSelectedIds] = useState([]);
  const [validation, setValidation] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [isHydrating, setIsHydrating] = useState(!!id);

  useEffect(() => {
    if (!id) return undefined;
    let cancelled = false;
    getQuiz(id)
      .then((existing) => {
        if (cancelled) return;
        if (existing) {
          setName(existing.name);
          setAnswerMode(existing.answerMode);
          setSelectedIds(existing.questionIds);
        } else {
          setLoadError('Quiz not found.');
        }
        setIsHydrating(false);
      })
      .catch((error) => {
        if (cancelled) return;
        setLoadError(error.message);
        setIsHydrating(false);
      });
    return () => { cancelled = true; };
  }, [id]);

  const toggleQuestion = (questionId) => {
    setSelectedIds((current) => current.includes(questionId)
      ? current.filter((qid) => qid !== questionId)
      : [...current, questionId]);
  };

  // Ids that point at since-deleted library questions (possible despite the
  // delete-guard: e.g. deleted from another tab while this builder was open).
  // They are surfaced below and dropped on save — but only when the library
  // has actually loaded, so a failed subscription can never wipe valid ids.
  const libraryReady = !libraryLoading && Array.isArray(questions);
  const libraryIds = new Set((questions ?? []).map((q) => q.id));
  const orphanedIds = libraryReady ? selectedIds.filter((qid) => !libraryIds.has(qid)) : [];

  const save = async () => {
    setSaveError(null);
    const questionIds = libraryReady
      ? selectedIds.filter((qid) => libraryIds.has(qid))
      : selectedIds;
    const result = validateQuizConfig({ quizName: name, questionIds });
    if (!result.isValid) {
      return setValidation(result);
    }
    setValidation(null);
    setIsSaving(true);
    try {
      const quiz = { name, answerMode, questionIds };
      if (id) {
        await editQuiz({ id, quiz });
      } else {
        await addQuiz({ ownerId: user.uid, quiz });
      }
      router.push('/admin');
    } catch (error) {
      setSaveError(error.message);
      setIsSaving(false);
    }
  };

  if (loadError) {
    return (
      <div className="flex flex-col items-center gap-4 py-8">
        <div className="error-message">Could not load quiz: {loadError}</div>
        <Button onClick={() => router.push('/admin')}>Back to Admin</Button>
      </div>
    );
  }

  if (isHydrating) {
    return <Loading/>;
  }

  const liveSelectedCount = selectedIds.length - orphanedIds.length;
  const oddTileCount = liveSelectedCount > 0 && liveSelectedCount % 2 === 1;

  return (
    <div className="flex flex-col justify-center gap-4 text-left">
      <div className="flex justify-between py-5">
        <Button onClick={() => router.push('/admin')}><ArrowUturnLeftIcon className="size-6"/></Button>
        <Button onClick={save} disabled={isSaving}>{isSaving ? 'Saving…' : 'Save'}</Button>
      </div>
      <div className="mx-auto w-full max-w-3xl flex flex-col gap-6">
        <h1 className="text-2xl text-center">{id ? 'Edit quiz' : 'Create new quiz'}</h1>
        {saveError && <div className="error-message text-center">Could not save: {saveError}</div>}

        <label className="flex flex-col gap-2">
          Quiz Name
          <Input type="text" value={name} onChange={(e) => setName(e.target.value)}/>
        </label>
        {validation?.quizNameMissing && <div className="error-message">Please name the quiz.</div>}
        {validation?.quizNameTooLong && <div className="error-message">Quiz names are capped at 120 characters.</div>}

        <div className="flex flex-col gap-2">
          <span>How does a team answer?</span>
          <RadioGroup value={answerMode} onValueChange={setAnswerMode}>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="firstTap" id="mode-first-tap"/>
              <Label htmlFor="mode-first-tap" theme="purple">
                First tap locks it — the first player to tap answers for the whole team
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="majority" id="mode-majority"/>
              <Label htmlFor="mode-majority" theme="purple">
                Majority wins — everyone taps, most-tapped answer counts (a tie is wrong)
              </Label>
            </div>
          </RadioGroup>
        </div>

        <div className="flex flex-col gap-1">
          <span>Teams</span>
          <p className="text-sm italic">Team 1 vs Team 2 — players pick their team when they join.</p>
        </div>

        <div className="flex flex-col gap-2">
          <span>Pick questions from your library ({liveSelectedCount} selected)</span>
          {orphanedIds.length > 0 && (
            <p className="text-sm italic text-amber-300">
              {orphanedIds.length} previously selected question{orphanedIds.length > 1 ? 's were' : ' was'} deleted
              from the library and will be removed from this quiz when you save.
            </p>
          )}
          {validation?.tooManyQuestions && (
            <div className="error-message">A quiz is capped at 50 questions — deselect some.</div>
          )}
          {oddTileCount && (
            <p className="text-sm italic text-amber-300">
              Heads up: an odd number of tiles gives the first team one extra pick —
              an even count keeps turns fair.
            </p>
          )}
          {validation?.noQuestions && <div className="error-message">Pick at least one question.</div>}
          {libraryLoading && <Loading/>}
          {!libraryLoading && !questions?.length && (
            <p className="italic">
              Your library is empty — add questions first from the admin page.
            </p>
          )}
          <div className="flex flex-col gap-2">
            {questions?.map(({ id: questionId, tileName, questionText }) => (
              <label key={questionId} className="flex items-center gap-3 rounded-md border border-purple-600 bg-purple-900/30 p-3 cursor-pointer">
                <Checkbox
                  checked={selectedIds.includes(questionId)}
                  onCheckedChange={() => toggleQuestion(questionId)}
                />
                <span className="font-semibold">{tileName}</span>
                <span className="text-sm opacity-80 truncate">{questionText}</span>
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const NewQuizConfiguration = () => (
  <Suspense fallback={<Loading/>}>
    <QuizBuilder/>
  </Suspense>
);

export default NewQuizConfiguration;
