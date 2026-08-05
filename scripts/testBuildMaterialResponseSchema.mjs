import assert from "node:assert/strict";

import {
  buildTaskPlan,
} from "../lib/generation/buildTaskPlan.js";

import {
  buildMaterialResponseSchema,
} from "../lib/generation/buildMaterialResponseSchema.js";

import {
  taskTypeSchemas,
} from "../lib/generation/taskTypeSchemas.js";

function assertTaskSchemas({
  schema,
  taskPlan,
  shouldGenerateAdhdSupport,
  sourceTopicIds = null,
}) {
  const taskItems = schema.properties.tasks.items;

  const taskSchemas =
    taskPlan.length === 1
      ? [taskItems]
      : taskItems.anyOf;

  assert.equal(taskSchemas.length, taskPlan.length);

  taskSchemas.forEach((taskSchema, index) => {
    assert.deepEqual(
      taskSchema.properties.number.enum,
      [index + 1]
    );

    assert.deepEqual(
      taskSchema.properties.taskSubtype.enum,
      [taskPlan[index].taskSubtype]
    );

    if (shouldGenerateAdhdSupport) {
      const adhdSupport =
        taskSchema.properties.adhdSupport;

      assert.equal(adhdSupport.type, "object");
      assert.deepEqual(
        adhdSupport.required,
        ["focus", "steps", "checkpoint"]
      );
      assert.equal(
        adhdSupport.properties.steps.minItems,
        2
      );
      assert.equal(
        adhdSupport.properties.steps.maxItems,
        2
      );
    } else {
      assert.deepEqual(
        taskSchema.properties.adhdSupport,
        { type: "null" }
      );
    }

    if (sourceTopicIds) {
      assert.deepEqual(
        taskSchema.properties.sourceTopicIds.items.enum,
        sourceTopicIds
      );
      assert.equal(
        taskSchema.properties.sourceTopicIds.minItems,
        1
      );
      assert.equal(
        taskSchema.properties.sourceTopicIds.maxItems,
        sourceTopicIds.length
      );
      assert.equal(
        Object.prototype.hasOwnProperty.call(
          taskSchema.properties.sourceTopicIds,
          "uniqueItems"
        ),
        false
      );
      assert.equal(
        taskSchema.required.includes("sourceTopicIds"),
        true
      );
    } else {
      assert.equal(
        Object.prototype.hasOwnProperty.call(
          taskSchema.properties,
          "sourceTopicIds"
        ),
        false
      );
    }
  });
}

function testQuizSchemas() {
  for (const taskCount of [5, 6, 7]) {
    const taskPlan = buildTaskPlan({
      materialType: "kartkówka",
      taskCount,
    });

    const schema = buildMaterialResponseSchema({
      materialType: "kartkówka",
      taskPlan,
      shouldGenerateGlossary: false,
      shouldGenerateAdhdSupport: false,
    });

    assert.deepEqual(
      schema.required,
      ["intro", "tip", "glossary", "tasks"]
    );
    assert.deepEqual(schema.properties.intro.enum, [""]);
    assert.equal(schema.properties.tip.minItems, 0);
    assert.equal(schema.properties.tip.maxItems, 0);
    assert.equal(schema.properties.glossary.minItems, 0);
    assert.equal(schema.properties.glossary.maxItems, 0);
    assert.equal(schema.properties.tasks.minItems, taskCount);
    assert.equal(schema.properties.tasks.maxItems, taskCount);

    assertTaskSchemas({
      schema,
      taskPlan,
      shouldGenerateAdhdSupport: false,
    });
  }

  console.log("Schemat kartkówki 5/6/7: OK");
}

function testWorksheetSchema() {
  const taskPlan = buildTaskPlan({
    materialType: "karta pracy",
    taskCount: 5,
  });

  const schema = buildMaterialResponseSchema({
    materialType: "karta pracy",
    taskPlan,
    shouldGenerateGlossary: true,
    shouldGenerateAdhdSupport: true,
  });

  assert.equal(schema.properties.intro.type, "string");
  assert.equal(schema.properties.intro.pattern, "\\S");
  assert.equal(schema.properties.tip.minItems, 1);
  assert.equal(schema.properties.tip.maxItems, 2);
  assert.equal(schema.properties.glossary.minItems, 1);
  assert.equal(schema.properties.glossary.maxItems, 5);

  assert.deepEqual(
    schema.properties.tip.items.properties.code.anyOf,
    [
      {
        type: "string",
        pattern: "\\S",
        description:
          "Krótki przykład kodu zapisany bez znaczników Markdown.",
      },
      { type: "null" },
    ]
  );

  assertTaskSchemas({
    schema,
    taskPlan,
    shouldGenerateAdhdSupport: true,
  });

  const openExplainSchema =
    schema.properties.tasks.items.anyOf.find(
      (taskSchema) =>
        taskSchema.properties.taskSubtype.enum[0] ===
        "open_explain"
    );

  assert.ok(openExplainSchema);
  assert.equal(
    Object.prototype.hasOwnProperty.call(
      openExplainSchema.properties,
      "context"
    ),
    false
  );
  assert.equal(
    openExplainSchema.required.includes("context"),
    false
  );

  console.log("Schemat karty pracy + ADHD + słowniczek: OK");
}

