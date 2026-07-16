import assert from "node:assert/strict"

import {
  buildSafeTaskPlan,
} from "../lib/generation/buildSafeTaskPlan.js"

const TASK_SUBTYPES = [
  "closed_single",
  "closed_tf",
  "match_fill",
  "match_pair",
  "error_find",
  "open_code",
  "open_explain",
]

function createAssessments(
  supportOverrides = {}
) {
  return Object.fromEntries(
    TASK_SUBTYPES.map((taskSubtype) => {
      const isSupported =
        supportOverrides[taskSubtype] ??
        true

      return [
        taskSubtype,
        {
          isSupported,

          evidenceChunkIds:
            isSupported
              ? ["chunk-test-1"]
              : [],

          evidenceSummary:
            isSupported
              ? "Źródło zawiera wystarczające dane."
              : "Źródło nie zawiera wystarczających danych.",

          missingEvidence:
            isSupported
              ? []
              : [
                  "Brak danych potrzebnych do przygotowania zadania.",
                ],

          constraints: [],
        },
      ]
    })
  )
}

function testReadyPlan() {
  const assessments =
    createAssessments()

  const assessmentsBefore =
    JSON.stringify(assessments)

  const result = buildSafeTaskPlan({
    assessments,
    materialType: "kartkówka",
    taskCount: "5",
  })

  assert.deepEqual(result, {
    status: "ready",

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

    unsupportedTaskSubtypes: [],
  })

  assert.equal(
    JSON.stringify(assessments),
    assessmentsBefore,
    "buildSafeTaskPlan zmodyfikował wejściowe assessments."
  )

  console.log(
    "1. Plan ready dla kartkówki i taskCount=\"5\": OK"
  )
}

function testInsufficientCoverage() {
  const assessments =
    createAssessments({
      closed_tf: false,
    })

  const result = buildSafeTaskPlan({
    assessments,
    materialType: "kartkówka",
    taskCount: 5,
  })

  assert.deepEqual(result, {
    status:
      "insufficient_coverage",

    taskPlan: [],

    unsupportedTaskSubtypes: [
      "closed_tf",
    ],
  })

  console.log(
    "2. Odrzucenie nieobsługiwanego typu: OK"
  )
}

function testDuplicateUnsupportedType() {
  const assessments =
    createAssessments({
      open_code: false,
    })

  const result = buildSafeTaskPlan({
    assessments,
    materialType: "kartkówka",
    taskCount: 7,
  })

  assert.deepEqual(result, {
    status:
      "insufficient_coverage",

    taskPlan: [],

    unsupportedTaskSubtypes: [
      "open_code",
    ],
  })

  console.log(
    "3. Brak duplikatów na liście nieobsługiwanych typów: OK"
  )
}

function main() {
  testReadyPlan()
  testInsufficientCoverage()
  testDuplicateUnsupportedType()

  console.log(
    "\nTEST BUILD SAFE TASK PLAN: OK"
  )
}

try {
  main()
} catch (error) {
  console.error(
    "\nTEST BUILD SAFE TASK PLAN: BŁĄD"
  )

  console.error(
    error instanceof Error
      ? error.message
      : String(error)
  )

  process.exitCode = 1
}

/*
uruchomienie testu
node scripts/testBuildSafeTaskPlan.mjs
*/