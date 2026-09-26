/**
 * Finds the index of the first unanswered/unevaluated question in a practice session.
 * Used to resume practice sessions directly at the first question needing attention.
 *
 * @param {Array} [answers=[]] Array of question answer slots with potential evaluations.
 * @returns {number} The 0-based index of the first unanswered question, or 0 if none found.
 */
export const getInitialActiveIndex = (answers = []) => {
  const firstUnansweredIndex = (answers || []).findIndex(
    (answer) => !answer || !answer.evaluation
  )
  return firstUnansweredIndex >= 0 ? firstUnansweredIndex : 0
}
