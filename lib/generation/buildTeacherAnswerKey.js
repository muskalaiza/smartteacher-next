import {
  calculateTotalPoints,
  getScoringCriteria,
  getTaskPoints,
} from "./scoring.js";

export const TEACHER_ANSWER_KEY_VERSION =
  "teacher_answer_key_v1";

function requireText(value, fieldName, taskNumber) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(
      `Zadanie ${taskNumber}: pole ${fieldName} wymagane przez klucz nauczyciela jest puste.`
    );
  }

  return value;
}

function requireArray(value, fieldName, taskNumber) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(
      `Zadanie ${taskNumber}: pole ${fieldName} wymagane przez klucz nauczyciela nie jest prawidłową tablicą.`
    );
  }

  return value;
}

function buildTaskAnswer(task) {
  const taskNumber = task.number;

  switch (task.taskSubtype) {
    case "closed_single":
      return {
        kind: "text",
        label: "Poprawna odpowiedź",
        value: requireText(
          task.correctAnswer,
          "correctAnswer",
          taskNumber
        ),
        explanationLabel: "Wyjaśnienie",
      };

    case "closed_tf":
      if (typeof task.correctAnswer !== "boolean") {
        throw new Error(
          `Zadanie ${taskNumber}: pole correctAnswer musi być wartością logiczną.`
        );
      }

      return {
        kind: "text",
        label: "Poprawna odpowiedź",
        value: task.correctAnswer
          ? "Prawda"
          : "Fałsz",
        explanationLabel: "Wyjaśnienie",
      };

    case "match_fill":
      return {
        kind: "list",
        label: "Wpisz w luki",
        items: requireArray(
          task.correctAnswers,
          "correctAnswers",
          taskNumber
        ).map((answer, index) =>
          `${index + 1}. ${requireText(
            answer,
            `correctAnswers[${index}]`,
            taskNumber
          )}`
        ),
        explanationLabel: "Wyjaśnienie",
      };

    case "match_pair":
      return {
        kind: "list",
        label: "Poprawne pary",
        items: requireArray(
          task.correctPairs,
          "correctPairs",
          taskNumber
        )
          .map((pair, index) => ({
            leftId: requireText(
              pair?.leftId,
              `correctPairs[${index}].leftId`,
              taskNumber
            ),
            rightId: requireText(
              pair?.rightId,
              `correctPairs[${index}].rightId`,
              taskNumber
            ),
          }))
          .sort((a, b) =>
            a.leftId.localeCompare(b.leftId)
          )
          .map(
            (pair) =>
              `${pair.leftId} — ${pair.rightId}`
          ),
        explanationLabel: "Wyjaśnienie",
      };

    case "error_find":
      return {
        kind: "code",
        label: "Poprawny kod",
        value: requireText(
          task.expectedCode,
          "expectedCode",
          taskNumber
        ),
        explanationLabel: "Wyjaśnienie błędu",
      };

    case "open_code":
      return {
        kind: "code",
        label: "Wzorcowe rozwiązanie",
        value: requireText(
          task.expectedCode,
          "expectedCode",
          taskNumber
        ),
        explanationLabel: "Wyjaśnienie",
      };

    case "open_explain":
      return {
        kind: "text",
        label: "Oczekiwana odpowiedź",
        value: requireText(
          task.expectedAnswer,
          "expectedAnswer",
          taskNumber
        ),
        explanationLabel:
          "Wyjaśnienie merytoryczne",
      };

    default:
      throw new Error(
        `Zadanie ${taskNumber}: brak obsługi typu ${
          task.taskSubtype || "[brak]"
        } w kluczu nauczyciela.`
      );
  }
}

export function buildTeacherAnswerKey(tasks) {
  if (!Array.isArray(tasks) || tasks.length === 0) {
    throw new Error(
      "Klucz nauczyciela wymaga niepustej listy zadań."
    );
  }

  const answerKeyTasks = tasks.map(
    (task, index) => {
      if (!task || typeof task !== "object") {
        throw new Error(
          `Zadanie na pozycji ${index + 1} nie jest prawidłowym obiektem.`
        );
      }

      if (!Number.isInteger(task.number)) {
        throw new Error(
          `Zadanie na pozycji ${index + 1} nie ma prawidłowego numeru.`
        );
      }

      const answer = buildTaskAnswer(task);

      return {
        number: task.number,
        taskSubtype: task.taskSubtype,
        points: getTaskPoints(task),
        answer,
        explanation: requireText(
          task.answerExplanation,
          "answerExplanation",
          task.number
        ),
        scoringCriteria:
          getScoringCriteria(task),
      };
    }
  );

  return {
    version: TEACHER_ANSWER_KEY_VERSION,
    tasks: answerKeyTasks,
    totalPoints: calculateTotalPoints(tasks),
  };
}
