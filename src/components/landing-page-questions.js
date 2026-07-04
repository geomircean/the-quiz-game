'use client';

import { motion } from 'framer-motion';
import Loading from '@/components/loading';
import { useQuestions } from '@/hooks/useQuestions';

// Shows the signed-in Quizmaster's library as board-style tiles. Anonymous
// visitors see nothing here — the library is private; players join games
// from /play instead (P3).
const LandingPageQuestions = ({ goToQuestion }) => {
  const { questions, isLoading } = useQuestions();

  if (isLoading) {
    return <Loading/>;
  }

  if (!questions?.length) {
    return <div>No questions found.</div>;
  }

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {questions.map(({ tileName, id }) => (
        <div key={`cards-${id}`} onClick={() => goToQuestion(id)}>
          <motion.div
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="flex h-32 cursor-pointer flex-col items-center justify-center rounded-xl bg-purple-800/40 p-6 shadow-md transition-all hover:bg-purple-700/60 backdrop-blur-sm"
          >
            <h2 className="text-2xl font-semibold text-purple-100">{tileName}</h2>
          </motion.div>
        </div>
      ))}
    </div>
  );
};

export default LandingPageQuestions;
