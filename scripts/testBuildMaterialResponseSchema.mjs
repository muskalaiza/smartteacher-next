import assert from "node:assert/strict"

import {
  buildSafeTaskPlan,
} from "../lib/generation/buildSafeTaskPlan.js"

import {
  buildMaterialResponseSchema,
} from "../lib/generation/buildMaterialResponseSchema.js"

import {
  taskTypeSchemas,
} from "../lib/generation/taskTypeSchemas.js"

const TASK_SUBTYPES = [
  "closed_single",
  "closed_tf",
  "match_fill",
  "match_pair",
  "error_find",
  "open_code",
  "open_explain",
]

function createSupportedAssessments() {
  return Object.fromEntries(
    TASK_SUBTYPES.map((taskSubtype) => [
      taskSubtype,
      {
        isSupported: true,
      },
    ])
  )
}

function buildTestTaskPlan() {
  const result = buildSafeTaskPlan({
    assessments:
      createSupportedAssessments(),

    materialType: "kartkówka",
    taskCount: 5,
  })

  assert.equal(
    result.status,
    "ready"
  )

  return result.taskPlan
}

function testStandardSchema(taskPlan) {
  const schema =
    buildMaterialResponseSchema({
      taskPlan,
      shouldGenerateGlossary: false,
      shouldGenerateAdhdSupport: false,
    })

  assert.equal(
    schema.type,
    "object"
  )

  assert.equal(
    schema.additionalProperties,
    false
  )

  assert.deepEqual(
    schema.required,
    [
      "intro",
      "tip",
      "glossary",
      "tasks",
    ]
  )

  assert.deepEqual(
    schema.properties.intro.enum,
    [""]
  )

  assert.equal(
    schema.properties.tip.minItems,
    0
  )

  assert.equal(
    schema.properties.tip.maxItems,
    0
  )

  assert.equal(
    schema.properties.glossary.minItems,
    0
  )

  assert.equal(
    schema.properties.glossary.maxItems,
    0
  )

  assert.equal(
    schema.properties.tasks.minItems,
    5
  )

  assert.equal(
    schema.properties.tasks.maxItems,
    5
  )

  const taskSchemas =
    schema.properties.tasks.items.anyOf

  assert.equal(
    taskSchemas.length,
    taskPlan.length
  )

  taskSchemas.forEach(
    (taskSchema, index) => {
      assert.deepEqual(
        taskSchema.properties.number.enum,
        [index + 1]
      )

      assert.deepEqual(
        taskSchema.properties.taskSubtype.enum,
        [
          taskPlan[index].taskSubtype,
        ]
      )

      assert.deepEqual(
        taskSchema.properties.adhdSupport,
        {
          type: "null",
        }
      )
    }
  )

  console.log(
    "1. Standardowy schemat pięciu zadań: OK"
  )
}

function testProfileOptions(taskPlan) {
  const schema =
    buildMaterialResponseSchema({
      taskPlan,
      shouldGenerateGlossary: true,
      shouldGenerateAdhdSupport: true,
    })

  assert.equal(
    schema.properties.glossary.minItems,
    1
  )

  const taskSchemas =
    schema.properties.tasks.items.anyOf

  taskSchemas.forEach(
    (taskSchema) => {
      const adhdSupport =
        taskSchema.properties.adhdSupport

      assert.equal(
        adhdSupport.type,
        "object"
      )

      assert.deepEqual(
        adhdSupport.required,
        [
          "focus",
          "steps",
          "checkpoint",
        ]
      )

      assert.equal(
        adhdSupport.properties.steps.minItems,
        2
      )

      assert.equal(
        adhdSupport.properties.steps.maxItems,
        2
      )
    }
  )

  console.log(
    "2. Słowniczek i wsparcie ADHD: OK"
  )
}

function main() {
  const schemasBefore =
    JSON.stringify(taskTypeSchemas)

  const taskPlan =
    buildTestTaskPlan()

  testStandardSchema(taskPlan)
  testProfileOptions(taskPlan)

  assert.equal(
    JSON.stringify(taskTypeSchemas),
    schemasBefore,
    "buildMaterialResponseSchema zmodyfikował bazowe taskTypeSchemas."
  )

  console.log(
    "3. Bazowe taskTypeSchemas nie zostały zmienione: OK"
  )

  console.log(
    "\nTEST BUILD MATERIAL RESPONSE SCHEMA: OK"
  )
}

try {
  main()
} catch (error) {
  console.error(
    "\nTEST BUILD MATERIAL RESPONSE SCHEMA: BŁĄD"
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
node scripts/testBuildMaterialResponseSchema.mjs

*/