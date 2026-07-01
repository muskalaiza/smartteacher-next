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

/*
  Structured Outputs pilnuje typów i wymaganych pól.
  Parser dodatkowo odrzuca puste wartości tekstowe,
  ponieważ pusty string jest formalnie poprawnym stringiem,
  ale nie jest prawidłową treścią zadania.
*/
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
        )
      ])
    );
  }

  /*
    number, boolean oraz null zachowujemy bez zmian.
    null jest prawidłowy wyłącznie dla adhdSupport,
    gdy profil ADHD nie został wybrany.
  */
  return value;
}

/*
  Pola kodowe mają zawierać czysty kod.
  Jeśli model mimo instrukcji zwróci zewnętrzny blok Markdown,
  usuwamy wyłącznie otwierające i zamykające ogrodzenie.
*/
function stripOuterCodeFence(value) {
  const text = String(value).trim();

  if (
    text.startsWith("```") &&
    text.endsWith("```")
  ) {
    return text
      .replace(/^```[^\r\n]*\r?\n?/, "")
      .replace(/\r?\n?```$/, "")
      .trim();
  }

  return text;
}

function normalizeCodeFields(task) {
  const normalizedTask = { ...task };

  ["codeWithError", "expectedCode", "context"].forEach(
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

/*
  Każde zadanie otrzymuje wewnętrzne pole question,
  używane przez aktualne renderery.

  Nie doklejamy do niego:
  - kodu z błędem,
  - wymagań open_code,
  - kontekstu open_explain.

  Te dane pozostają wyłącznie w swoich polach strukturalnych.
*/
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

  return {
    ...taskWithCleanCode,

    question: String(
      getNormalizedQuestion(taskWithCleanCode)
    ).trim()
  };
}

function normalizeGlossary(glossary) {
  if (!Array.isArray(glossary)) {
    throw createParseError(
      "Pole glossary musi być tablicą."
    );
  }

  return glossary.map((item, index) => {
    if (!isPlainObject(item)) {
      throw createParseError(
        `Element glossary[${index}] nie jest prawidłowym obiektem.`
      );
    }

    return normalizeRequiredValue(
      item,
      `glossary[${index}]`
    );
  });
}

/* =========================
   GŁÓWNA FUNKCJA PARSERA
========================= */

export function parseGeneratedMaterial(text, taskPlan) {
  if (
    typeof text !== "string" ||
    !text.trim()
  ) {
    throw createParseError(
      "Model nie zwrócił treści materiału."
    );
  }

  if (
    !Array.isArray(taskPlan) ||
    taskPlan.length === 0
  ) {
    throw createParseError(
      "Parser nie otrzymał prawidłowego planu zadań."
    );
  }

  let parsed;

  try {
    /*
      Przy Structured Outputs oczekujemy dokładnego JSON.
      Nie wycinamy fragmentów tekstu i nie usuwamy
      znaczników ```json, ponieważ takie zachowanie
      ukrywałoby błąd kontraktu.
    */
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

  if (parsed.intro !== "") {
    throw createParseError(
      "Pole intro zwrócone przez model musi być pustym stringiem."
    );
  }

  if (
    !Array.isArray(parsed.tip) ||
    parsed.tip.length !== 0
  ) {
    throw createParseError(
      "Pole tip zwrócone przez model musi być pustą tablicą."
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

  const tasks = parsed.tasks.map(
    (task, taskIndex) =>
      normalizeTask(
        task,
        taskPlan[taskIndex],
        taskIndex
      )
  );

  return {
    intro: "",
    tip: [],
    glossary: normalizeGlossary(parsed.glossary),
    tasks
  };
}
