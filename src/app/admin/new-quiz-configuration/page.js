'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { X } from 'lucide-react';
import {
  Button,
  Checkbox,
  Input,
  Label,
  RadioGroup,
  RadioGroupItem,
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from '@/components';
import Loading from '@/components/loading';
import QuestionConfiguration from '@/components/question-configuration';
import { ArrowUturnLeftIcon } from '@heroicons/react/20/solid';
import { useAuth } from '@/context/auth-context';
import { useQuestions } from '@/hooks/useQuestions';
import { useQuizConfigStore } from '@/stores';
import { validateQuestion, validateQuizConfig } from '@/app/validations';
import { addQuestion } from '@/data/questions';
import { addQuiz, editQuiz, getQuiz } from '@/data/quizzes';

// A quiz is a name + answer mode + POINTERS into the question library.
// Teams use the MVP defaults (Team 1 / Team 2). Edit mode: ?id=<docId>.
// The main view lists the SELECTED questions; the library lives in a
// searchable side drawer so large libraries stay manageable.
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

  // Library drawer state.
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [hideAdded, setHideAdded] = useState(false);

  // Mix-and-match: author a brand-new question inline. It is saved to the
  // LIBRARY (quizzes only ever point to library questions) and then
  // auto-selected into this quiz.
  const { fullQuiz, setupSingleQuestion, resetQuiz } = useQuizConfigStore();
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newQuestionValidation, setNewQuestionValidation] = useState(null);
  const [newQuestionError, setNewQuestionError] = useState(null);
  const [isSavingNewQuestion, setIsSavingNewQuestion] = useState(false);

  const openNewQuestion = () => {
    setupSingleQuestion();
    setNewQuestionValidation(null);
    setNewQuestionError(null);
    setIsAddingNew(true);
  };

  const cancelNewQuestion = () => {
    resetQuiz();
    setIsAddingNew(false);
  };

  const saveNewQuestion = async () => {
    setNewQuestionError(null);
    const draft = fullQuiz[0];
    const { isValid, ...rest } = validateQuestion(draft);
    if (!isValid) {
      return setNewQuestionValidation(rest);
    }
    setNewQuestionValidation(null);
    setIsSavingNewQuestion(true);
    try {
      const docRef = await addQuestion({ ownerId: user.uid, question: draft });
      setSelectedIds((current) => [...current, docRef.id]);
      resetQuiz();
      setIsAddingNew(false);
    } catch (error) {
      setNewQuestionError(error.message);
    }
    setIsSavingNewQuestion(false);
  };

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
  const questionsById = new Map((questions ?? []).map((q) => [q.id, q]));
  const orphanedIds = libraryReady ? selectedIds.filter((qid) => !questionsById.has(qid)) : [];

  const save = async () => {
    setSaveError(null);
    const questionIds = libraryReady
      ? selectedIds.filter((qid) => questionsById.has(qid))
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

  const normalizedSearch = search.trim().toLowerCase();
  const filteredQuestions = (questions ?? []).filter((q) => {
    if (hideAdded && selectedIds.includes(q.id)) return false;
    if (!normalizedSearch) return true;
    return q.tileName.toLowerCase().includes(normalizedSearch)
      || q.questionText.toLowerCase().includes(normalizedSearch);
  });

  return (
    <div className="flex flex-col justify-center gap-4 text-left">
      <div className="flex justify-between py-5">
        <Button onClick={() => router.push('/admin')} aria-label="Back to admin"><ArrowUturnLeftIcon className="size-6"/></Button>
        <Button onClick={save} disabled={isSaving || isAddingNew}>{isSaving ? 'Saving…' : 'Save'}</Button>
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
          <span>Questions in this quiz ({liveSelectedCount})</span>
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
              consider an even count.
            </p>
          )}
          {validation?.noQuestions && <div className="error-message">Pick at least one question.</div>}

          {selectedIds.length === 0 && (
            <p className="text-sm italic opacity-80">No questions yet — add some below.</p>
          )}
          <div className="flex flex-col gap-2">
            {selectedIds.map((qid) => {
              const question = questionsById.get(qid);
              return (
                <div key={qid} className="flex items-center gap-3 rounded-md border border-purple-600 bg-purple-900/30 p-3">
                  <div className="grow min-w-0">
                    {question ? (
                      <>
                        <span className="font-semibold">{question.tileName}</span>{' '}
                        <span className="text-sm opacity-80">{question.questionText}</span>
                      </>
                    ) : (
                      <span className="text-sm italic opacity-70">
                        {libraryReady ? 'Deleted question — dropped on save' : 'Loading…'}
                      </span>
                    )}
                  </div>
                  <Button size="sm" variant="outline" aria-label="Remove from quiz" onClick={() => toggleQuestion(qid)}>
                    <X className="size-4"/>
                  </Button>
                </div>
              );
            })}
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            <Button onClick={() => setIsLibraryOpen(true)} disabled={isAddingNew}>
              Add from library
            </Button>
            {!isAddingNew && (
              <Button variant="outline" onClick={openNewQuestion}>
                Write a new question
              </Button>
            )}
          </div>

          {isAddingNew && (
            <div className="rounded-md border border-purple-500 bg-purple-900/30 p-4 flex flex-col gap-2">
              <h3 className="font-semibold">New question</h3>
              <p className="text-sm italic opacity-80">
                It gets saved to your library and added to this quiz — finish or
                cancel it before saving the quiz.
              </p>
              {newQuestionError && <div className="error-message">Could not save: {newQuestionError}</div>}
              <QuestionConfiguration questionIndex={0} validation={newQuestionValidation}/>
              <div className="flex gap-2">
                <Button onClick={saveNewQuestion} disabled={isSavingNewQuestion}>
                  {isSavingNewQuestion ? 'Saving…' : 'Save & add to quiz'}
                </Button>
                <Button variant="outline" onClick={cancelNewQuestion} disabled={isSavingNewQuestion}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      <Sheet open={isLibraryOpen} onOpenChange={setIsLibraryOpen}>
        <SheetContent>
          <SheetTitle>Your question library</SheetTitle>
          <SheetDescription>Tick questions to add them to the quiz.</SheetDescription>
          <Input
            type="text"
            placeholder="Search questions…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <Checkbox checked={hideAdded} onCheckedChange={(value) => setHideAdded(!!value)}/>
            Hide questions already in the quiz
          </label>
          <div className="flex-1 overflow-y-auto flex flex-col gap-2 pr-1">
            {libraryLoading && <Loading/>}
            {!libraryLoading && !questions?.length && (
              <p className="italic text-sm">Your library is empty — write your first question from the builder.</p>
            )}
            {!libraryLoading && questions?.length > 0 && filteredQuestions.length === 0 && (
              <p className="italic text-sm">No questions match.</p>
            )}
            {filteredQuestions.map(({ id: questionId, tileName, questionText }) => (
              <label key={questionId} className="flex items-center gap-3 rounded-md border border-purple-600 bg-purple-900/30 p-3 cursor-pointer">
                <Checkbox
                  checked={selectedIds.includes(questionId)}
                  onCheckedChange={() => toggleQuestion(questionId)}
                />
                <span className="flex flex-col min-w-0">
                  <span className="font-semibold">{tileName}</span>
                  <span className="text-sm opacity-80">{questionText}</span>
                </span>
              </label>
            ))}
          </div>
          <div className="flex items-center justify-between border-t border-purple-700 pt-3">
            <span className="text-sm">{liveSelectedCount} in quiz</span>
            <SheetClose asChild>
              <Button>Done</Button>
            </SheetClose>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

const NewQuizConfiguration = () => (
  <Suspense fallback={<Loading/>}>
    <QuizBuilder/>
  </Suspense>
);

export default NewQuizConfiguration;
