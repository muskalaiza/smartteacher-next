// Stała konfiguracja walidacji typów jednostek dla poszczególnych podtypów zadań
const SUBTYPE_DESCRIPTIONS = {
  closed_single: "zadanie zamknięte, jednokrotny wybór A/B/C",
  closed_tf: "zadanie zamknięte typu Prawda/Fałsz",
  match_fill: "uzupełnij brakujący element",
  match_pair: "dopasuj elementy w pary",
  open_code: "napisz krótki kod",
  open_explain: "opisz działanie kodu",
  error_find: "znajdź i popraw błąd"
};

export function describeTaskSubtype(type) {
  return SUBTYPE_DESCRIPTIONS[type] || "";
}

const SUBTYPE_VALIDATORS = {
  error_find: (type) => type === "error",
  match_fill: (type) =>  type === "concept" || type === "structure" || type === "task",
  match_pair: (type) => type === "concept" || type === "structure",
  closed_single: (type) => type === "concept" || type === "task",
  closed_tf: (type) => type === "concept" || type === "task" || type === "error",
  open_explain: (type) => type === "concept" || type === "structure",
  open_code: (type) => type === "structure"
};

function hasUsableContent(unit) {
  const content = unit?.content;
  if (!content) return false;

  return (
    Boolean(content.definition) ||
    Boolean(content.instruction) ||
    Array.isArray(content.raw) ||
    Array.isArray(content.example) ||
    Array.isArray(content.error_example)
  );
}

/**
 * Pobiera dopasowaną jednostkę LearningUnit dla danego podtypu zadania.
 *
 * Aktualny standard MVP:
 * - wybór po taskSubtype,
 * - źródłem treści jest content.raw,
 * - nie używamy content.variants,
 * - nie blokujemy ponownego użycia tej samej jednostki po id,
 *   bo jeden bank raw może obsłużyć kilka zadań.
 */


export function mapTaskToUnit(units, taskSubtype, usedIdsSet = new Set()) {
  const validator = SUBTYPE_VALIDATORS[taskSubtype];
  if (!validator) return null;

  const collections = [
    units.concepts,
    units.tasks,
    units.structures,
    units.errors
  ];

  for (const collection of collections) {
    if (!collection) continue;

   
 const found = collection.find((u) =>
      validator(u.type) &&
      Array.isArray(u.taskSubtypes) &&
      u.taskSubtypes.includes(taskSubtype) &&
      hasUsableContent(u)
    );

    if (found) {
      usedIdsSet.add(found.id);
      return found;
    }
  }

  return null;
}
  


