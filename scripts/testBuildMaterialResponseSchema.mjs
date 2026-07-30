import assert from "node:assert/strict"

import {
  buildTaskPlan,
} from "../lib/generation/buildTaskPlan.js"

import {
  buildMaterialResponseSchema,
} from "../lib/generation/buildMaterialResponseSchema.js"

import {
  taskTypeSchemas,
} from "../lib/generation/taskTypeSchemas.js"

function assertTaskSchemas({
  schema,
  taskPlan,
  shouldGenerateAdhdSupport,
}) {
  const taskItems =
    schema.properties.tasks.items

  const taskSchemas =
    taskPlan.length === 1
      ? [taskItems]
      : taskItems.anyOf

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
          taskPlan[index]
            .taskSubtype,
        ]
      )

      if (
        shouldGenerateAdhdSupport
      ) {
        const adhdSupport =
          taskSchema.properties
            .adhdSupport

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
          adhdSupport.properties
            .steps.minItems,
          2
        )

        assert.equal(
          adhdSupport.properties
            .steps.maxItems,
          2
        )
      } else {
        assert.deepEqual(
          taskSchema.properties
            .adhdSupport,
          {
            type: "null",
          }
        )
      }
    }
  )
}

function testStandardSchemas() {
  for (
    const taskCount of [
      5,
      6,
      7,
    ]
  ) {
    const taskPlan =
      buildTaskPlan({
        materialType:
          "kartkówka",

        taskCount,
      })

    const schema =
      buildMaterialResponseSchema({
        taskPlan,
        shouldGenerateGlossary:
          false,
        shouldGenerateAdhdSupport:
          false,
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
      schema.properties.glossary
        .minItems,
      0
    )

    assert.equal(
      schema.properties.glossary
        .maxItems,
      0
    )

    assert.equal(
      schema.properties.tasks
        .minItems,
      taskCount
    )

    assert.equal(
      schema.properties.tasks
        .maxItems,
      taskCount
    )

    assertTaskSchemas({
      schema,
      taskPlan,
      shouldGenerateAdhdSupport:
        false,
    })

    console.log(
      `Schemat Standard, ${taskCount} zadań: OK`
    )
  }
}

function testProfileOptions() {
  const taskPlan =
    buildTaskPlan({
      materialType:
        "karta pracy",

      taskCount:
        5,
    })

  const schema =
    buildMaterialResponseSchema({
      taskPlan,
      shouldGenerateGlossary:
        true,
      shouldGenerateAdhdSupport:
        true,
    })

  assert.equal(
    schema.properties.glossary
      .minItems,
    1
  )

  assertTaskSchemas({
    schema,
    taskPlan,
    shouldGenerateAdhdSupport:
      true,
  })

  console.log(
    "Słowniczek i wsparcie ADHD: OK"
  )
}

function main() {
  const schemasBefore =
    JSON.stringify(
      taskTypeSchemas
    )

  testStandardSchemas()
  testProfileOptions()

  assert.equal(
    JSON.stringify(
      taskTypeSchemas
    ),
    schemasBefore,
    "buildMaterialResponseSchema zmodyfikował bazowe taskTypeSchemas."
  )

  console.log(
    "Bazowe taskTypeSchemas nie zostały zmienione: OK"
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
Uruchomienie testu:
node scripts/testBuildMaterialResponseSchema.mjs
*/
