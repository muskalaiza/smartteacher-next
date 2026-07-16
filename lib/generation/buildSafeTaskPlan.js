import { templates } from "./templates.js";

const TASK_COUNT_TO_LEVEL = {
  5: "podstawowy",
  6: "średni",
  7: "zaawansowany"
};

function getTemplateTaskTypes(materialType, taskCount) {
  const level = TASK_COUNT_TO_LEVEL[taskCount];

  if (!level) {
    throw new Error(
      `Nieobsługiwana liczba zadań: ${taskCount}. Dozwolone wartości: 5, 6, 7.`
    );
  }

  const materialTemplates = templates[materialType];

  if (!materialTemplates) {
    throw new Error(
      `Nieobsługiwany typ materiału: ${materialType || "[brak]"}.`
    );
  }

  const taskTypes = materialTemplates[level];

  if (
    !Array.isArray(taskTypes) ||
    taskTypes.length !== taskCount
  ) {
    throw new Error(
      `Nieprawidłowy szablon dla materiału "${materialType}", poziomu "${level}".`
    );
  }

  return taskTypes;
}

function isTaskTypeSupported(assessments, taskSubtype) {
  return assessments?.[taskSubtype]?.isSupported === true;
}

export function buildSafeTaskPlan({
  assessments,
  materialType,
  taskCount
}) {
  if (
    !assessments ||
    typeof assessments !== "object" ||
    Array.isArray(assessments)
  ) {
    throw new Error(
      "Nie można zbudować taskPlan bez prawidłowych assessments."
    );
  }
const normalizedTaskCount = Number(taskCount);

  const templateTaskTypes = getTemplateTaskTypes(
    materialType,
    normalizedTaskCount
  );

  const unsupportedTaskSubtypes = [
    ...new Set(
      templateTaskTypes.filter(
        (taskSubtype) =>
          !isTaskTypeSupported(
            assessments,
            taskSubtype
          )
      )
    )
  ];

  if (unsupportedTaskSubtypes.length > 0) {
    return {
      status: "insufficient_coverage",
      taskPlan: [],
      unsupportedTaskSubtypes
    };
  }

  return {
    status: "ready",

    taskPlan: templateTaskTypes.map(
      (taskSubtype, index) => ({
        number: index + 1,
        taskSubtype
      })
    ),

    unsupportedTaskSubtypes: []
  };
}
