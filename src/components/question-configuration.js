'use client';

import { useState } from 'react';
import { useQuizConfigStore } from '@/stores/quiz-configuration-store';
import { getAlpha } from '@/utils';

// The shared question form — used by the standalone editor (/admin/question)
// and by the quiz builder's inline "new question" panel. Presentation is
// navy + gold (design bundle); all store wiring is unchanged.
const fieldStyle = { background: 'var(--background)', border: '2px solid rgba(246,197,68,.35)' };
const SectionLabel = ({ children }) => (
  <div className="mb-2 text-xs tracking-[0.16em]" style={{ color: '#6E82B0' }}>{children}</div>
);

const QuestionConfiguration = ({ questionIndex, validation }) => {
  const {
    fullQuiz,
    changeQuestionText,
    changeTileName,
    addAnswer,
    deleteAnswer,
    updateAnswer,
    updateIsCorrect,
    addTag,
    removeTag,
  } = useQuizConfigStore();
  const [tagDraft, setTagDraft] = useState('');
  const currentQuestion = fullQuiz[questionIndex];

  if (!currentQuestion) {
    return <div style={{ color: '#9FB4DE' }}>Loading…</div>;
  }

  const commitTag = () => {
    addTag({ questionIndex, value: tagDraft });
    setTagDraft('');
  };

  return (
    <div className="flex flex-col gap-5">
      <div>
        <SectionLabel>QUESTION</SectionLabel>
        <input
          type="text"
          value={currentQuestion.questionText}
          placeholder="What are you asking?"
          onChange={(e) => changeQuestionText({ questionIndex, value: e.target.value })}
          className="w-full rounded-xl px-4 py-3.5 text-[19px] font-semibold text-foreground outline-none placeholder:text-[#5A6E9E] focus:border-primary"
          style={fieldStyle}
        />
        {validation?.questionText && <div className="error-message mt-1.5">Please fill in the question text.</div>}
      </div>

      <div className="flex flex-col gap-5 sm:flex-row">
        <div className="sm:w-[280px] sm:flex-none">
          <SectionLabel>TILE NAME</SectionLabel>
          <input
            type="text"
            value={currentQuestion.tileName}
            placeholder="Short board label"
            maxLength={60}
            onChange={(e) => changeTileName({ questionIndex, value: e.target.value })}
            className="w-full rounded-xl px-4 py-3 text-[16px] font-semibold text-foreground outline-none placeholder:text-[#5A6E9E] focus:border-primary"
            style={fieldStyle}
          />
          {validation?.tileName && <div className="error-message mt-1.5">Please fill in the tile name.</div>}
        </div>

        <div className="min-w-0 flex-1">
          <SectionLabel>TAGS <span className="lowercase" style={{ letterSpacing: 0 }}>· optional, for search</span></SectionLabel>
          {(currentQuestion.tags ?? []).length > 0 && (
            <div className="mb-2 flex flex-wrap gap-2">
              {(currentQuestion.tags ?? []).map((tag) => (
                <span key={tag} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm" style={{ background: 'rgba(56,189,248,.14)', color: '#8FD4F5' }}>
                  {tag}
                  <button type="button" aria-label={`Remove tag ${tag}`} className="opacity-70 hover:opacity-100" onClick={() => removeTag({ questionIndex, tag })}>×</button>
                </span>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <input
              type="text"
              value={tagDraft}
              maxLength={30}
              placeholder="e.g. geography"
              onChange={(ev) => setTagDraft(ev.target.value)}
              onKeyDown={(ev) => { if (ev.key === 'Enter') { ev.preventDefault(); commitTag(); } }}
              className="min-w-0 flex-1 rounded-xl px-3.5 py-2.5 text-sm text-foreground outline-none placeholder:text-[#5A6E9E] focus:border-primary"
              style={{ background: 'var(--background)', border: '2px solid rgba(255,255,255,.1)' }}
            />
            <button type="button" disabled={!tagDraft.trim()} onClick={commitTag} className="rounded-xl border border-white/[.16] px-4 text-sm font-bold text-[#C7D2EC] hover:bg-accent disabled:opacity-40">
              Add
            </button>
          </div>
        </div>
      </div>

      <div>
        <SectionLabel>ANSWERS <span className="lowercase" style={{ letterSpacing: 0 }}>· tap the circle to mark the correct one</span></SectionLabel>
        <div className="flex flex-col gap-2.5">
          {currentQuestion.possibleAnswers.map(({ answerMessage, isCorrect }, index) => (
            <div key={`answer-${index}`}>
              <div
                className="flex items-center gap-3.5 rounded-xl px-3.5 py-2.5"
                style={{ background: 'var(--background)', border: isCorrect ? '2px solid var(--success)' : '2px solid rgba(255,255,255,.1)' }}
              >
                <button
                  type="button"
                  role="radio"
                  aria-checked={isCorrect}
                  aria-label={`Mark answer ${getAlpha(index)} correct`}
                  onClick={() => updateIsCorrect({ questionIndex, answerIndex: index, value: true })}
                  className="flex flex-none items-center justify-center rounded-full"
                  style={{ width: 30, height: 30, border: isCorrect ? '2px solid var(--success)' : '2px solid rgba(255,255,255,.2)', background: isCorrect ? 'var(--success)' : 'transparent', color: '#04140C', fontWeight: 800 }}
                >
                  {isCorrect ? '✓' : ''}
                </button>
                <span className="flex-none font-display" style={{ width: 16, fontSize: 16, color: isCorrect ? '#7FE3AF' : '#9FB4DE' }}>{getAlpha(index)}</span>
                <input
                  type="text"
                  value={answerMessage}
                  placeholder={`Answer ${index + 1}`}
                  maxLength={500}
                  onChange={(ev) => updateAnswer({ questionIndex, answerIndex: index, value: ev.currentTarget.value })}
                  className="min-w-0 flex-1 bg-transparent text-[17px] font-semibold text-foreground outline-none placeholder:text-[#5A6E9E]"
                />
                {isCorrect && <span className="flex-none rounded-full px-2.5 py-1 text-[11px] font-extrabold tracking-wide" style={{ background: 'var(--success)', color: '#04140C' }}>CORRECT</span>}
                <button
                  type="button"
                  aria-label={`Delete answer ${index + 1}`}
                  onClick={() => deleteAnswer({ questionIndex, answerIndex: index })}
                  className="flex flex-none items-center justify-center rounded-lg text-base hover:text-foreground"
                  style={{ width: 30, height: 30, color: '#6E82B0' }}
                >
                  ×
                </button>
              </div>
              {validation && validation.possibleAnswers[index] && (
                <div className="error-message mt-1">Please fill in all the answer options.</div>
              )}
            </div>
          ))}
        </div>
        {validation?.hasNoCorrectAnswers && <div className="error-message mt-2">Please select the correct answer.</div>}
        {currentQuestion.possibleAnswers.length < 4 && (
          <button type="button" onClick={() => addAnswer({ questionIndex })} className="mt-3 rounded-xl border border-white/[.16] px-4 py-2.5 text-sm font-bold text-[#C7D2EC] hover:bg-accent">
            + Add answer
          </button>
        )}
      </div>
    </div>
  );
};

export default QuestionConfiguration;
