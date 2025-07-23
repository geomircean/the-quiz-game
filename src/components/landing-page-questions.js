import { useQuestionsStore } from '@/stores';
import { motion } from 'framer-motion';
import Loading from '@/components/loading';

const LandingPageQuestions = ({ goToQuestion }) => {
  const { isLoading, questions, visitedQuestions } = useQuestionsStore();

  if (!questions) {
    return <div>No questions found.</div>;
  }

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {questions.map(({ category, id, }, index) => (
        <div key={`cards-${index}`} onClick={() => goToQuestion(index)}>
          <motion.div
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="flex h-32 cursor-pointer flex-col items-center justify-center rounded-xl bg-purple-800/40 p-6 shadow-md transition-all hover:bg-purple-700/60 backdrop-blur-sm"
          >
            <h2 className="text-2xl font-semibold text-purple-100">{category}</h2>
          </motion.div>
        </div>
      ))}
    </div>
  );
};

export default LandingPageQuestions;
