export const validateNewQuiz = ({ quizName, fullQuiz }) => {
  const isQuizNameValid = !quizName;
  let isAllValid = !quizName;

  const fullQuizValidation = [];

  fullQuiz.forEach((question, questionIndex) => {
    fullQuizValidation.push({ possibleAnswers: [] });
    const hasNoCorrectAnswers = !question.possibleAnswers.find(({ isCorrect }) => isCorrect);
    fullQuizValidation[questionIndex].hasNoCorectAnswers = hasNoCorrectAnswers;
    // fullQuizValidation[questionIndex].description = !!question.description;
    if (hasNoCorrectAnswers || !!question.description) {
      isAllValid = false;
    }
    question.possibleAnswers.forEach(({ answerLabel }, answerIndex) => {
      fullQuizValidation[questionIndex].possibleAnswers[answerIndex] = !answerLabel;
      if (!answerLabel) isAllValid = false;
    });
  });
  return {
    validations: {
      isAllValid,
      isQuizNameValid,
      fullQuizValidation,
    }
  };
}
