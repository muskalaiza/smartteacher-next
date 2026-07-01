import { taskTypeSchemas } from "./taskTypeSchemas";

/* =========================
   SCHEMAT ODPOWIEDZI MODELU
========================= */

function cloneSchema(schema) {
  return JSON.parse(JSON.stringify(schema));
}

function createObjectSchema(properties) {
  return {
    type: "object",
    properties,
    required: Object.keys(properties),
    additionalProperties: false
  };
}

const glossaryItemSchema = createObjectSchema({
  term: {
    type: "string",
    description: "Termin techniczny w języku polskim."
  },

  translation: {
    type: "string",
    description: "Tłumaczenie terminu na język ukraiński."
  },

  explanation: {
    type: "string",
    description: "Krótkie wyjaśnienie terminu w języku ukraińskim."
  }
});

const tipItemSchema = createObjectSchema({
  title: {
    type: "string"
  },

  text: {
    type: "string"
  },

  code: {
    type: "string"
  }
});

function buildTaskSchemaForPlanEntry(
  planEntry,
  taskIndex,
  shouldGenerateAdhdSupport
) {
  const taskSubtype = planEntry?.taskSubtype;
  const baseSchema = taskTypeSchemas[taskSubtype]?.schema;

  if (!baseSchema) {
    throw new Error(
      `Brak schematu Structured Outputs dla typu zadania: ${
        taskSubtype || "[brak]"
      }.`
    );
  }

  const taskSchema = cloneSchema(baseSchema);

  const expectedTaskNumber = Number.isInteger(planEntry?.number)
    ? planEntry.number
    : taskIndex + 1;

  // Numer zadania zostaje powiązany z konkretną pozycją w taskPlan.
  taskSchema.properties.number = {
    type: "integer",
    enum: [expectedTaskNumber]
  };

  const baseAdhdSupportSchema =
    taskSchema.properties.adhdSupport;

  /*
    Jeśli wybrano profil ADHD, wsparcie jest wymaganym obiektem.
    W przeciwnym razie pole nadal istnieje, ale musi mieć wartość null.
  */
  taskSchema.properties.adhdSupport =
    shouldGenerateAdhdSupport
      ? cloneSchema(baseAdhdSupportSchema.anyOf[0])
      : {
          type: "null"
        };

  return taskSchema;
}

export function buildMaterialResponseSchema({
  taskPlan,
  shouldGenerateGlossary,
  shouldGenerateAdhdSupport
}) {
  if (!Array.isArray(taskPlan) || taskPlan.length === 0) {
    throw new Error(
      "Nie można zbudować schematu odpowiedzi bez planu zadań."
    );
  }

  const taskSchemas = taskPlan.map((planEntry, taskIndex) =>
    buildTaskSchemaForPlanEntry(
      planEntry,
      taskIndex,
      shouldGenerateAdhdSupport
    )
  );

  const taskItemsSchema =
    taskSchemas.length === 1
      ? taskSchemas[0]
      : {
          anyOf: taskSchemas
        };

  return {
    type: "object",

    properties: {
      /*
        Intro i tip nie są generowane przez model.
        Dla karty pracy pochodzą bezpośrednio z LearningUnits.
      */
      intro: {
        type: "string",
        enum: [""]
      },

      tip: {
        type: "array",
        minItems: 0,
        maxItems: 0,
        items: tipItemSchema
      },

      glossary: shouldGenerateGlossary
        ? {
            type: "array",
            minItems: 1,
            items: glossaryItemSchema
          }
        : {
            type: "array",
            minItems: 0,
            maxItems: 0,
            items: glossaryItemSchema
          },

      tasks: {
        type: "array",
        minItems: taskPlan.length,
        maxItems: taskPlan.length,
        items: taskItemsSchema
      }
    },

    required: [
      "intro",
      "tip",
      "glossary",
      "tasks"
    ],

    additionalProperties: false
  };
}
