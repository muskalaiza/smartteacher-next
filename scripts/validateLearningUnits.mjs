import { learningUnits } from "../data/learningUnits.js";

const ALLOWED_TOPICS = ["algorytmy", "programowanie"];

const ALLOWED_LEVELS = ["PP"];

const ALLOWED_UNIT_TYPES = ["concept", "task", "error", "structure"];

const ALLOWED_TASK_SUBTYPES = [
  "closed_single",
  "closed_tf",
  "match_fill",
  "match_pair",
  "error_find",
  "open_code",
  "open_explain",
];

const errors = [];
const warnings = [];

function fail(message) {
  errors.push(message);
}

function warn(message) {
  warnings.push(message);
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function hasArray(value) {
  return Array.isArray(value);
}

function checkRequiredField(unit, fieldName) {
  if (!isNonEmptyString(unit[fieldName])) {
    fail(`${unit.id || "BRAK_ID"}: brak lub puste pole "${fieldName}"`);
  }
}

function validateRawItem(unit, item, index) {
  const label = `${unit.id}: content.raw[${index}]`;

  if (typeof item !== "object" || item === null || Array.isArray(item)) {
    fail(`${label}: element raw musi być obiektem`);
    return;
  }

  if (unit.type === "concept") {
    if (!isNonEmptyString(item.term)) {
      fail(`${label}: concept powinien mieć pole "term"`);
    }
    if (!isNonEmptyString(item.desc)) {
      fail(`${label}: concept powinien mieć pole "desc"`);
    }
  }

  if (unit.type === "error") {
    const hasBadExpr = isNonEmptyString(item.bad_expr);
    const hasBad = isNonEmptyString(item.bad);

    if (!hasBadExpr && !hasBad) {
      fail(`${label}: error powinien mieć pole "bad_expr" albo "bad"`);
    }

    if (!isNonEmptyString(item.fix)) {
      fail(`${label}: error powinien mieć pole "fix"`);
    }

    if (!isNonEmptyString(item.error_type)) {
      fail(`${label}: error powinien mieć pole "error_type"`);
    }

    if ("type" in item) {
      fail(`${label}: w obiekcie błędu użyto "type"; powinno być "error_type"`);
    }
  }

  if (unit.type === "structure") {
    const hasStepAction = isNonEmptyString(item.step) && isNonEmptyString(item.action);
    const hasElementRole = isNonEmptyString(item.element) && isNonEmptyString(item.role);

    if (!hasStepAction && !hasElementRole) {
      fail(`${label}: structure powinien mieć pola "step"+"action" albo "element"+"role"`);
    }
  }

  if (unit.type === "task") {
    const validTaskShapes = [
      ["expr", "equation"],
      ["problem", "representation"],
      ["title", "steps"],
      ["bin", "dec"],
      ["dec", "bin"],
    ];

    const hasValidShape = validTaskShapes.some(([a, b]) => {
      return item[a] !== undefined && item[b] !== undefined;
    });

    if (!hasValidShape) {
      warn(`${label}: task ma nietypowy kształt danych — sprawdź, czy builder go obsługuje`);
    }
  }
}

function validateLearningUnits(units) {
  if (!Array.isArray(units)) {
    fail(`learningUnits musi być tablicą`);
    return;
  }

  if (units.length === 0) {
    fail(`learningUnits nie może być pustą tablicą`);
    return;
  }

  const ids = new Set();

  for (const unit of units) {
    if (typeof unit !== "object" || unit === null || Array.isArray(unit)) {
      fail(`Każdy element learningUnits musi być obiektem`);
      continue;
    }

    checkRequiredField(unit, "id");
    checkRequiredField(unit, "topic");
    checkRequiredField(unit, "subtopic");
    checkRequiredField(unit, "curriculum_level");
    checkRequiredField(unit, "type");

    if (isNonEmptyString(unit.id)) {
      if (ids.has(unit.id)) {
        fail(`${unit.id}: zduplikowane ID jednostki`);
      }
      ids.add(unit.id);
    }

    if (!ALLOWED_TOPICS.includes(unit.topic)) {
      fail(`${unit.id}: niedozwolony topic "${unit.topic}"`);
    }

    if (!ALLOWED_LEVELS.includes(unit.curriculum_level)) {
      fail(`${unit.id}: niedozwolony curriculum_level "${unit.curriculum_level}"`);
    }

    if (!ALLOWED_UNIT_TYPES.includes(unit.type)) {
      fail(`${unit.id}: niedozwolony type "${unit.type}"`);
    }

    if (!hasArray(unit.taskSubtypes)) {
      fail(`${unit.id}: taskSubtypes musi być tablicą`);
    } else {
      if (unit.taskSubtypes.length === 0) {
        fail(`${unit.id}: taskSubtypes nie może być pustą tablicą`);
      }

      for (const subtype of unit.taskSubtypes) {
        if (!ALLOWED_TASK_SUBTYPES.includes(subtype)) {
          fail(`${unit.id}: niedozwolony taskSubtype "${subtype}"`);
        }
      }

      if (unit.type === "error" && !unit.taskSubtypes.includes("error_find")) {
        warn(`${unit.id}: jednostka typu error zwykle powinna obsługiwać "error_find"`);
      }

      if (unit.type === "concept" && unit.taskSubtypes.includes("open_code")) {
        warn(`${unit.id}: concept raczej nie powinien generować open_code`);
      }
    }

    if (!unit.content || typeof unit.content !== "object") {
      fail(`${unit.id}: brak obiektu content`);
      continue;
    }

    if (!hasArray(unit.content.raw)) {
      fail(`${unit.id}: content.raw musi być tablicą`);
      continue;
    }

    if (unit.content.raw.length === 0) {
      fail(`${unit.id}: content.raw nie może być pustą tablicą`);
    }

    if (unit.content.raw.length < 14) {
      warn(`${unit.id}: content.raw ma tylko ${unit.content.raw.length} elementów; docelowo minimum 14`);
    }

    unit.content.raw.forEach((item, index) => {
      validateRawItem(unit, item, index);
    });
  }
}

validateLearningUnits(learningUnits);

console.log("\n=== WALIDACJA learningUnits.js ===");

if (warnings.length > 0) {
  console.log("\nOSTRZEŻENIA:");
  for (const warning of warnings) {
    console.log(`- ${warning}`);
  }
}

if (errors.length > 0) {
  console.log("\nBŁĘDY:");
  for (const error of errors) {
    console.log(`- ${error}`);
  }

  console.log(`\nWynik: NIEPOPRAWNE. Liczba błędów: ${errors.length}`);
  process.exit(1);
}

console.log("\nWynik: POPRAWNE. Brak błędów krytycznych.");

if (warnings.length > 0) {
  console.log(`Ostrzeżenia do przeglądu: ${warnings.length}`);
} else {
  console.log("Brak ostrzeżeń.");
}