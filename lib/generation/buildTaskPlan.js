import { taskTypeSchemas } from "./taskTypeSchemas.js";
import { templates } from "./templates.js";

const TASK_COUNT_TO_LEVEL = {
  5: "podstawowy",
  6: "średni",
  7: "zaawansowany",
};

function normalizeMaterialType(
  materialType
) {
  const normalizedMaterialType =
    String(
      materialType || ""
    )
      .trim()
      .toLowerCase();

  if (!normalizedMaterialType) {
    throw new Error(
      "Brak typu materiału."
    );
  }

  return normalizedMaterialType;
}

function normalizeTaskCount(
  taskCount
) {
  const normalizedTaskCount =
    Number(taskCount);

  if (
    !Number.isInteger(
      normalizedTaskCount
    ) ||
    !TASK_COUNT_TO_LEVEL[
      normalizedTaskCount
    ]
  ) {
    throw new Error(
      `Nieobsługiwana liczba zadań: ${
        taskCount ?? "[brak]"
      }. Dozwolone wartości: 5, 6, 7.`
    );
  }

  return normalizedTaskCount;
}

function getTemplateTaskTypes({
  materialType,
  taskCount,
}) {
  const level =
    TASK_COUNT_TO_LEVEL[
      taskCount
    ];

  const materialTemplates =
    templates[materialType];

  if (!materialTemplates) {
    throw new Error(
      `Nieobsługiwany typ materiału: ${materialType}.`
    );
  }

  const taskTypes =
    materialTemplates[level];

  if (
    !Array.isArray(taskTypes) ||
    taskTypes.length !==
      taskCount
  ) {
    throw new Error(
      `Nieprawidłowy szablon dla materiału "${materialType}", poziomu "${level}".`
    );
  }

  return taskTypes.map(
    (taskSubtype, index) => {
      const normalizedTaskSubtype =
        typeof taskSubtype ===
          "string"
          ? taskSubtype.trim()
          : "";

      if (
        !normalizedTaskSubtype ||
        !Object.hasOwn(
          taskTypeSchemas,
          normalizedTaskSubtype
        )
      ) {
        throw new Error(
          `Szablon dla materiału "${materialType}", poziomu "${level}" zawiera nieobsługiwany typ zadania na pozycji ${index + 1}: ${
            normalizedTaskSubtype ||
            "[brak]"
          }.`
        );
      }

      return normalizedTaskSubtype;
    }
  );
}

export function buildTaskPlan({
  materialType,
  taskCount,
}) {
  const normalizedMaterialType =
    normalizeMaterialType(
      materialType
    );

  const normalizedTaskCount =
    normalizeTaskCount(
      taskCount
    );

  const templateTaskTypes =
    getTemplateTaskTypes({
      materialType:
        normalizedMaterialType,

      taskCount:
        normalizedTaskCount,
    });

  return templateTaskTypes.map(
    (
      taskSubtype,
      index
    ) => ({
      number:
        index + 1,

      taskSubtype,
    })
  );
}
