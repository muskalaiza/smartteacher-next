import {
  isKnownMaterialType,
  normalizeMaterialType,
} from "./materialContracts.js";

/* =========================
   PARSER I NORMALIZACJA JSON
========================= */

function createParseError(message) {
  const error = new Error(message);
  error.name = "GeneratedMaterialParseError";
  return error;
}

function isPlainObject(value) {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value)
  );
}

function normalizeRequiredValue(value, path) {
  if (typeof value === "string") {
    const normalized = value.trim();

    if (!normalized) {
      throw createParseError(
        `Pole ${path} nie może być puste.`
      );
    }

    return normalized;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      throw createParseError(
        `Tablica ${path} nie może być pusta.`
      );
    }

    return value.map((item, index) =>
      normalizeRequiredValue(
        item,
        `${path}[${index}]`
      )
    );
  }

  if (isPlainObject(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => [
        key,
        normalizeRequiredValue(
          nestedValue,
          `${path}.${key}`
        ),
      ])
    );
  }

  return value;
}

function normalizeRequiredString(value, path) {
  if (typeof value !== "string") {
    throw createParseError(
      `Pole ${path} musi być stringiem.`
    );
  }

  return normalizeRequiredValue(value, path);
}

function stripOuterCodeFence(value) {
  const text = String(value).trim();

  if (text.startsWith("```") && text.endsWith("```")) {
    return text
      .replace(/^```[^\r\n]*\r?\n?/, "")
      .replace(/\r?\n?```$/, "")
      .trim();
  }

  return text;
}

function normalizeCodeFields(task) {
  const normalizedTask = { ...task };

  ["codeWithError", "expectedCode"].forEach(
    (field) => {
      if (
        Object.prototype.hasOwnProperty.call(
          normalizedTask,
          field
        )
      ) {
        const normalizedCode = stripOuterCodeFence(
          normalizedTask[field]
        );

        if (!normalizedCode) {
          throw createParseError(
            `Pole ${field} nie może być puste.`
          );
        }

        normalizedTask[field] = normalizedCode;
      }
    }
  );

  return normalizedTask;
}

function getNormalizedQuestion(task) {
  switch (task.taskSubtype) {
    case "closed_single":
    case "match_fill":
      return task.question;

    case "closed_tf":
      return task.statement;

    case "match_pair":
    case "error_find":
    case "open_code":
    case "open_explain":
      return task.instruction;

    default:
      throw createParseError(
        `Nieobsługiwany typ zadania: ${
          task.taskSubtype || "[brak]"
        }.`
      );
  }
}

function normalizeTask(task, planEntry, taskIndex) {
  if (!isPlainObject(task)) {
    throw createParseError(
      `Zadanie ${taskIndex + 1} nie jest prawidłowym obiektem.`
    );
  }

  const expectedNumber = Number.isInteger(planEntry?.number)
    ? planEntry.number
    : taskIndex + 1;

  const expectedSubtype = planEntry?.taskSubtype;

  if (task.number !== expectedNumber) {
    throw createParseError(
      `Zadanie na pozycji ${taskIndex + 1} ma numer ${
        task.number
      }, oczekiwano ${expectedNumber}.`
    );
  }

  if (task.taskSubtype !== expectedSubtype) {
    throw createParseError(
      `Zadanie ${expectedNumber} ma typ ${
        task.taskSubtype || "[brak]"
      }, oczekiwano ${expectedSubtype || "[brak]"}.`
    );
  }

  const normalizedTask = normalizeRequiredValue(
    task,
    `tasks[${taskIndex}]`
  );

  const taskWithCleanCode =
    normalizeCodeFields(normalizedTask);

  if (taskWithCleanCode.taskSubtype === "open_explain") {
    delete taskWithCleanCode.context;
  }

  return {
    ...taskWithCleanCode,
    question: String(
      getNormalizedQuestion(taskWithCleanCode)
    ).trim(),
  };
}

function normalizeIntro(intro, isWorksheet) {
  if (!isWorksheet) {
    if (intro !== "") {
      throw createParseError(
        "Pole intro dla tego typu materiału musi być pustym stringiem."
      );
    }

    return "";
  }

  return normalizeRequiredString(intro, "intro");
}

