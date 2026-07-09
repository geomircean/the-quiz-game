'use client';

import { useState } from 'react';
import {
  Button,
  Input,
  Label,
  RadioGroup,
  RadioGroupItem,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from '@/components/base';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/context/toast-context';
import { useQuestions } from '@/hooks/useQuestions';
import { addQuiz } from '@/data/quizzes';

const shuffle = (list) => {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

// Generate a quiz from N random library questions, optionally narrowed by
// tags. The result is a perfectly normal quiz — edit it afterwards to see
// or tweak the picks.
const RandomQuizSheet = ({ open, onOpenChange }) => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { questions, isLoading } = useQuestions();

  const [name, setName] = useState('');
  const [count, setCount] = useState('6');
  const [answerMode, setAnswerMode] = useState('firstTap');
  const [selectedTags, setSelectedTags] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState(null);

  const toggleTag = (tag) =>
    setSelectedTags((current) => current.includes(tag)
      ? current.filter((t) => t !== tag)
      : [...current, tag]);

  const allTags = [...new Set((questions ?? []).flatMap((q) => q.tags ?? []))].sort();
  const pool = (questions ?? []).filter((q) =>
    !selectedTags.some((tag) => !(q.tags ?? []).includes(tag)));

  const requested = Number.parseInt(count, 10);
  const effectiveCount = Number.isNaN(requested)
    ? 0
    : Math.max(1, Math.min(requested, pool.length, 50));
  const isOdd = effectiveCount > 0 && effectiveCount % 2 === 1;

  const generate = async () => {
    setGenerateError(null);
    if (pool.length === 0) {
      return setGenerateError(selectedTags.length > 0
        ? 'No questions match those tags — clear some.'
        : 'Your library is empty — add questions first.');
    }
    if (effectiveCount < 1) {
      return setGenerateError('Pick how many questions the quiz should have.');
    }
    setIsGenerating(true);
    try {
      const questionIds = shuffle(pool).slice(0, effectiveCount).map((q) => q.id);
      const quiz = {
        name: name.trim() || 'Random Quiz',
        answerMode,
        questionIds,
      };
      await addQuiz({ ownerId: user.uid, quiz });
      showToast(`Random quiz generated (${questionIds.length} tile${questionIds.length === 1 ? '' : 's'})`);
      onOpenChange(false);
    } catch (error) {
      setGenerateError(error.message);
    }
    setIsGenerating(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetTitle>Generate a random quiz</SheetTitle>
        <SheetDescription>
          Picks random questions from your library — edit the quiz afterwards to
          see or swap the picks.
        </SheetDescription>

        <label className="flex flex-col gap-2 text-sm">
          Quiz name
          <Input type="text" placeholder="Random Quiz" value={name} onChange={(e) => setName(e.target.value)}/>
        </label>

        <label className="flex flex-col gap-2 text-sm">
          How many questions? ({pool.length} available{selectedTags.length > 0 ? ' with those tags' : ''})
          <Input
            type="number"
            min={1}
            max={Math.min(pool.length || 1, 50)}
            value={count}
            className="max-w-24"
            onChange={(e) => setCount(e.target.value)}
          />
        </label>
        {isOdd && (
          <p className="text-xs italic text-primary">
            An odd tile count gives the first team one extra pick — consider an even number.
          </p>
        )}

        {allTags.length > 0 && (
          <div className="flex flex-col gap-2 text-sm">
            <span>Only use questions tagged:</span>
            <div className="flex flex-wrap items-center gap-2">
              {allTags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className="rounded-full px-3 py-1 text-sm transition"
                  style={selectedTags.includes(tag)
                    ? { background: 'var(--primary)', color: 'var(--primary-foreground)', fontWeight: 700 }
                    : { background: 'rgba(56,189,248,.12)', color: '#8FD4F5' }}
                >
                  {tag}
                </button>
              ))}
              {selectedTags.length > 0 && (
                <button type="button" className="text-sm underline" style={{ color: '#9FB4DE' }} onClick={() => setSelectedTags([])}>
                  clear
                </button>
              )}
            </div>
          </div>
        )}

        <div className="flex flex-col gap-2 text-sm">
          <span>How does a team answer?</span>
          <RadioGroup value={answerMode} onValueChange={setAnswerMode}>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="firstTap" id="random-mode-first-tap"/>
              <Label htmlFor="random-mode-first-tap" theme="purple">First tap locks it</Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="majority" id="random-mode-majority"/>
              <Label htmlFor="random-mode-majority" theme="purple">Majority wins (a tie is wrong)</Label>
            </div>
          </RadioGroup>
        </div>

        {generateError && <div className="error-message">{generateError}</div>}

        <div className="mt-auto flex items-center justify-between border-t border-white/10 pt-3">
          <span className="text-sm">{effectiveCount || 0} tiles</span>
          <Button onClick={generate} disabled={isGenerating || isLoading}>
            {isGenerating ? 'Generating…' : 'Generate quiz'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default RandomQuizSheet;
