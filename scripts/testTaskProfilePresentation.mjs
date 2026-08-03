import assert from "node:assert/strict";

import {
  getTaskProfilePresentation,
} from "../lib/generation/getTaskProfilePresentation.js";

const TASK_SUBTYPES = [
  "closed_single",
  "closed_tf",
  "match_fill",
  "match_pair",
  "error_find",
  "open_code",
  "open_explain",
];

for (const taskSubtype of TASK_SUBTYPES) {
  const presentation = getTaskProfilePresentation({
    task: {
      number: 1,
      taskSubtype,
    },
    profileValue: "ASD",
    materialTypeValue: "karta pracy",
  });

  assert.ok(presentation.objective);
  assert.ok(presentation.answerHint);
  assert.equal(presentation.plan, null);
}

const asdOpenExplainPresentation =
  getTaskProfilePresentation({
    task: {
      number: 5,
      taskSubtype: "open_explain",
    },
    profileValue: "ASD",
    materialTypeValue: "karta pracy",
  });

assert.equal(
  asdOpenExplainPresentation.objective,
  "Samodzielne wyjaśnienie wskazanego mechanizmu."
);

const adhdPresentation = getTaskProfilePresentation({
  task: {
    number: 1,
    taskSubtype: "closed_single",
    adhdSupport: {
      focus: "Mechanizm",
      steps: ["Krok 1", "Krok 2"],
      checkpoint: "Kontrola",
    },
  },
  profileValue: "ADHD",
  materialTypeValue: "karta pracy",
});

assert.deepEqual(adhdPresentation.plan, {
  focus: "Mechanizm",
  steps: ["Krok 1", "Krok 2"],
  checkpoint: "Kontrola",
});

const standardPresentation = getTaskProfilePresentation({
  task: {
    number: 1,
    taskSubtype: "closed_single",
  },
  profileValue: "Standard",
  materialTypeValue: "karta pracy",
});

assert.deepEqual(standardPresentation, {
  objective: null,
  plan: null,
  answerHint: null,
});

console.log("TEST TASK PROFILE PRESENTATION: OK");
