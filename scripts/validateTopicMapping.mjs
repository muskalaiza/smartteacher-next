import * as topicMappingModule from "../lib/topicMapping.js";
import { learningUnits } from "../data/learningUnits.js";

const errors = [];
const warnings = [];

const TOO_GENERIC_KEYWORDS = new Set([
  "algorytm",
  "algorytmy",
  "program",
  "programowanie",
  "kod",
  "zadanie",
  "liczba",
  "liczby",
  "zmienna",
  "zmienne",
  "pętla",
  "petla",
  "funkcja",
  "funkcje",
  "tablica",
  "tablice",
]);

function fail(message) {
  errors.push(message);
}

function warn(message) {
  warnings.push(message);
}

function isPlainObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function normalizeText(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function getExportedTopicMapping(moduleObject) {
  const candidates = [
    "TOPIC_ALIASES",
    "topicAliases",
    "topicMapping",
    "TOPIC_MAPPING",
    "default",
  ];

  for (const key of candidates) {
    if (isPlainObject(moduleObject[key]) || Array.isArray(moduleObject[key])) {
      return {
        name: key,
        value: moduleObject[key],
      };
    }
  }

  fail(
    `Nie znaleziono eksportu TOPIC_ALIASES, topicAliases, topicMapping, TOPIC_MAPPING ani default w lib/topicMapping.js`
  );

  return null;
}

function getKnownSubtopics(units) {
  const subtopics = new Set();

  if (!Array.isArray(units)) {
    fail(`learningUnits musi być tablicą`);
    return subtopics;
  }

  for (const unit of units) {
    if (isNonEmptyString(unit?.subtopic)) {
      subtopics.add(unit.subtopic);
    }
  }

  return subtopics;
}

function extractMappingEntries(mappingValue) {
  const entries = [];

  if (Array.isArray(mappingValue)) {
    mappingValue.forEach((item, index) => {
      if (!isPlainObject(item)) {
        fail(`topicMapping[${index}]: wpis musi być obiektem`);
        return;
      }

      const subtopic =
        item.subtopic ||
        item.targetSubtopic ||
        item.unitSubtopic ||
        item.id ||
        item.key;

      const keywords =
        item.keywords ||
        item.aliases ||
        item.terms ||
        item.phrases ||
        item.triggers;

      entries.push({
        label: `topicMapping[${index}]`,
        subtopic,
        keywords,
        raw: item,
      });
    });

    return entries;
  }

  if (isPlainObject(mappingValue)) {
    for (const [key, value] of Object.entries(mappingValue)) {
      if (Array.isArray(value)) {
        entries.push({
          label: `topicMapping.${key}`,
          subtopic: key,
          keywords: value,
          raw: value,
        });
        continue;
      }

      if (isPlainObject(value)) {
        const subtopic =
          value.subtopic ||
          value.targetSubtopic ||
          value.unitSubtopic ||
          key;

        const keywords =
          value.keywords ||
          value.aliases ||
          value.terms ||
          value.phrases ||
          value.triggers;

        entries.push({
          label: `topicMapping.${key}`,
          subtopic,
          keywords,
          raw: value,
        });

        continue;
      }

      if (typeof value === "string") {
        entries.push({
          label: `topicMapping.${key}`,
          subtopic: key,
          keywords: [value],
          raw: value,
        });

        continue;
      }

      fail(`topicMapping.${key}: nieobsługiwany format wpisu`);
    }

    return entries;
  }

  fail(`topicMapping ma nieobsługiwany format — oczekiwano obiektu albo tablicy`);
  return entries;
}

function validateKeywordList(label, subtopic, keywords, globalKeywordMap) {
  if (!Array.isArray(keywords)) {
    fail(`${label}: keywords/aliases musi być tablicą`);
    return;
  }

  if (keywords.length === 0) {
    fail(`${label}: lista keywords/aliases nie może być pusta`);
    return;
  }

  const localKeywords = new Set();

  keywords.forEach((keyword, index) => {
    const keywordLabel = `${label}.keywords[${index}]`;

    if (!isNonEmptyString(keyword)) {
      fail(`${keywordLabel}: keyword musi być niepustym tekstem`);
      return;
    }

    const normalized = normalizeText(keyword);

    if (normalized.length < 3) {
      warn(`${keywordLabel}: keyword "${keyword}" jest bardzo krótki`);
    }

    if (TOO_GENERIC_KEYWORDS.has(normalized)) {
      warn(
        `${keywordLabel}: keyword "${keyword}" jest bardzo ogólny i może kierować do zbyt wielu tematów`
      );
    }

    if (localKeywords.has(normalized)) {
      fail(`${keywordLabel}: duplikat keyworda "${keyword}" w obrębie ${subtopic}`);
    }

    localKeywords.add(normalized);

    if (!globalKeywordMap.has(normalized)) {
      globalKeywordMap.set(normalized, new Set());
    }

    globalKeywordMap.get(normalized).add(subtopic);
  });
}

function validateTopicMapping() {
  const exported = getExportedTopicMapping(topicMappingModule);

  if (!exported) {
    return;
  }

  const knownSubtopics = getKnownSubtopics(learningUnits);
  const entries = extractMappingEntries(exported.value);
  const mappedSubtopics = new Set();
  const globalKeywordMap = new Map();

  if (entries.length === 0) {
    fail(`${exported.name}: mapowanie tematów nie może być puste`);
    return;
  }

  for (const entry of entries) {
    const { label, subtopic, keywords } = entry;

    if (!isNonEmptyString(subtopic)) {
      fail(`${label}: brak subtopic / targetSubtopic`);
      continue;
    }

    if (!knownSubtopics.has(subtopic)) {
      fail(
        `${label}: subtopic "${subtopic}" nie istnieje w data/learningUnits.js`
      );
    }

    mappedSubtopics.add(subtopic);
    validateKeywordList(label, subtopic, keywords, globalKeywordMap);
  }

  for (const subtopic of knownSubtopics) {
    if (!mappedSubtopics.has(subtopic)) {
      warn(
        `Subtopic "${subtopic}" istnieje w learningUnits.js, ale nie ma wpisu w topicMapping.js`
      );
    }
  }

  for (const [keyword, subtopics] of globalKeywordMap.entries()) {
    if (subtopics.size > 1) {
      warn(
        `Keyword "${keyword}" występuje przy wielu subtopicach: ${Array.from(
          subtopics
        ).join(", ")}`
      );
    }
  }
}

validateTopicMapping();

console.log("\n=== WALIDACJA topicMapping.js ===");

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