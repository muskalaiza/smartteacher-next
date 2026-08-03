import assert from "node:assert/strict";

import {
  buildMaterialPrompt,
} from "../lib/generation/buildMaterialPrompt.js";

import {
  buildTaskPlan,
} from "../lib/generation/buildTaskPlan.js";

const sourceContext = `Pętla for wykonuje instrukcje określoną liczbę razy.
for (int i = 0; i < 5; i++) {
  cout << i;
}`;

function buildPrompt({
  materialType,
  shouldGenerateAdhdSupport = false,
  shouldGenerateGlossary = false,
}) {
  return buildMaterialPrompt({
    topicTitle: "Pętla for",
    materialType,
    taskPlan: buildTaskPlan({
      materialType,
      taskCount: 5,
    }),
    sourceContext,
    shouldGenerateAdhdSupport,
    shouldGenerateGlossary,
  });
}

const worksheetPrompt = buildPrompt({
  materialType: "karta pracy",
  shouldGenerateAdhdSupport: true,
  shouldGenerateGlossary: true,
});

assert.match(
  worksheetPrompt,
  /WSTĘP I MINI-ŚCIĄGAWKA KARTY PRACY/
);
assert.match(
  worksheetPrompt,
  /SŁOWNICZEK DLA UCZNIA OBCOJĘZYCZNEGO/
);
assert.match(
  worksheetPrompt,
  /WSPARCIE MERYTORYCZNE ADHD/
);
assert.doesNotMatch(
  worksheetPrompt,
  /LearningUnits/
);
assert.doesNotMatch(
  worksheetPrompt,
  /Pole context|Kontekst do analizy/
);

const worksheetWithoutOptionalProfiles = buildPrompt({
  materialType: "karta pracy",
});

assert.match(
  worksheetWithoutOptionalProfiles,
  /WSTĘP I MINI-ŚCIĄGAWKA KARTY PRACY/
);
assert.doesNotMatch(
  worksheetWithoutOptionalProfiles,
  /SŁOWNICZEK DLA UCZNIA OBCOJĘZYCZNEGO/
);
assert.doesNotMatch(
  worksheetWithoutOptionalProfiles,
  /WSPARCIE MERYTORYCZNE ADHD/
);

const quizPrompt = buildPrompt({
  materialType: "kartkówka",
});

assert.doesNotMatch(
  quizPrompt,
  /WSTĘP I MINI-ŚCIĄGAWKA KARTY PRACY/
);
assert.doesNotMatch(
  quizPrompt,
  /SŁOWNICZEK DLA UCZNIA OBCOJĘZYCZNEGO/
);
assert.doesNotMatch(
  quizPrompt,
  /WSPARCIE MERYTORYCZNE ADHD/
);

console.log("TEST BUILD MATERIAL PROMPT: OK");
