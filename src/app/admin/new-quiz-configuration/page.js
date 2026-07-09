'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Checkbox,
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
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/context/toast-context';
import { useQuestions } from '@/hooks/useQuestions';
import { useQuizConfigStore } from '@/stores';
import { validateQuestion, validateQuizConfig } from '@/app/validations';
import { addQuestion } from '@/data/questions';
import { addQuiz, editQuiz, getQuiz } from '@/data/quizzes';

const goldBtn = 'rounded-xl bg-primary px-5 py-2.5 font-display tracking-wide text-primary-foreground hover:bg-primary/90 disabled:opacity-50';
const outlineBtn = 'rounded-xl border border-white/[.16] px-4 py-2.5 text-sm font-bold text-[#C7D2EC] hover:bg-accent disabled:opacity-40';
const fieldStyle = { background: 'var(--card)', border: '2px solid rgba(246,197,68,.35)' };

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
  const { showToast } = useToast();

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
  const [selectedTags, setSelectedTags] = useState([]);

  const toggleTag = (tag) =>
    setSelectedTags((current) => current.includes(tag)
      ? current.filter((t) => t !== tag)
      : [...current, tag]);

  // Mix-and-match: brand-new questions are held as LOCAL DRAFTS and only
  // written to the library when the quiz itself is saved — abandoning the
  // builder leaves no strays behind. Drafts are editable and removable
  // until then.
  const { fullQuiz, setupSingleQuestion, loadQuestion, resetQuiz } = useQuizConfigStore();
  const [draftQuestions, setDraftQuestions] = useState([]);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [editingDraftId, setEditingDraftId] = useState(null);
  const [newQuestionValidation, setNewQuestionValidation] = useState(null);

  const openNewQuestion = () => {
    setupSingleQuestion();
    setEditingDraftId(null);
    setNewQuestionValidation(null);
    setIsAddingNew(true);
  };

  const openEditDraft = (draft) => {
    // Clone: the store mutates its question in place, and Cancel must not
    // have touched the stored draft.
    loadQuestion(structuredClone(draft));
    setEditingDraftId(draft.localId);
    setNewQuestionValidation(null);
    setIsAddingNew(true);
  };

  const closeQuestionPanel = () => {
    resetQuiz();
    setIsAddingNew(false);
    setEditingDraftId(null);
  };

  const addDraftToQuiz = () => {
    const draft = fullQuiz[0];
    const { isValid, ...rest } = validateQuestion(draft);
    if (!isValid) {
      return setNewQuestionValidation(rest);
    }
    const { questionText, tileName, possibleAnswers } = structuredClone(draft);
    setDraftQuestions((current) => editingDraftId
      ? current.map((d) => d.localId === editingDraftId
        ? { ...d, questionText, tileName, possibleAnswers }
        : d)
      : [...current, { localId: crypto.randomUUID(), questionText, tileName, possibleAnswers }]);
    closeQuestionPanel();
  };

  const removeDraft = (localId) =>
    setDraftQuestions((current) => current.filter((d) => d.localId !== localId));

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
    const libraryQuestionIds = libraryReady
      ? selectedIds.filter((qid) => questionsById.has(qid))
      : selectedIds;
    // Drafts count toward the quiz size for validation purposes.
    const result = validateQuizConfig({
      quizName: name,
      questionIds: [...libraryQuestionIds, ...draftQuestions.map((d) => d.localId)],
    });
    if (!result.isValid) {
      return setValidation(result);
    }
    setValidation(null);
    setIsSaving(true);

    // Drafts are persisted to the library NOW (quizzes only ever point to
    // library questions), then the quiz references them. If something fails
    // midway, the already-saved drafts are moved into selectedIds so a
    // retry cannot create duplicates.
    const savedDraftIds = [];
    const remainingDrafts = [...draftQuestions];
    try {
      for (const draft of draftQuestions) {
        const docRef = await addQuestion({ ownerId: user.uid, question: draft });
        savedDraftIds.push(docRef.id);
        remainingDrafts.shift();
      }
      const quiz = { name, answerMode, questionIds: [...libraryQuestionIds, ...savedDraftIds] };
      if (id) {
        await editQuiz({ id, quiz });
      } else {
        await addQuiz({ ownerId: user.uid, quiz });
      }
      showToast(id ? 'Quiz updated' : 'Quiz saved');
      router.push('/admin');
    } catch (error) {
      if (savedDraftIds.length > 0) {
        setSelectedIds((current) => [...current, ...savedDraftIds]);
        setDraftQuestions(remainingDrafts);
      }
      setSaveError(error.message);
      setIsSaving(false);
    }
  };

  if (loadError) {
    return (
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-4 px-6 py-16">
        <div className="error-message">Could not load quiz: {loadError}</div>
        <button type="button" onClick={() => router.push('/admin')} className={outlineBtn}>Back to studio</button>
      </div>
    );
  }

  if (isHydrating) {
    return <Loading/>;
  }

  const liveSelectedCount = selectedIds.length - orphanedIds.length;
  const totalCount = liveSelectedCount + draftQuestions.length;
  const oddTileCount = totalCount > 0 && totalCount % 2 === 1;

  const allTags = [...new Set((questions ?? []).flatMap((q) => q.tags ?? []))].sort();
  const normalizedSearch = search.trim().toLowerCase();
  // Selected tags narrow (AND); search matches tile name or question text.
  const filteredQuestions = (questions ?? []).filter((q) => {
    if (hideAdded && selectedIds.includes(q.id)) return false;
    if (selectedTags.some((tag) => !(q.tags ?? []).includes(tag))) return false;
    if (!normalizedSearch) return true;
    return q.tileName.toLowerCase().includes(normalizedSearch)
      || q.questionText.toLowerCase().includes(normalizedSearch);
  });

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-8 text-left">
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={() => router.push('/admin')} className="text-sm hover:text-foreground" style={{ color: '#7C8DB5' }}>← Studio</button>
        <span style={{ color: '#33456F' }}>/</span>
        <h1 className="font-display tracking-[0.06em]" style={{ fontSize: 28 }}>{id ? 'EDIT QUIZ' : 'NEW QUIZ'}</h1>
        <button type="button" onClick={save} disabled={isSaving || isAddingNew} className="ml-auto rounded-xl bg-primary px-6 py-2.5 font-display tracking-wide text-primary-foreground hover:bg-primary/90 disabled:opacity-50" style={{ fontSize: 15 }}>
          {isSaving ? 'SAVING…' : 'SAVE'}
        </button>
      </div>
      {saveError && <div className="error-message">Could not save: {saveError}</div>}

      <div>
        <div className="mb-2 text-xs tracking-[0.16em]" style={{ color: '#6E82B0' }}>QUIZ NAME</div>
        <input
          type="text"
          value={name}
          placeholder="Friday Night Trivia"
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-xl px-4 py-3 text-[18px] font-semibold text-foreground outline-none placeholder:text-[#5A6E9E] focus:border-primary"
          style={fieldStyle}
        />
        {validation?.quizNameMissing && <div className="error-message mt-1.5">Please name the quiz.</div>}
        {validation?.quizNameTooLong && <div className="error-message mt-1.5">Quiz names are capped at 120 characters.</div>}
      </div>

      <div>
        <div className="mb-2.5 text-xs tracking-[0.16em]" style={{ color: '#6E82B0' }}>HOW DOES A TEAM ANSWER?</div>
        <RadioGroup value={answerMode} onValueChange={setAnswerMode} className="flex flex-col gap-2.5">
          {[
            { v: 'firstTap', id: 'mode-first-tap', t: 'First tap locks it', d: 'The first player to tap answers for the whole team.' },
            { v: 'majority', id: 'mode-majority', t: 'Majority wins', d: 'Everyone taps, the most-tapped answer counts (a tie is wrong).' },
          ].map((m) => {
            const on = answerMode === m.v;
            return (
              <label key={m.v} htmlFor={m.id} className="flex cursor-pointer items-start gap-3 rounded-xl p-3.5" style={{ background: 'var(--card)', border: `2px solid ${on ? 'var(--primary)' : 'rgba(255,255,255,.08)'}` }}>
                <RadioGroupItem value={m.v} id={m.id} className="mt-0.5"/>
                <span>
                  <Label htmlFor={m.id} className="block font-display tracking-[0.03em]" style={{ fontSize: 17 }}>{m.t}</Label>
                  <span className="text-sm" style={{ color: '#7C8DB5' }}>{m.d}</span>
                </span>
              </label>
            );
          })}
        </RadioGroup>
      </div>

      <div>
        <div className="mb-1.5 text-xs tracking-[0.16em]" style={{ color: '#6E82B0' }}>TEAMS</div>
        <div className="flex items-center gap-3 rounded-xl px-4 py-3" style={{ background: 'var(--card)', border: '1px solid rgba(255,255,255,.08)' }}>
          <span className="inline-flex items-center gap-2 font-display" style={{ color: '#8FD4F5' }}><span className="rounded-full" style={{ width: 10, height: 10, background: 'var(--sky)' }}/>TEAM 1</span>
          <span className="text-sm" style={{ color: '#6E82B0' }}>vs</span>
          <span className="inline-flex items-center gap-2 font-display" style={{ color: '#F5B48F' }}><span className="rounded-full" style={{ width: 10, height: 10, background: 'var(--coral)' }}/>TEAM 2</span>
          <span className="ml-auto text-sm" style={{ color: '#7C8DB5' }}>players pick their team when they join</span>
        </div>
      </div>

      <div className="flex flex-col gap-2.5">
        <div className="flex items-center gap-2">
          <span className="text-xs tracking-[0.16em]" style={{ color: '#6E82B0' }}>QUESTIONS IN THIS QUIZ</span>
          <span className="rounded-full px-2.5 py-0.5 font-display text-sm" style={{ background: 'var(--secondary)', color: '#C7D2EC' }}>{totalCount}</span>
        </div>

        {orphanedIds.length > 0 && (
          <p className="text-sm italic text-primary">
            {orphanedIds.length} previously selected question{orphanedIds.length > 1 ? 's were' : ' was'} deleted from the library and will be removed when you save.
          </p>
        )}
        {validation?.tooManyQuestions && <div className="error-message">A quiz is capped at 50 questions — deselect some.</div>}
        {oddTileCount && (
          <p className="text-sm italic text-primary">Heads up: an odd number of tiles gives the first team one extra pick — consider an even count.</p>
        )}
        {validation?.noQuestions && <div className="error-message">Pick at least one question.</div>}
        {totalCount === 0 && selectedIds.length === 0 && (
          <p className="text-sm italic" style={{ color: '#7C8DB5' }}>No questions yet — add some below.</p>
        )}

        <div className="flex flex-col gap-2">
          {selectedIds.map((qid) => {
            const question = questionsById.get(qid);
            return (
              <div key={qid} className="flex items-center gap-3 rounded-xl p-3.5" style={{ background: 'var(--card)', border: '1px solid rgba(255,255,255,.1)' }}>
                <div className="min-w-0 grow">
                  {question ? (
                    <><span className="font-semibold">{question.tileName}</span> <span className="text-sm" style={{ color: '#9FB4DE' }}>{question.questionText}</span></>
                  ) : (
                    <span className="text-sm italic" style={{ color: '#7C8DB5' }}>{libraryReady ? 'Deleted question — dropped on save' : 'Loading…'}</span>
                  )}
                </div>
                <button type="button" aria-label="Remove from quiz" onClick={() => toggleQuestion(qid)} className="flex flex-none items-center justify-center rounded-lg text-base" style={{ width: 30, height: 30, background: 'var(--secondary)', color: '#9FB4DE' }}>×</button>
              </div>
            );
          })}
          {draftQuestions.map((draft) => (
            <div key={draft.localId} className="flex items-center gap-3 rounded-xl p-3.5" style={{ background: 'var(--card)', border: '1px dashed rgba(246,197,68,.55)' }}>
              <span className="flex-none rounded-full px-2 py-0.5 text-xs font-bold" style={{ background: 'rgba(246,197,68,.18)', color: 'var(--primary)' }}>new</span>
              <div className="min-w-0 grow">
                <span className="font-semibold">{draft.tileName}</span> <span className="text-sm" style={{ color: '#9FB4DE' }}>{draft.questionText}</span>
              </div>
              <button type="button" aria-label="Edit new question" disabled={isAddingNew} onClick={() => openEditDraft(draft)} className="flex flex-none items-center justify-center rounded-lg text-sm disabled:opacity-40" style={{ width: 30, height: 30, background: 'var(--secondary)', color: '#9FB4DE' }}>✎</button>
              <button type="button" aria-label="Remove new question" onClick={() => removeDraft(draft.localId)} className="flex flex-none items-center justify-center rounded-lg text-base" style={{ width: 30, height: 30, background: 'rgba(229,72,77,.14)', color: '#F0A0A3' }}>×</button>
            </div>
          ))}
        </div>
        {draftQuestions.length > 0 && (
          <p className="text-xs italic" style={{ color: '#7C8DB5' }}>&ldquo;new&rdquo; questions are saved to your library together with the quiz.</p>
        )}

        <div className="flex flex-wrap gap-2 pt-1">
          <button type="button" onClick={() => setIsLibraryOpen(true)} disabled={isAddingNew} className={goldBtn} style={{ fontSize: 15 }}>Add from library</button>
          {!isAddingNew && <button type="button" onClick={openNewQuestion} className={outlineBtn}>Write a new question</button>}
        </div>

        {isAddingNew && (
          <div className="mt-1 flex flex-col gap-3 rounded-[18px] p-5" style={{ background: 'var(--card)', border: '1px solid rgba(246,197,68,.35)' }}>
            <div>
              <h3 className="font-display tracking-[0.04em]" style={{ fontSize: 18 }}>{editingDraftId ? 'EDIT NEW QUESTION' : 'NEW QUESTION'}</h3>
              <p className="text-sm" style={{ color: '#7C8DB5' }}>Added to this quiz now — written to your library when the quiz is saved.</p>
            </div>
            <QuestionConfiguration questionIndex={0} validation={newQuestionValidation}/>
            <div className="flex gap-2">
              <button type="button" onClick={addDraftToQuiz} className={goldBtn} style={{ fontSize: 15 }}>{editingDraftId ? 'Update question' : 'Add to quiz'}</button>
              <button type="button" onClick={closeQuestionPanel} className={outlineBtn}>Cancel</button>
            </div>
          </div>
        )}
      </div>

      <Sheet open={isLibraryOpen} onOpenChange={setIsLibraryOpen}>
        <SheetContent className="gap-3">
          <SheetTitle className="font-display tracking-[0.04em]">YOUR QUESTION LIBRARY</SheetTitle>
          <SheetDescription>Tick questions to add them to the quiz.</SheetDescription>
          <input
            type="text"
            placeholder="Search questions…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rounded-xl px-4 py-2.5 text-sm text-foreground outline-none placeholder:text-[#5A6E9E] focus:border-primary"
            style={{ background: 'var(--card)', border: '2px solid rgba(255,255,255,.1)' }}
          />
          <label className="flex cursor-pointer items-center gap-2 text-sm" style={{ color: '#C7D2EC' }}>
            <Checkbox checked={hideAdded} onCheckedChange={(value) => setHideAdded(!!value)}/>
            Hide questions already in the quiz
          </label>
          {allTags.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              {allTags.map((tag) => {
                const on = selectedTags.includes(tag);
                return (
                  <button key={tag} type="button" onClick={() => toggleTag(tag)} className="rounded-full px-3 py-1 text-sm" style={on ? { background: 'var(--primary)', color: 'var(--primary-foreground)', fontWeight: 700 } : { background: 'rgba(56,189,248,.12)', color: '#8FD4F5' }}>{tag}</button>
                );
              })}
              {selectedTags.length > 0 && <button type="button" className="text-sm underline" style={{ color: '#9FB4DE' }} onClick={() => setSelectedTags([])}>clear</button>}
            </div>
          )}
          <div className="flex flex-1 flex-col gap-2 overflow-y-auto pr-1">
            {libraryLoading && <Loading/>}
            {!libraryLoading && !questions?.length && <p className="text-sm italic" style={{ color: '#9FB4DE' }}>Your library is empty — write your first question from the builder.</p>}
            {!libraryLoading && questions?.length > 0 && filteredQuestions.length === 0 && <p className="text-sm italic" style={{ color: '#9FB4DE' }}>No questions match.</p>}
            {filteredQuestions.map(({ id: questionId, tileName, questionText, tags }) => (
              <label key={questionId} className="flex cursor-pointer items-start gap-3 rounded-xl p-3" style={{ background: 'var(--card)', border: '1px solid rgba(255,255,255,.1)' }}>
                <Checkbox className="mt-0.5" checked={selectedIds.includes(questionId)} onCheckedChange={() => toggleQuestion(questionId)}/>
                <span className="flex min-w-0 flex-col">
                  <span className="font-semibold">{tileName}</span>
                  <span className="text-sm" style={{ color: '#9FB4DE' }}>{questionText}</span>
                  {(tags ?? []).length > 0 && (
                    <span className="flex flex-wrap gap-1 pt-1">
                      {tags.map((tag) => <span key={tag} className="rounded-full px-2 py-0.5 text-xs" style={{ background: 'rgba(56,189,248,.12)', color: '#8FD4F5' }}>{tag}</span>)}
                    </span>
                  )}
                </span>
              </label>
            ))}
          </div>
          <div className="flex items-center justify-between border-t border-white/10 pt-3">
            <span className="text-sm" style={{ color: '#C7D2EC' }}>{totalCount} in quiz</span>
            <SheetClose asChild>
              <button type="button" className={goldBtn} style={{ fontSize: 15 }}>Done</button>
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
