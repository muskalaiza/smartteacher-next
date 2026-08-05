import assert from "node:assert/strict";

import {
  buildTeacherAnswerKey,
  TEACHER_ANSWER_KEY_VERSION,
} from "../lib/generation/buildTeacherAnswerKey.js";
import { buildTaskPlan } from "../lib/generation/buildTaskPlan.js";
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
  },
  {
    number: 7,
    taskSubtype: "open_explain",
    expectedAnswer: "Pętla wykonuje pięć iteracji.",
  },
];

const answerKey = buildTeacherAnswerKey(TASKS);

assert.equal(
  answerKey.version,
  "teacher_answer_key_v2"
);
assert.equal(
  TEACHER_ANSWER_KEY_VERSION,
  "teacher_answer_key_v2"
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
assert.equal(answerKey.tasks[5].explanation, null);
assert.equal(answerKey.tasks[6].explanation, null);

const legacyOpenTaskKey = buildTeacherAnswerKey([
  {
    ...TASKS[5],
    answerExplanation: "Historyczne wyjaśnienie.",
  },
]);

assert.equal(
  legacyOpenTaskKey.tasks[0].explanation,
  "Historyczne wyjaśnienie."
);

const EXPECTED_TOTAL_POINTS = [
  {
    materialType: "karta pracy",
    totals: {
      5: 11,
      6: 14,
      7: 17,
    },
  },
  {
    materialType: "kartkówka",
    totals: {
      5: 9,
      6: 14,
      7: 19,
    },
  },
  {
    materialType: "sprawdzian",
    totals: {
      5: 9,
      6: 14,
      7: 19,
    },
  },
];

for (const {
  materialType,
  totals,
} of EXPECTED_TOTAL_POINTS) {
  for (const taskCount of [5, 6, 7]) {
    const taskPlan = buildTaskPlan({
      materialType,
      taskCount,
    });

    assert.equal(
      taskPlan.length,
      taskCount,
      `${materialType}: plan musi zawierać ${taskCount} zadań.`
    );

    assert.equal(
      calculateTotalPoints(taskPlan),
      totals[taskCount],
      `${materialType}, ${taskCount} zadań: nieprawidłowa suma punktów.`
    );
  }
}

assert.throws(
  () => getTaskPoints({ taskSubtype: "unknown" }),
  /Nieobsługiwany typ zadania/
);

console.log(
  "OK: wspólny klucz, punktacja siedmiu typów i sumy dla 3 materiałów × 5/6/7 są poprawne."
);
