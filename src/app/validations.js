const hasContent = text => typeof text === 'string' && text && text.length > 0 && text.trim().length > 0;

export const validateNewQuiz = ({ quizName, fullQuiz }) => {
  // const isQuizNameValid = !quizName;
  let isAllValid = !quizName;

  const fullQuizValidation = [];

  fullQuiz.forEach((question, questionIndex) => {
    fullQuizValidation.push({ possibleAnswers: [] });
    const { isValid, ...rest } = validateQuestion(question);
    fullQuizValidation[questionIndex] = { ...rest };
    if (!isValid) { isAllValid = false; }
  });

  return {
    validations: {
      isAllValid,
      // isQuizNameValid,
      fullQuizValidation,
    }
  };
}

export const validateQuestion = (question) => {
  const description = !hasContent(question.description);
  const category = !hasContent(question.category);
  const hasNoCorrectAnswers = !question.possibleAnswers.find(({ isCorrect }) => isCorrect);
  let isValid = true;

  if (hasNoCorrectAnswers || description || category) {
    isValid = false;
  }
  const possibleAnswers = [];

  question.possibleAnswers.forEach(({ answerMessage }, answerIndex) => {
    possibleAnswers[answerIndex] = !answerMessage;
    if (!answerMessage) isValid = false;
  });

  return { hasNoCorrectAnswers, possibleAnswers, description, category, isValid, };
}
