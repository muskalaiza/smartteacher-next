/* =========================
   REGUŁY DYDAKTYCZNE DLA TYPÓW ZADAŃ
========================= */

export function buildTaskTypeRules(taskTypeSchemas) {
  return Object.entries(taskTypeSchemas)
    .map(([taskSubtype, schema]) => {
      return `
==================================================

WYMAGANIA DLA ZADANIA ${taskSubtype}

${schema.description}

ZASADY:
${schema.rules.map((rule) => `- ${rule}`).join("\n")}

==================================================
`;
    })
    .join("\n");
}
