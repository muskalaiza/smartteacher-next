import assert from "node:assert/strict";

import {
  buildTeacherAnswerKey,
  TEACHER_ANSWER_KEY_VERSION,
} from "../lib/generation/buildTeacherAnswerKey.js";
import {
  calculateTotalPoints,
  getTaskPoints,
} from "../lib/generation/scoring.js";

const TASKS = [
  {
    number: 1,
    taskSubtype: "closed_single",
    correctAnswer: "B",
    answerExplanation: "Odpowiedź B jest poprawna.",
  },
  {
    number: 2,
    taskSubtype: "closed_tf",
    correctAnswer: false,
    answerExplanation: "Zdanie jest fałszywe.",
  },
  {
    number: 3,
    taskSubtype: "match_fill",
    correctAnswers: ["pozycyjnym", "prawej"],
    answerExplanation: "Odpowiedzi uzupełniają obie luki.",
  },
  {
    number: 4,
    taskSubtype: "match_pair",
    correctPairs: [
      { leftId: "2", rightId: "B" },
      { leftId: "1", rightId: "A" },
      { leftId: "3", rightId: "C" },
    ],
    answerExplanation: "Każdy element ma jedną parę.",
  },
  {
    number: 5,
    taskSubtype: "error_find",
    expectedCode: "for (int i = 0; i < 5; i++) {}",
    answerExplanation: "Licznik musi się zwiększać.",
  },
  {
    number: 6,
    taskSubtype: "open_code",
    expectedCode: "print('ok')",
    answerExplanation: "Kod spełnia wymaganie.",
  },
  {
    number: 7,
    taskSubtype: "open_explain",
    expectedAnswer: "Pętla wykonuje pięć iteracji.",
    answerExplanation: "Zakres zawiera pięć wartości.",
  },
];

function task(taskSubtype, number) {
  return {
    number,
    taskSubtype,
  };
}

const answerKey = buildTeacherAnswerKey(TASKS);

assert.equal(
  answerKey.version,
  TEACHER_ANSWER_KEY_VERSION
);
assert.equal(answerKey.tasks.length, 7);
assert.equal(answerKey.totalPoints, 15);
assert.deepEqual(
  answerKey.tasks[3].answer.items,
  ["1 — A", "2 — B", "3 — C"]
);
assert.equal(
  answerKey.tasks[1].answer.value,
  "Fałsz"
);
assert.equal(
  answerKey.tasks[4].answer.kind,
  "code"
);

assert.equal(
  calculateTotalPoints([
    task("closed_single", 1),
    task("closed_tf", 2),
    task("match_pair", 3),
    task("match_fill", 4),
    task("error_find", 5),
  ]),
  9
);

assert.equal(
  calculateTotalPoints([
    task("error_find", 1),
    task("closed_single", 2),
    task("match_pair", 3),
    task("match_fill", 4),
    task("open_explain", 5),
    task("open_code", 6),
  ]),
  14
);

assert.equal(
  calculateTotalPoints([
    task("open_explain", 1),
    task("open_code", 2),
    task("error_find", 3),
    task("match_fill", 4),
    task("match_pair", 5),
    task("open_code", 6),
    task("open_explain", 7),
  ]),
  19
);

assert.throws(
  () => getTaskPoints({ taskSubtype: "unknown" }),
  /Nieobsługiwany typ zadania/
);

console.log(
  "OK: wspólny klucz nauczyciela, punktacja siedmiu typów i sumy 5/6/7 są poprawne."
);
