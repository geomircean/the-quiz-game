import { motion } from 'framer-motion';
import { Button } from '@/components';
import { CheckCircle, XCircle } from 'lucide-react';

const AnswerItem = ({ isAnswerSelected, children, showCorrectAnswer, isCorrect, onClick }) => {
  return (
    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
      <Button
        variant={isAnswerSelected ? 'default' : 'outline'}
        disabled={showCorrectAnswer}
        size="flexH"
        className={`relative w-full justify-start p-4 pr-10 text-left text-lg ${
          isAnswerSelected ? 'bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-700' : ''
        } ${
          showCorrectAnswer
          ? isCorrect
            ? 'bg-gradient-to-r from-teal-600 via-lime-600 to-green-900 text-white'
            : isAnswerSelected ? 'bg-gradient-to-r from-red-500 via-red-700 to-pink-800 text-white' : ''
          : ''
        }`}
        onClick={onClick}
      >
        {children}
        {showCorrectAnswer && (
          <span className="absolute right-4 top-1/2 -translate-y-1/2">
            {isCorrect ?
             <CheckCircle className="h-5 w-5 text-white"/> :
             <XCircle cldassName="h-5 w-5 text-white"/>
            }
          </span>
        )}
      </Button>
    </motion.div>
  );
};

export default AnswerItem;
