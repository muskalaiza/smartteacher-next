
/* =========================
   KONTEKST RAG (ZBIORCZY)
========================= */

/**
 * Zamienia element raw na czytelny tekst dla promptu.
 * Obsługuje zarówno stringi, jak i obiekty z banków RAW.
 */
function formatRawItem(item) {
  if (!item) return "";

  if (typeof item === "string") {
    return item;
  }

  if (typeof item === "object") {
    return Object.entries(item)
      .map(([key, value]) => {
        if (Array.isArray(value)) {
          return `${key}: ${value.join(" | ")}`;
        }

        return `${key}: ${value}`;
      })
      .join("; ");
  }

  return String(item);
}

function formatRawBank(raw) {
  if (!Array.isArray(raw) || raw.length === 0) return "";

  return raw
    .map(formatRawItem)
    .filter(Boolean)
    .join("\n");
}

/**
 * Buduje pełny kontekst wiedzy ze wszystkich dostępnych jednostek.
 *
 * Aktualny standard MVP:
 * - content.raw jest głównym źródłem przykładów i banków merytorycznych,
 * - definition zostaje jako definicja,
 * - stare pola example / error_example / instruction zostają tylko jako fallback.
 */
export function buildRagContext(units) {
  const parts = [];

  if (units.concepts?.length) {
    units.concepts.forEach((concept) => {
      if (concept.content?.definition) {
        parts.push(`Definicja:\n${concept.content.definition}`);
      }

      const rawText = formatRawBank(concept.content?.raw);
      if (rawText) {
        parts.push(`Bank pojęć i faktów:\n${rawText}`);
      }

      if (concept.content?.example?.length) {
        parts.push(`Przykłady poprawne:\n${concept.content.example.join("\n")}`);
      }
    });
  }

  if (units.tasks?.length) {
    units.tasks.forEach((task) => {
      const rawText = formatRawBank(task.content?.raw);
      if (rawText) {
        parts.push(`Bank przykładów zadań:\n${rawText}`);
      }

      if (task.content?.example?.length) {
        parts.push(`Przykłady zadań:\n${task.content.example.join("\n")}`);
      }
    });
  }

  if (units.structures?.length) {
    units.structures.forEach((structure) => {
      if (structure.content?.instruction) {
        parts.push(`Struktura zadania:\n${structure.content.instruction}`);
      }

      const rawText = formatRawBank(structure.content?.raw);
      if (rawText) {
        parts.push(`Bank struktur i kroków:\n${rawText}`);
      }

      if (structure.content?.example?.length) {
        parts.push(`Struktura rozwiązania:\n${structure.content.example.join("\n")}`);
      }
    });
  }

  if (units.errors?.length) {
    units.errors.forEach((error) => {
      const rawText = formatRawBank(error.content?.raw);
      if (rawText) {
        parts.push(`Bank typowych błędów:\n${rawText}`);
      }

      if (error.content?.error_example?.length) {
        parts.push(`Typowe błędy:\n${error.content.error_example.join("\n")}`);
      }
    });
  }

  return parts.join("\n\n");
}