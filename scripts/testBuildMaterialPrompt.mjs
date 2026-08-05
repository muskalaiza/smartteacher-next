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
  sourceTopics,
}) {
  return buildMaterialPrompt({
    topicTitle: "Pętla for",
    materialType,
    taskPlan: buildTaskPlan({
      materialType,
      taskCount: 5,
    }),
    sourceContext,
    sourceTopics,
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
assert.doesNotMatch(
  quizPrompt,
  /REGUŁY UŻYTYCH TYPÓW ZADAŃ/
);
assert.doesNotMatch(
  quizPrompt,
  /Dystraktory muszą być realistyczne/
);

const testSourceTopics = [
  {
    id: "00000000-0000-4000-8000-000000000001",
    title: "Pierwszy temat",
  },
  {
    id: "00000000-0000-4000-8000-000000000002",
    title: "Drugi temat",
  },
];

const testPrompt = buildPrompt({
  materialType: "sprawdzian",
  sourceTopics: testSourceTopics,
});

assert.match(
  testPrompt,
  /POKRYCIE TEMATÓW SPRAWDZIANU/
);
assert.match(
  testPrompt,
  /sourceTopicIds/
);
assert.match(
  testPrompt,
  /00000000-0000-4000-8000-000000000001 — Pierwszy temat/
);
assert.match(
  testPrompt,
  /każdy identyfikator tematu co najmniej raz/
);

assert.throws(
  () =>
    buildPrompt({
      materialType: "sprawdzian",
    }),
  /listy tematów źródłowych/
);

console.log("TEST BUILD MATERIAL PROMPT: OK");
