const hasContent = text => typeof text === 'string' && text && text.length > 0 && text.trim().length > 0;

export const validateNewQuiz = ({ quizName, fullQuiz }) => {
  const isQuizNameValid = hasContent(quizName);
  let isAllValid = isQuizNameValid;

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
      isQuizNameValid,
      fullQuizValidation,
    }
  };
}

export const validateQuestion = (question) => {
  const questionText = !hasContent(question.questionText);
  const tileName = !hasContent(question.tileName);
  const hasNoCorrectAnswers = !question.possibleAnswers.find(({ isCorrect }) => isCorrect);
  let isValid = true;

  if (hasNoCorrectAnswers || questionText || tileName) {
    isValid = false;
  }
  const possibleAnswers = [];

  question.possibleAnswers.forEach(({ answerMessage }, answerIndex) => {
    possibleAnswers[answerIndex] = !answerMessage;
    if (!answerMessage) isValid = false;
  });

  return { hasNoCorrectAnswers, possibleAnswers, questionText, tileName, isValid, };
}
