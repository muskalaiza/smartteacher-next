import assert from "node:assert/strict"

import {
  buildTaskTypeRules,
} from "../lib/generation/buildTaskTypeRules.js"

import {
  taskTypeSchemas,
} from "../lib/generation/taskTypeSchemas.js"

const EXPECTED_TASK_SUBTYPES = [
  "closed_single",
  "closed_tf",
  "match_fill",
  "match_pair",
  "error_find",
  "open_code",
  "open_explain",
]

function countOccurrences(text, fragment) {
  return text.split(fragment).length - 1
}

function main() {
  const schemasBefore =
    JSON.stringify(taskTypeSchemas)

  const rulesText =
    buildTaskTypeRules(taskTypeSchemas)

  assert.equal(
    typeof rulesText,
    "string"
  )

  assert.ok(
    rulesText.trim().length > 0,
    "Tekst reguł nie może być pusty."
  )

  EXPECTED_TASK_SUBTYPES.forEach(
    (taskSubtype) => {
      const heading =
        `WYMAGANIA DLA ZADANIA ${taskSubtype}`

      assert.equal(
        countOccurrences(
          rulesText,
          heading
        ),
        1,
        `Typ ${taskSubtype} powinien wystąpić dokładnie raz.`
      )

      const taskSchema =
        taskTypeSchemas[taskSubtype]

      assert.ok(
        rulesText.includes(
          taskSchema.description
        ),
        `Brakuje opisu typu ${taskSubtype}.`
      )

      taskSchema.rules.forEach(
        (rule) => {
          assert.ok(
            rulesText.includes(
              `- ${rule}`
            ),
            `Brakuje reguły dla typu ${taskSubtype}: ${rule}`
          )
        }
      )
    }
  )

  assert.equal(
    JSON.stringify(taskTypeSchemas),
    schemasBefore,
    "buildTaskTypeRules zmodyfikował taskTypeSchemas."
  )

  console.log(
    "1. Reguły siedmiu typów zadań: OK"
  )

  console.log(
    "2. Każdy typ występuje dokładnie raz: OK"
  )

  console.log(
    "3. taskTypeSchemas nie zostały zmienione: OK"
  )

  console.log(
    "\nTEST BUILD TASK TYPE RULES: OK"
  )
}

try {
  main()
} catch (error) {
  console.error(
    "\nTEST BUILD TASK TYPE RULES: BŁĄD"
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
npm run lint
node scripts/testBuildTaskTypeRules.mjs
*/