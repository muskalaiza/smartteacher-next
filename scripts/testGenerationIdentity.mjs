import assert from "node:assert/strict"

import {
  buildGenerationIdentity,
} from "../lib/generation/buildGenerationIdentity.js"

const baseArguments = {
  sourceFingerprint:
    "a".repeat(64),

  lessonTopicId:
    "lesson-topic-1",

  topicTitle:
    "Zmienne w C++",

  materialType:
    "kartkówka",

  taskCount:
    5,

  profiles: [
    "Standard",
    "ADHD",
  ],

  taskPlan: [
    {
      number: 1,
      taskSubtype:
        "closed_single",
    },
    {
      number: 2,
      taskSubtype:
        "closed_tf",
    },
    {
      number: 3,
      taskSubtype:
        "match_pair",
    },
    {
      number: 4,
      taskSubtype:
        "match_fill",
    },
    {
      number: 5,
      taskSubtype:
        "error_find",
    },
  ],

  generatorVersion:
    "generator_test_v1",

  contentSchemaVersion:
    "content_schema_test_v1",

  model:
    "test-model",
}

const firstIdentity =
  buildGenerationIdentity(
    baseArguments
  )

const repeatedIdentity =
  buildGenerationIdentity(
    baseArguments
  )

assert.equal(
  firstIdentity
    .generationFingerprint,
  repeatedIdentity
    .generationFingerprint,
  "Identyczne dane muszą dawać identyczny fingerprint."
)

assert.match(
  firstIdentity
    .generationFingerprint,
  /^[0-9a-f]{64}$/,
  "Fingerprint musi być SHA-256 zapisanym jako hex."
)

const reorderedProfilesIdentity =
  buildGenerationIdentity({
    ...baseArguments,

    profiles: [
      "ADHD",
      "Standard",
    ],
  })

assert.equal(
  firstIdentity
    .generationFingerprint,
  reorderedProfilesIdentity
    .generationFingerprint,
  "Kolejność wyboru tych samych profili nie może zmieniać fingerprintu."
)

assert.deepEqual(
  firstIdentity
    .generationManifest
    .profiles,
  [
    "Standard",
    "ADHD",
  ],
  "Profile muszą mieć kanoniczną kolejność."
)

const changedSourceIdentity =
  buildGenerationIdentity({
    ...baseArguments,

    sourceFingerprint:
      "b".repeat(64),
  })

assert.notEqual(
  firstIdentity
    .generationFingerprint,
  changedSourceIdentity
    .generationFingerprint,
  "Zmiana źródła musi powodować cache MISS."
)

const changedTaskPlanIdentity =
  buildGenerationIdentity({
    ...baseArguments,

    taskPlan:
      baseArguments
        .taskPlan
        .map(
          (task, index) => ({
            ...task,

            taskSubtype:
              index === 4
                ? "open_explain"
                : task.taskSubtype,
          })
        ),
  })

assert.notEqual(
  firstIdentity
    .generationFingerprint,
  changedTaskPlanIdentity
    .generationFingerprint,
  "Zmiana taskPlan musi powodować cache MISS."
)

const changedModelIdentity =
  buildGenerationIdentity({
    ...baseArguments,

    model:
      "different-test-model",
  })

assert.notEqual(
  firstIdentity
    .generationFingerprint,
  changedModelIdentity
    .generationFingerprint,
  "Zmiana modelu musi powodować cache MISS."
)

console.log(
  "Generation identity tests OK"
)
/*
uruchomienie testu
node scripts/testGenerationIdentity.mjs

*/