function normalizeTip(tip, isWorksheet) {
  if (!Array.isArray(tip)) {
    throw createParseError(
      "Pole tip musi być tablicą."
    );
  }

  if (!isWorksheet) {
    if (tip.length !== 0) {
      throw createParseError(
        "Pole tip dla tego typu materiału musi być pustą tablicą."
      );
    }

    return [];
  }

  if (tip.length < 1 || tip.length > 2) {
    throw createParseError(
      "Karta pracy musi zawierać od 1 do 2 elementów mini-ściągawki."
    );
  }

  return tip.map((item, index) => {
    if (!isPlainObject(item)) {
      throw createParseError(
        `Element tip[${index}] nie jest prawidłowym obiektem.`
      );
    }

    const normalizedTitle =
      normalizeRequiredString(
        item.title,
        `tip[${index}].title`
      );

    const normalizedText =
      normalizeRequiredString(
        item.text,
        `tip[${index}].text`
      );

    if (
      item.code !== null &&
      typeof item.code !== "string"
    ) {
      throw createParseError(
        `Pole tip[${index}].code musi być stringiem albo null.`
      );
    }

    const normalizedCode =
      typeof item.code === "string"
        ? stripOuterCodeFence(item.code)
        : null;

    if (
      typeof item.code === "string" &&
      !normalizedCode
    ) {
      throw createParseError(
        `Pole tip[${index}].code nie może być puste.`
      );
    }

    return {
      title: normalizedTitle,
      text: normalizedText,
      code: normalizedCode,
    };
  });
}

function normalizeGlossary(
  glossary,
  shouldGenerateGlossary
) {
  if (!Array.isArray(glossary)) {
    throw createParseError(
      "Pole glossary musi być tablicą."
    );
  }

  if (!shouldGenerateGlossary) {
    if (glossary.length !== 0) {
      throw createParseError(
        "Pole glossary musi być puste, gdy profil Obcojęzyczny nie został wybrany dla karty pracy."
      );
    }

    return [];
  }

  if (glossary.length < 1 || glossary.length > 5) {
    throw createParseError(
      "Słowniczek musi zawierać od 1 do 5 terminów."
    );
  }

  return glossary.map((item, index) => {
    if (!isPlainObject(item)) {
      throw createParseError(
        `Element glossary[${index}] nie jest prawidłowym obiektem.`
      );
    }

    return {
      term: normalizeRequiredString(
        item.term,
        `glossary[${index}].term`
      ),
      translation: normalizeRequiredString(
        item.translation,
        `glossary[${index}].translation`
      ),
      explanation: normalizeRequiredString(
        item.explanation,
        `glossary[${index}].explanation`
      ),
    };
  });
}

/* =========================
   GŁÓWNA FUNKCJA PARSERA
========================= */

export function parseGeneratedMaterial(
  text,
  {
    materialType,
    taskPlan,
    shouldGenerateGlossary,
  }
) {
  if (typeof text !== "string" || !text.trim()) {
    throw createParseError(
      "Model nie zwrócił treści materiału."
    );
  }

  const normalizedMaterialType =
    normalizeMaterialType(materialType);

  if (!isKnownMaterialType(normalizedMaterialType)) {
    throw createParseError(
      `Parser nie obsługuje typu materiału: ${
        normalizedMaterialType || "[brak]"
      }.`
    );
  }

  if (!Array.isArray(taskPlan) || taskPlan.length === 0) {
    throw createParseError(
      "Parser nie otrzymał prawidłowego planu zadań."
    );
  }

  const isWorksheet =
    normalizedMaterialType === "karta pracy";

  if (shouldGenerateGlossary && !isWorksheet) {
    throw createParseError(
      "Słowniczek może należeć wyłącznie do karty pracy."
    );
  }

  let parsed;

  try {
    parsed = JSON.parse(text.trim());
  } catch (error) {
    throw createParseError(
      `Nie udało się odczytać JSON materiału: ${error.message}`
    );
  }

  if (!isPlainObject(parsed)) {
    throw createParseError(
      "Odpowiedź modelu nie jest prawidłowym obiektem materiału."
    );
  }

  if (!Array.isArray(parsed.tasks)) {
    throw createParseError(
      "Pole tasks musi być tablicą."
    );
  }

  if (parsed.tasks.length !== taskPlan.length) {
    throw createParseError(
      `Model zwrócił ${parsed.tasks.length} zadań, oczekiwano ${taskPlan.length}.`
    );
  }

  const tasks = parsed.tasks.map((task, taskIndex) =>
    normalizeTask(
      task,
      taskPlan[taskIndex],
      taskIndex
    )
  );

  return {
    intro: normalizeIntro(parsed.intro, isWorksheet),
    tip: normalizeTip(parsed.tip, isWorksheet),
    glossary: normalizeGlossary(
      parsed.glossary,
      shouldGenerateGlossary
    ),
    tasks,
  };
}
