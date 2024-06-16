'use client';

import { Button } from '@/components/index';
import { useState } from 'react';
import question from '@/components/question';

const answerStruct = { answerLabel: '', isCorrect: false };
const questionStruct = {
  question: 'What is your name?',
  answers: [{ ...answerStruct }],
};

const QuestionConfiguration = () => {
  const [newQuestion, setNewQuestion] = useState(questionStruct);
  const addAnswer = () => setNewQuestion({ ...newQuestion, answers: [...newQuestion.answers, { ...answerStruct }] });
  const changeQuestionDesc = (ev) => setNewQuestion({ ...newQuestion, question: ev.currentTarget.value });
  const changeAnswer = (ev, index) => setNewQuestion(() => {
    const { answers } = newQuestion;
    answers[index] = ev.currentTarget.value;
    return { ...newQuestion, answers };
  });
  const onCheckCorrectAnswer = (ev, index) => {
    const { checked } = ev.currentTarget;
    const isCorrectAlreadyChecked = newQuestion.answers.find(({ isCorrect }) => isCorrect);

    if (checked && isCorrectAlreadyChecked) {
      alert('There is already another answer marked as correct, to mark this one as correct, please uncheck this answer');
      return;
    }
    const { answers } = newQuestion;
    answers[index].isCorrect = checked;
    setNewQuestion({ ...newQuestion, answers });
  };

  return (
    <div className='flex flex-col gap-4 p-4'>
      <div>
        <div className='flex flex-col justify-between gap-4 w-full'>
          <label>Question Description</label>
          <input
            type='text'
            value={newQuestion.question}
            className='text-black p-1'
            onChange={changeQuestionDesc}/>
        </div>
        <div>
          {
            newQuestion.answers.map(({ answerLabel, isCorrect }, index) => (
              <div key={`answer-${index}`} className='flex flex-col gap-1 py-4'>
                <label className='flex flex-col gap-4 w-full justify-between'>
                  Answer {index + 1}
                  <input
                    type='text'
                    value={answerLabel}
                    className='text-black p-1'
                    onChange={(ev, index) => changeAnswer(ev, index)}/>
                </label>
                <label className='flex justify-between'>
                  Is this the correct answer?
                  <input type='checkbox' checked={isCorrect} onChange={(ev) => onCheckCorrectAnswer(ev, index)}/>
                </label>
              </div>
            ))}
          <Button onClick={addAnswer}>Add Answer</Button>
        </div>
      </div>
    </div>
  );
};

export default QuestionConfiguration;
