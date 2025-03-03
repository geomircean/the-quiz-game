'use client';

import { Button } from '@/components/index';
import { useState } from 'react';
import { useQuizConfigStore } from '@/stores/quiz-configuration-store';
import { TrashIcon } from '@heroicons/react/20/solid';

const QuestionConfiguration = ({ questionIndex, validation }) => {
  const { fullQuiz, changeQuestionDescription, addAnswer, deleteAnswer, updateAnswer, updateIsCorrect } = useQuizConfigStore();
  const currentQuestion = fullQuiz[questionIndex];
  console.log(validation)

  const changeAnswer = (ev, index) => {
    const { value } = ev.currentTarget;
    updateAnswer({ questionIndex, answerIndex: index, value });
  };

  const onCheckCorrectAnswer = (ev, index) => {
    const { checked } = ev.currentTarget;
    const isCorrectAlreadyChecked = currentQuestion.answers.find(({ isCorrect }) => isCorrect);

    if (checked && isCorrectAlreadyChecked) {
      alert('There is already another answer marked as correct, please uncheck the other answer marked as correct.');
      return;
    }
    updateIsCorrect({ questionIndex, answerIndex: index, value: checked })
  };

  return (
    <div className='flex flex-col py-4 border-b-2 border-amber-100'>
      <div>
        <div>
          <label className='flex flex-col justify-between gap-4 w-full'>
            Question Description
            <input
              type='text'
              value={currentQuestion.description}
              className='text-black p-1'
              onChange={(e) => changeQuestionDescription({ questionIndex, value: e.target.value })}
            />
          </label>
          {/*{validation.description && <div>Please fill in the answer.</div>}*/}
        </div>
        <div>
          {
            currentQuestion.answers.map(({ answerLabel, isCorrect }, index) => (
              <div key={`answer-${index}`} className='flex flex-col gap-1 py-2 border-b-2 border-gray-500'>
                <div className='flex flex-row justify-between items-center gap-2'>
                  <div className='grow'>
                    <div className='flex flex-col justify-between required'>
                      <label className='flex flex-col w-full justify-between'>
                        Answer {index + 1}
                        <input
                          type='text'
                          value={answerLabel}
                          className='text-black p-1'
                          required
                          onChange={(ev) => changeAnswer(ev, index)}
                        />
                      </label>
                      {validation && validation.answers[index] && <div className='error-message'>Please fill in the answer.</div>}
                    </div>
                    <div className='mt-1'>
                      <label className='flex gap-3'>
                        <span>Is this the correct answer?</span>
                        <input
                          type='checkbox'
                          checked={isCorrect}
                          onChange={(ev) => onCheckCorrectAnswer(ev, index)}/>
                      </label>
                    </div>
                  </div>

                  <div className='py-2'>
                    <Button className='border-2 border-foreground rounded-3xl'
                            onClick={() => deleteAnswer({ questionIndex, answerIndex: index })}>
                      <TrashIcon className='size-8 p-1.5 text-red-600'/>
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          {validation?.hasNoCorectAnswers && <div className='error-message'>Please select the correct answer.</div>}

          {currentQuestion.answers.length < 4 &&
            <Button className='border-2 border-foreground hover:bg-cyan-900 p-3 mt-4' onClick={() => addAnswer({ questionIndex })}>Add Answer</Button>}
        </div>
      </div>
    </div>
  );
};

export default QuestionConfiguration;
