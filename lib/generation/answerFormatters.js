/* =========================
  MAPOWANIE PODTYPÓW ZADAŃ
========================= */

// Słownik jest szybszy i czystszy niż instrukcja switch
/// generowanie odpowiedzi dla nauczyciela z danych JSON

export const SUBTYPE_FORMATTERS = {
  closed_single: (task) =>
    task?.correctAnswer && task?.answerExplanation
      ? `${task.correctAnswer} - ${task.answerExplanation}`
      : null,

  closed_tf: (task) => {
    if (typeof task?.correctAnswer === "boolean" && task?.answerExplanation) {
      const tfAnswer = task.correctAnswer ? "Prawda" : "Fałsz";
      return `${tfAnswer} - ${task.answerExplanation}`;
    }

    return null;
  },

  match_pair: (task) => {
    if (
      Array.isArray(task?.correctPairs) &&
      task.correctPairs.length > 0 &&
      task?.answerExplanation
    ) {
      const pairsAnswer = task.correctPairs
        .map((pair) => `${pair.leftId}-${pair.rightId}`)
        .join(", ");

      return `${pairsAnswer} - ${task.answerExplanation}`;
    }

    return null;
  },

  match_fill: (task) =>
    task?.correctAnswer && task?.answerExplanation
      ? `${task.correctAnswer} - ${task.answerExplanation}`
      : null,

  error_find: (task) =>
    task?.correctedCode && task?.errorExplanation
      ? `Poprawiony kod:\n${task.correctedCode}\n\nWyjaśnienie: ${task.errorExplanation}`
      : null,

  open_code: (task) =>
    task?.expectedCode && task?.answerExplanation
      ? `Przykładowe rozwiązanie:\n${task.expectedCode}\n\nWyjaśnienie: ${task.answerExplanation}`
      : null,

  open_explain: (task) =>
    task?.expectedAnswer && task?.answerExplanation
      ? `Przykładowa odpowiedź:\n${task.expectedAnswer}\n\nWyjaśnienie: ${task.answerExplanation}`
      : null
};