import {
  isMaterialGenerationEnabled,
  normalizeMaterialType,
} from "./materialContracts.js";

import { taskTypeSchemas } from "./taskTypeSchemas.js";

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
    additionalProperties: false,
  };
}

const glossaryItemSchema = createObjectSchema({
  term: {
    type: "string",
    pattern: "\\S",
    description: "Termin techniczny w języku polskim.",
  },

  translation: {
    type: "string",
    pattern: "\\S",
    description: "Tłumaczenie terminu na język ukraiński.",
  },

  explanation: {
    type: "string",
    pattern: "\\S",
    description: "Krótkie wyjaśnienie terminu w języku ukraińskim.",
  },
});

const tipItemSchema = createObjectSchema({
  title: {
    type: "string",
    pattern: "\\S",
    description: "Krótka nazwa mechanizmu albo pojęcia.",
  },

  text: {
    type: "string",
    pattern: "\\S",
    description: "Krótkie wyjaśnienie pomocne podczas pracy z zadaniami.",
  },

  code: {
    anyOf: [
      {
        type: "string",
        pattern: "\\S",
        description: "Krótki przykład kodu zapisany bez znaczników Markdown.",
      },
      {
        type: "null",
      },
    ],
  },
});

function buildTaskSchemaForPlanEntry(
  planEntry,
  taskIndex,
  shouldGenerateAdhdSupport,
  sourceTopicIds
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

  taskSchema.properties.number = {
    type: "integer",
    enum: [expectedTaskNumber],
  };

  const baseAdhdSupportSchema =
    taskSchema.properties.adhdSupport;

  taskSchema.properties.adhdSupport =
    shouldGenerateAdhdSupport
      ? cloneSchema(baseAdhdSupportSchema.anyOf[0])
      : {
          type: "null",
        };

  if (sourceTopicIds) {
    taskSchema.properties.sourceTopicIds = {
      type: "array",
      minItems: 1,
      maxItems: sourceTopicIds.length,
      items: {
        type: "string",
        enum: sourceTopicIds,
      },
      description:
        "Identyfikatory tematów źródłowych rzeczywiście sprawdzanych przez zadanie.",
    };

    taskSchema.required.push(
      "sourceTopicIds"
    );
  }

  return taskSchema;
}

function getValidatedSourceTopicIds({
  normalizedMaterialType,
  sourceTopicIds,
}) {
  const isTest =
    normalizedMaterialType ===
      "sprawdzian";

  if (!isTest) {
    if (sourceTopicIds !== undefined) {
      throw new Error(
        "Identyfikatory tematów źródłowych mogą należeć wyłącznie do sprawdzianu."
      );
    }

    return null;
  }

  if (
    !Array.isArray(sourceTopicIds) ||
    sourceTopicIds.length === 0 ||
    sourceTopicIds.some(
      (sourceTopicId) =>
        typeof sourceTopicId !== "string" ||
        !sourceTopicId.trim()
    )
  ) {
    throw new Error(
      "Nie można zbudować schematu sprawdzianu bez identyfikatorów tematów źródłowych."
    );
  }

  const normalizedSourceTopicIds =
    sourceTopicIds.map(
      (sourceTopicId) =>
        sourceTopicId.trim()
    );

  if (
    new Set(
      normalizedSourceTopicIds
    ).size !==
      normalizedSourceTopicIds.length
  ) {
    throw new Error(
      "Identyfikatory tematów źródłowych sprawdzianu zawierają duplikaty."
    );
  }

  return normalizedSourceTopicIds;
}

function buildIntroSchema(isWorksheet) {
  return isWorksheet
    ? {
        type: "string",
        pattern: "\\S",
        description:
          "Krótki wstęp do tematu oparty wyłącznie na kontekście źródłowym.",
      }
    : {
        type: "string",
        enum: [""],
      };
}

function buildTipSchema(isWorksheet) {
  return isWorksheet
    ? {
        type: "array",
        minItems: 1,
        maxItems: 2,
        items: tipItemSchema,
      }
    : {
        type: "array",
        minItems: 0,
        maxItems: 0,
        items: tipItemSchema,
      };
}

function buildGlossarySchema(shouldGenerateGlossary) {
  return shouldGenerateGlossary
    ? {
        type: "array",
        minItems: 1,
        maxItems: 5,
        items: glossaryItemSchema,
      }
    : {
        type: "array",
        minItems: 0,
        maxItems: 0,
        items: glossaryItemSchema,
      };
}

export function buildMaterialResponseSchema({
  materialType,
  taskPlan,
  shouldGenerateGlossary,
  shouldGenerateAdhdSupport,
  sourceTopicIds,
}) {
  const normalizedMaterialType =
    normalizeMaterialType(materialType);

  if (!isMaterialGenerationEnabled(normalizedMaterialType)) {
    throw new Error(
      `Nieobsługiwany typ materiału dla schematu odpowiedzi: ${
        normalizedMaterialType || "[brak]"
      }.`
    );
  }

  if (!Array.isArray(taskPlan) || taskPlan.length === 0) {
    throw new Error(
      "Nie można zbudować schematu odpowiedzi bez planu zadań."
    );
  }

  const isWorksheet =
    normalizedMaterialType === "karta pracy";

  if (shouldGenerateGlossary && !isWorksheet) {
    throw new Error(
      "Słowniczek może być generowany wyłącznie dla karty pracy."
    );
  }

  const validatedSourceTopicIds =
    getValidatedSourceTopicIds({
      normalizedMaterialType,
      sourceTopicIds,
    });

  const taskSchemas = taskPlan.map((planEntry, taskIndex) =>
    buildTaskSchemaForPlanEntry(
      planEntry,
      taskIndex,
      shouldGenerateAdhdSupport,
      validatedSourceTopicIds
    )
  );

  const taskItemsSchema =
    taskSchemas.length === 1
      ? taskSchemas[0]
      : {
          anyOf: taskSchemas,
        };

  return {
    type: "object",

    properties: {
      intro: buildIntroSchema(isWorksheet),
      tip: buildTipSchema(isWorksheet),
      glossary: buildGlossarySchema(shouldGenerateGlossary),

      tasks: {
        type: "array",
        minItems: taskPlan.length,
        maxItems: taskPlan.length,
        items: taskItemsSchema,
      },
    },

    required: ["intro", "tip", "glossary", "tasks"],
    additionalProperties: false,
  };
}
