'use client';

import { Button, Input } from '@/components/base';
import { useQuizConfigStore } from '@/stores/quiz-configuration-store';
import { TrashIcon } from '@heroicons/react/20/solid';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
import { StarIcon as StarIconOutline } from '@heroicons/react/24/outline';


const QuestionConfiguration = ({ questionIndex, validation }) => {
  const {
    fullQuiz,
    changeQuestionDescription,
    changeQuestionCategory,
    addAnswer,
    deleteAnswer,
    updateAnswer,
    updateIsCorrect
  } = useQuizConfigStore();
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
              value={currentQuestion.description}
              // className='text-black p-1'
              onChange={(e) => changeQuestionDescription({ questionIndex, value: e.target.value })}
            />
          </label>
          <label className="flex flex-col justify-evenly w-full items-start gap-2 py-2">
            Category
            <Input
              type="text"
              value={currentQuestion.category}
              // className='text-black p-1'
              onChange={(e) => changeQuestionCategory({ questionIndex, value: e.target.value })}
            />
          </label>
          {/*{validation.description && <div>Please fill in the answer.</div>}*/}
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
                            onChange={(ev) => changeAnswer(ev, index)}
                          />
                        </label>
                        <Button
                          className="border-2 border-foreground rounded-3xl"
                          onClick={() => deleteAnswer({ questionIndex, answerIndex: index })}
                        >
                          <TrashIcon className="size-8 p-1.5 text-red-600"/>
                        </Button>
                      </div>
                      {validation && validation.possibleAnswers[index] &&
                        <div className="error-message">Please fill in all the answer options.</div>}
                    </div>
                  </div>

                </div>
              </div>
            ))}
          {validation?.hasNoCorectAnswers && <div className="error-message">Please select the correct answer.</div>}

          {currentQuestion.possibleAnswers.length < 4 &&
            <Button className="border-2 border-foreground hover:bg-cyan-900 p-3 mt-4"
                    onClick={() => addAnswer({ questionIndex })}>Add Answer</Button>}
        </div>
      </div>
    </div>
  );
};

export default QuestionConfiguration;
