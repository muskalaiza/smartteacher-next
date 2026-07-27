import assert from "node:assert/strict"

import {
  buildSafeTaskPlan,
} from "../lib/generation/buildSafeTaskPlan.js"

const EXPECTED_TASK_TYPES = {
  "karta pracy": {
    5: [
      "closed_single",
      "match_pair",
      "match_fill",
      "error_find",
      "open_explain",
    ],

    6: [
      "closed_single",
      "match_pair",
      "match_fill",
      "error_find",
      "open_explain",
      "open_code",
    ],

    7: [
      "closed_single",
      "match_pair",
      "match_fill",
      "error_find",
      "open_explain",
      "open_code",
      "open_explain",
    ],
  },

  kartkówka: {
    5: [
      "closed_single",
      "closed_tf",
      "match_pair",
      "match_fill",
      "error_find",
    ],

    6: [
      "error_find",
      "closed_single",
      "match_pair",
      "match_fill",
      "open_explain",
      "open_code",
    ],

    7: [
      "open_explain",
      "open_code",
      "error_find",
      "match_fill",
      "match_pair",
      "open_code",
      "open_explain",
    ],
  },

  sprawdzian: {
    5: [
      "closed_single",
      "closed_tf",
      "match_fill",
      "match_pair",
      "error_find",
    ],

    6: [
      "error_find",
      "closed_single",
      "match_pair",
      "match_fill",
      "open_explain",
      "open_code",
    ],

    7: [
      "error_find",
      "match_pair",
      "match_fill",
      "open_explain",
      "open_code",
      "open_explain",
      "open_code",
    ],
  },
}

function createExpectedResult(
  taskSubtypes
) {
  return {
    status: "ready",

    taskPlan:
      taskSubtypes.map(
        (
          taskSubtype,
          index
        ) => ({
          number:
            index + 1,

          taskSubtype,
        })
      ),

    unsupportedTaskSubtypes: [],
  }
}

function testAllTemplatePlans() {
  let testedPlanCount = 0

  for (
    const [
      materialType,
      plansByTaskCount,
    ] of Object.entries(
      EXPECTED_TASK_TYPES
    )
  ) {
    for (
      const [
        taskCount,
        expectedTaskTypes,
      ] of Object.entries(
        plansByTaskCount
      )
    ) {
      const normalizedTaskCount =
        Number(taskCount)

      const result =
        buildSafeTaskPlan({
          materialType,
          taskCount:
            normalizedTaskCount,
        })

      assert.deepEqual(
        result,
        createExpectedResult(
          expectedTaskTypes
        ),
        `Nieprawidłowy plan: ${materialType}, ${taskCount} zadań.`
      )

      testedPlanCount += 1

      console.log(
        `${testedPlanCount}. ${materialType}, ${taskCount} zadań: OK`
      )
    }
  }

  assert.equal(
    testedPlanCount,
    9,
    "Test powinien sprawdzić 9 kombinacji materiału i liczby zadań."
  )
}

function testInputNormalization() {
  const result =
    buildSafeTaskPlan({
      materialType:
        "  KARTKÓWKA  ",

      taskCount:
        "7",
    })

  assert.deepEqual(
    result,
    createExpectedResult(
      EXPECTED_TASK_TYPES
        .kartkówka[7]
    )
  )

  console.log(
    "10. Normalizacja materialType i taskCount=\"7\": OK"
  )
}

function testCoverageDoesNotAffectPlan() {
  const result =
    buildSafeTaskPlan({
      materialType:
        "kartkówka",

      taskCount:
        7,

      /*
        Stare dane coverage są przekazane
        celowo.

        buildSafeTaskPlan nie może już
        korzystać z assessments ani
        isSupported.
      */
      assessments: {
        open_code: {
          isSupported: false,
        },

        open_explain: {
          isSupported: false,
        },

        error_find: {
          isSupported: false,
        },
      },
    })

  assert.deepEqual(
    result,
    createExpectedResult(
      EXPECTED_TASK_TYPES
        .kartkówka[7]
    )
  )

  console.log(
    "11. assessments i isSupported nie wpływają na plan 7 zadań: OK"
  )
}

function testRepeatedTaskTypesArePreserved() {
  const result =
    buildSafeTaskPlan({
      materialType:
        "sprawdzian",

      taskCount:
        7,
    })

  const taskSubtypes =
    result.taskPlan.map(
      (task) =>
        task.taskSubtype
    )

  assert.equal(
    taskSubtypes.filter(
      (taskSubtype) =>
        taskSubtype ===
        "open_explain"
    ).length,
    2,
    "Plan sprawdzianu powinien zachować dwa zadania open_explain."
  )

  assert.equal(
    taskSubtypes.filter(
      (taskSubtype) =>
        taskSubtype ===
        "open_code"
    ).length,
    2,
    "Plan sprawdzianu powinien zachować dwa zadania open_code."
  )

  console.log(
    "12. Powtarzające się typy w planie 7 zadań: OK"
  )
}

function testInvalidTaskCount() {
  assert.throws(
    () =>
      buildSafeTaskPlan({
        materialType:
          "kartkówka",

        taskCount:
          4,
      }),
    /Dozwolone wartości: 5, 6, 7/
  )

  assert.throws(
    () =>
      buildSafeTaskPlan({
        materialType:
          "kartkówka",

        taskCount:
          8,
      }),
    /Dozwolone wartości: 5, 6, 7/
  )

  console.log(
    "13. Odrzucenie taskCount spoza 5, 6, 7: OK"
  )
}

function testInvalidMaterialType() {
  assert.throws(
    () =>
      buildSafeTaskPlan({
        materialType:
          "nieznany materiał",

        taskCount:
          7,
      }),
    /Nieobsługiwany typ materiału/
  )

  console.log(
    "14. Odrzucenie nieobsługiwanego typu materiału: OK"
  )
}

function main() {
  testAllTemplatePlans()
  testInputNormalization()
  testCoverageDoesNotAffectPlan()
  testRepeatedTaskTypesArePreserved()
  testInvalidTaskCount()
  testInvalidMaterialType()

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
