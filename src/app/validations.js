export const validateNewQuiz = ({ quizName, fullQuiz }) => {
  const isQuizNameValid = !quizName;
  let isAllValid = !quizName;

  const fullQuizValidation = [];

  fullQuiz.forEach((question, questionIndex) => {
    fullQuizValidation.push({ answers: [] });
    const hasNoCorrectAnswers = !question.answers.find(({ isCorrect }) => isCorrect);
    fullQuizValidation[questionIndex].hasNoCorectAnswers = hasNoCorrectAnswers;
    // fullQuizValidation[questionIndex].description = !!question.description;
    if (hasNoCorrectAnswers || !!question.description) {
      isAllValid = false;
    }
    question.answers.forEach(({ answerLabel }, answerIndex) => {
      fullQuizValidation[questionIndex].answers[answerIndex] = !answerLabel;
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
