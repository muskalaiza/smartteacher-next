
 // topicMapping.js

import { learningUnits } from "../data/learningUnits.js";

/* =========================
   NORMALIZACJA TEKSTU
========================= */

function normalize(text) {
  return String(text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/* =========================
   ALIASY TEMATÓW
   label = naturalna nazwa tematu
   keywords = parafrazy wpisywane przez nauczyciela
========================= */

export const TOPIC_ALIASES = [
  /* =========================
     ALGORYTMY — SYSTEMY LICZBOWE
  ========================= */

  {
    topic: "algorytmy",
    subtopic: "sys_pozycyjne",
    label: "Pozycyjne systemy liczbowe",
    keywords: [
      "systemy liczbowe",
      "system pozycyjny",
      "systemy pozycyjne",
      "bin dec hex",
      "podstawa systemu"
    ]
  },

  {
    topic: "algorytmy",
    subtopic: "sys_binarny",
    label: "System binarny",
    keywords: [
       "system dwójkowy",
      "liczby binarne",
      "bity",
      "podstawa 2"
    ]
  },

  {
    topic: "algorytmy",
    subtopic: "konwersja_bin_dec",
    label: "Konwersja systemu binarnego na dziesiętny",
    keywords: [
      "bin na dec",
      "bin dec",
      "zamiana binarnego na dziesiętny",
      "liczba binarna na dziesiętną"
    ]
  },

  {
    topic: "algorytmy",
    subtopic: "konwersja_dec_bin",
    label: "Konwersja systemu dziesiętnego na binarny",
    keywords: [
     "dec na bin",
      "dec bin",
      "zamiana dziesiętnego na binarny",
      "liczba dziesiętna na binarną"
    ]
  },

  /* =========================
     ALGORYTMY — REPREZENTACJE
  ========================= */

  {
    topic: "algorytmy",
    subtopic: "alg_reprezentacje",
    label: "Sposoby zapisu algorytmów",
    keywords: [
      "reprezentacja algorytmu",
      "formy zapisu algorytmu",
      "zapis algorytmu"
    ]
  },

  {
    topic: "algorytmy",
    subtopic: "alg_lista_krokow",
    label: "Lista kroków algorytmu",
    keywords: [
      "lista kroków",
      "algorytm w punktach",
      "kroki algorytmu"
    ]
  },

  {
    topic: "algorytmy",
    subtopic: "alg_schemat_blokowy",
    label: "Schemat blokowy algorytmu",
    keywords: [
      "schemat blokowy",
      "diagram blokowy",
      "flowchart",
      "zapis algorytmu w formie graficznej"
    ]
  },

  {
    topic: "algorytmy",
    subtopic: "alg_pseudokod",
    label: "Pseudokod",
    keywords: [
      "pseudokod",
      "zapis algorytmu w pseudokodzie",
      "algorytm w postaci pseudokodu",
      "pseudokod w programowaniu"
    ]
  },

  /* =========================
     PROGRAMOWANIE
  ========================= */

  {
    topic: "programowanie",
    subtopic: "prog_zmienne",
    label: "Zmienne",
    keywords: [
      "zmienna",
      "deklaracja zmiennej",
      "definiowanie zmiennej",
      "przypisanie wartości",
      "zmienne w programowaniu",
    ]
  },

  {
    topic: "programowanie",
    subtopic: "prog_typy_danych",
    label: "Typy danych",
    keywords: [
      "typ danych",
      "typy zmiennych",
      "data types",
      "int float string bool" 
    ]
   
  },

  {
    topic: "programowanie",
    subtopic: "prog_warunki",
    label: "Instrukcje warunkowe",
    keywords: [
      "warunki",
      "if else",
      "elif",
      "wyrażenia logiczne",
      "operatory",
    ]
  },

  {
    topic: "programowanie",
    subtopic: "prog_petla_for",
    label: "Pętla for",
    keywords: [
      "for",
      "for loop",
      "iteracja for",
      "pętle w programowaniu",
    ]
  },

  {
    topic: "programowanie",
    subtopic: "prog_petla_while",
    label: "Pętla while",
    keywords: [
      "while",
      "while loop",
      "dopóki",
      "do while"
    ]
  },

  {
    topic: "programowanie",
    subtopic: "prog_funkcje",
    label: "Funkcje",
    keywords: [
      "funkcja",
      "function",
      "parametry funkcji",
      "return"
    ]
  },
  {
    topic: "programowanie",
    subtopic: "prog_tablice",
    label: "Tablice",
    keywords: [
      "tablica",
      "array",
      "indeksy tablicy",
      "listy w pythonie"
    ]  
  }
];

/* =========================
   WALIDACJA ALIASÓW WZGLĘDEM LEARNING UNITS
========================= */

const AVAILABLE_ROUTES = new Set(
  learningUnits
    .filter((unit) => unit?.topic && unit?.subtopic)
    .map((unit) => `${unit.topic}::${unit.subtopic}`)
);

function routeExists(alias) {
  return AVAILABLE_ROUTES.has(`${alias.topic}::${alias.subtopic}`);
}

/* =========================
   SCORING
========================= */

function scoreAlias(input, alias) {
  const normalizedInput = normalize(input);
  const normalizedLabel = normalize(alias.label);
  const normalizedSubtopic = normalize(alias.subtopic.replace(/_/g, " "));

  let score = 0;

  // 1. Najmocniejsze: pełne trafienie w label.
  if (normalizedInput === normalizedLabel) {
    score += 100;
  }

  // 2. Bardzo mocne: input zawiera label albo label zawiera input.
  if (
    normalizedInput.includes(normalizedLabel) ||
    normalizedLabel.includes(normalizedInput)
  ) {
    score += 70;
  }

  // 3. Techniczny fallback: subtopic po zamianie _ na spacje.
  if (
    normalizedInput === normalizedSubtopic ||
    normalizedInput.includes(normalizedSubtopic) ||
    normalizedSubtopic.includes(normalizedInput)
  ) {
    score += 50;
  }

  // 4. Słowa kluczowe.
  for (const keyword of alias.keywords || []) {
    const normalizedKeyword = normalize(keyword);

    if (!normalizedKeyword) continue;

    if (normalizedInput === normalizedKeyword) {
      score += 90;
      continue;
    }

    if (
       normalizedKeyword.length >= 4 &&
    (
      normalizedInput.includes(normalizedKeyword) ||
      normalizedKeyword.includes(normalizedInput)
    )
    ) {
      score += 40;
    }
  }

  return score;
}

/* =========================
   MAPOWANIE TEMATU
========================= */

export function mapTopic(input) {
  const normalizedInput = normalize(input);
  if (!normalizedInput) return null;

  const candidates = TOPIC_ALIASES
    .filter(routeExists)
    .map((alias) => ({
      ...alias,
      score: scoreAlias(normalizedInput, alias)
    }))
    .filter((candidate) => candidate.score > 0)
    .sort((a, b) => b.score - a.score);

  const best = candidates[0];

  if (!best) return null;

  return {
    topic: best.topic,
    subtopic: best.subtopic,
    language: best.language || null
  };
}