function testLessonSectionTestSchema() {
  const sourceTopicIds = [
    "00000000-0000-4000-8000-000000000001",
    "00000000-0000-4000-8000-000000000002",
    "00000000-0000-4000-8000-000000000003",
  ];

  const taskPlan = buildTaskPlan({
    materialType: "sprawdzian",
    taskCount: 5,
  });

  const schema = buildMaterialResponseSchema({
    materialType: "sprawdzian",
    taskPlan,
    shouldGenerateGlossary: false,
    shouldGenerateAdhdSupport: false,
    sourceTopicIds,
  });

  assertTaskSchemas({
    schema,
    taskPlan,
    shouldGenerateAdhdSupport: false,
    sourceTopicIds,
  });

  assert.throws(
    () =>
      buildMaterialResponseSchema({
        materialType: "sprawdzian",
        taskPlan,
        shouldGenerateGlossary: false,
        shouldGenerateAdhdSupport: false,
      }),
    /identyfikatorów tematów źródłowych/
  );

  assert.throws(
    () =>
      buildMaterialResponseSchema({
        materialType: "kartkówka",
        taskPlan: buildTaskPlan({
          materialType: "kartkówka",
          taskCount: 5,
        }),
        shouldGenerateGlossary: false,
        shouldGenerateAdhdSupport: false,
        sourceTopicIds,
      }),
    /wyłącznie do sprawdzianu/
  );

  console.log("Schemat sprawdzianu z sourceTopicIds: OK");
}

function testInvalidGlossaryContract() {
  const taskPlan = buildTaskPlan({
    materialType: "kartkówka",
    taskCount: 5,
  });

  assert.throws(
    () =>
      buildMaterialResponseSchema({
        materialType: "kartkówka",
        taskPlan,
        shouldGenerateGlossary: true,
        shouldGenerateAdhdSupport: false,
      }),
    /wyłącznie dla karty pracy/
  );
}

function testLeanTaskContracts() {
  const errorFindProperties =
    taskTypeSchemas.error_find.schema.properties;

  assert.deepEqual(
    Object.keys(errorFindProperties),
    [
      "number",
      "taskSubtype",
      "expectedBehavior",
      "codeWithError",
      "errorFragment",
      "correctedFragment",
      "adhdSupport",
    ]
  );

  const openCodeProperties =
    taskTypeSchemas.open_code.schema.properties;

  assert.equal(
    Object.hasOwn(openCodeProperties, "instruction"),
    false
  );
  assert.equal(
    Object.hasOwn(openCodeProperties, "answerExplanation"),
    false
  );

  const openExplainProperties =
    taskTypeSchemas.open_explain.schema.properties;

  assert.equal(
    Object.hasOwn(openExplainProperties, "answerExplanation"),
    false
  );

  Object.values(taskTypeSchemas).forEach((taskTypeSchema) => {
    assert.equal(
      Object.hasOwn(taskTypeSchema, "rules"),
      false
    );
  });

  console.log("Odchudzone kontrakty typów zadań: OK");
}

function main() {
  const schemasBefore = JSON.stringify(taskTypeSchemas);

  testQuizSchemas();
  testWorksheetSchema();
  testLessonSectionTestSchema();
  testInvalidGlossaryContract();
  testLeanTaskContracts();

  assert.equal(
    JSON.stringify(taskTypeSchemas),
    schemasBefore,
    "buildMaterialResponseSchema zmodyfikował bazowe taskTypeSchemas."
  );

  console.log("Bazowe taskTypeSchemas nie zostały zmienione: OK");
  console.log("TEST BUILD MATERIAL RESPONSE SCHEMA: OK");
}

try {
  main();
} catch (error) {
  console.error("TEST BUILD MATERIAL RESPONSE SCHEMA: BŁĄD");
  console.error(error);
  process.exitCode = 1;
}
