'use client';

import classNames from 'classnames';
const getAlpha = (index) => String.fromCharCode('A'.charCodeAt(0) + index);

const Question = ({ index, isAnswerSelected, children, showCorrectAnswer, isCorrect, isAnyAnswerSelected, onClick }) => {
  const classes = classNames(
    'flex flex-row justify-start gap-4 p-4 text-3xl border-2 mt-6 cursor-pointer',
    {
      'cursor-not-allowed': isAnyAnswerSelected,
      'bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-700': isAnswerSelected,
      'bg-gradient-to-r from-teal-600 via-lime-600 to-green-900': showCorrectAnswer && isCorrect,
      'bg-gradient-to-r from-red-500 via-red-700 to-pink-800': showCorrectAnswer && !isCorrect && isAnswerSelected,
    });

  return (
    <li className={classes} onClick={!isAnyAnswerSelected ? onClick : () => {}}>
      <div className="capitalize">
        {getAlpha(index)}.
      </div>
      <div className="">
       {children}
     </div>
   </li>
 )
};

export default Question;
