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

function main() {
  const schemasBefore = JSON.stringify(taskTypeSchemas);

  testQuizSchemas();
  testWorksheetSchema();
  testInvalidGlossaryContract();

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
