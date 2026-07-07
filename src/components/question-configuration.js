'use client';

import { useState } from 'react';
import { Button, Input } from '@/components/base';
import { useQuizConfigStore } from '@/stores/quiz-configuration-store';
import { TrashIcon, XMarkIcon } from '@heroicons/react/20/solid';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
import { StarIcon as StarIconOutline } from '@heroicons/react/24/outline';


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
  const starIconStyling= 'size-10 text-yellow-300'
  if (!currentQuestion) {
    return <div>Loading...</div>;
  }

  const changeAnswer = (ev, index) => {
    const { value } = ev.currentTarget;
    updateAnswer({ questionIndex, answerIndex: index, value });
  };

  const onCheckCorrectAnswer = (ev, index) => {
    const { checked } = ev.currentTarget;
    updateIsCorrect({ questionIndex, answerIndex: index, value: checked });
  };

  return (
    <div className="flex flex-col py-4 border-b-2 border-amber-100">
      <div>
        <div>
          <label className="flex flex-col justify-evenly w-full items-start gap-2 py-2">
            Question Text
            <Input
              type="text"
              value={currentQuestion.questionText}
              onChange={(e) => changeQuestionText({ questionIndex, value: e.target.value })}
            />
          </label>
          <label className="flex flex-col justify-evenly w-full items-start gap-2 py-2">
            Tile Name (short label shown on the board)
            <Input
              type="text"
              value={currentQuestion.tileName}
              onChange={(e) => changeTileName({ questionIndex, value: e.target.value })}
            />
          </label>
          {validation?.questionText && <div className="error-message">Please fill in the question text.</div>}
          {validation?.tileName && <div className="error-message">Please fill in the tile name.</div>}
          <div className="flex flex-col gap-2 py-2">
            <span>Tags <span className="text-sm italic opacity-70">(optional — for search &amp; filtering)</span></span>
            {(currentQuestion.tags ?? []).length > 0 && (
              <div className="flex flex-wrap gap-2">
                {(currentQuestion.tags ?? []).map((tag) => (
                  <span key={tag} className="flex items-center gap-1 rounded-full bg-purple-700/60 px-3 py-1 text-sm">
                    {tag}
                    <button
                      type="button"
                      aria-label={`Remove tag ${tag}`}
                      className="opacity-70 hover:opacity-100"
                      onClick={() => removeTag({ questionIndex, tag })}
                    >
                      <XMarkIcon className="size-4"/>
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <Input
                type="text"
                value={tagDraft}
                maxLength={30}
                placeholder="e.g. geography"
                className="max-w-56"
                onChange={(ev) => setTagDraft(ev.target.value)}
                onKeyDown={(ev) => {
                  if (ev.key === 'Enter') {
                    ev.preventDefault();
                    addTag({ questionIndex, value: tagDraft });
                    setTagDraft('');
                  }
                }}
              />
              <Button
                variant="outline"
                disabled={!tagDraft.trim()}
                onClick={() => { addTag({ questionIndex, value: tagDraft }); setTagDraft(''); }}
              >
                Add tag
              </Button>
            </div>
          </div>
        </div>
        <div>
          {
            currentQuestion.possibleAnswers.map(({ answerMessage, isCorrect }, index) => (
              <div key={`answer-${index}`} className="flex flex-col gap-1 py-2">
                <div className="flex flex-row justify-between items-center gap-2">
                  <div className="grow">
                    <div className="flex flex-col justify-between required">
                      <div className="flex items-end gap-4">
                        <label title='Mark correct answer'>
                          {isCorrect ? <StarIconSolid className={starIconStyling}/> : <StarIconOutline className={starIconStyling}/>}
                          <input
                            type='radio'
                            checked={isCorrect}
                            className='hidden'
                            onChange={(ev) => onCheckCorrectAnswer(ev, index)}
                          />
                        </label>
                        <label className="flex flex-col w-full justify-between gap-2 items-start">
                          Answer {index + 1}
                          <Input
                            type="text"
                            value={answerMessage}
                            required
                            maxLength={500}
                            onChange={(ev) => changeAnswer(ev, index)}
                          />
                        </label>
                        <Button
                          variant="destructive"
                          size="icon"
                          className="shrink-0"
                          aria-label={`Delete answer ${index + 1}`}
                          onClick={() => deleteAnswer({ questionIndex, answerIndex: index })}
                        >
                          <TrashIcon className="size-5"/>
                        </Button>
                      </div>
                      {validation && validation.possibleAnswers[index] &&
                        <div className="error-message">Please fill in all the answer options.</div>}
                    </div>
                  </div>

                </div>
              </div>
            ))}
          {validation?.hasNoCorrectAnswers && <div className="error-message">Please select the correct answer.</div>}

          {currentQuestion.possibleAnswers.length < 4 &&
            <Button className="mt-4" onClick={() => addAnswer({ questionIndex })}>Add Answer</Button>}
        </div>
      </div>
    </div>
  );
};

export default QuestionConfiguration;
