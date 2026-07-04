const hasContent = text => typeof text === 'string' && text && text.length > 0 && text.trim().length > 0;

// The quiz builder references library questions by id — it only needs a
// name and at least one picked question (teams/answer mode have defaults).
// Bounds mirror firestore.rules so failures surface as friendly messages
// instead of a raw permission error.
export const validateQuizConfig = ({ quizName, questionIds }) => {
  const quizNameMissing = !hasContent(quizName);
  const quizNameTooLong = typeof quizName === 'string' && quizName.length > 120;
  const noQuestions = !questionIds || questionIds.length === 0;
  const tooManyQuestions = !!questionIds && questionIds.length > 50;
  return {
    quizNameMissing,
    quizNameTooLong,
    noQuestions,
    tooManyQuestions,
    isValid: !quizNameMissing && !quizNameTooLong && !noQuestions && !tooManyQuestions,
  };
};

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
