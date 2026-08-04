import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import mammoth from "mammoth";
import { Packer } from "docx";

import { buildMaterialDocx } from "../lib/export/exportDocx.js";
import { buildTaskPlan } from "../lib/generation/buildTaskPlan.js";

const PROFILES = [
  { value: "Standard", label: "Standard" },
  { value: "Dysleksja", label: "Dysleksja" },
  { value: "ASD", label: "Spektrum ASD" },
  { value: "ADHD", label: "ADHD" },
  { value: "Obcojęzyczny", label: "Uczeń obcojęzyczny" },
];

const GRADE_SCALE = {
  grade2Min: 40,
  grade3Min: 55,
  grade4Min: 70,
  grade5Min: 85,
  grade6Min: 95,
};

const ADHD_SUPPORT = {
  focus: "Rozpoznaj regułę sprawdzaną w zadaniu.",
  steps: [
    "Wskaż elementy, które trzeba porównać.",
    "Sprawdź wynik z treścią polecenia.",
  ],
  checkpoint: "Sprawdź, czy nie pominięto żadnego wymagania.",
};

const WORKSHEET_TASKS = [
  {
    number: 1,
    taskSubtype: "closed_single",
    question: "Która deklaracja tworzy zmienną całkowitą?",
    options: [
      { id: "A", text: "int liczba;" },
      { id: "B", text: "float liczba;" },
      { id: "C", text: "string liczba;" },
    ],
    correctAnswer: "A",
    answerExplanation: "Typ int przechowuje liczby całkowite.",
    adhdSupport: ADHD_SUPPORT,
  },
  {
    number: 2,
    taskSubtype: "match_pair",
    instruction: "Dopasuj typ danych do przykładu.",
    leftItems: [
      { id: "1", text: "int" },
      { id: "2", text: "float" },
      { id: "3", text: "char" },
    ],
    rightItems: [
      { id: "A", text: "'A'" },
      { id: "B", text: "18" },
      { id: "C", text: "17.5" },
    ],
    correctPairs: [
      { leftId: "1", rightId: "B" },
      { leftId: "2", rightId: "C" },
      { leftId: "3", rightId: "A" },
    ],
    answerExplanation: "Każdy typ danych odpowiada innemu rodzajowi wartości.",
    adhdSupport: ADHD_SUPPORT,
  },
  {
    number: 3,
    taskSubtype: "match_fill",
    question:
      "Typ __________ przechowuje liczbę całkowitą, a typ __________ tekst.",
    hints: ["int", "string", "float", "char"],
    correctAnswers: ["int", "string"],
    answerExplanation: "int przechowuje liczby całkowite, a string tekst.",
    adhdSupport: ADHD_SUPPORT,
  },
  {
    number: 4,
    taskSubtype: "error_find",
    instruction: "Znajdź i popraw błąd w kodzie.",
    codeWithError: "int 2liczba = 5;",
    expectedCode: "int liczba2 = 5;",
    answerExplanation: "Nazwa zmiennej nie może zaczynać się od cyfry.",
    adhdSupport: ADHD_SUPPORT,
  },
  {
    number: 5,
    taskSubtype: "open_explain",
    instruction: "Wyjaśnij, dlaczego nazwa zmiennej powinna być jednoznaczna.",
    expectedAnswer:
      "Jednoznaczna nazwa ułatwia rozpoznanie przeznaczenia zmiennej.",
    answerExplanation: "Czytelna nazwa zmniejsza ryzyko pomyłki.",
    adhdSupport: ADHD_SUPPORT,
  },
  {
    number: 6,
    taskSubtype: "open_code",
    instruction: "Napisz kod deklarujący zmienną i wyświetlający jej wartość.",
    requirements: [
      "Użyj typu int.",
      "Nadaj zmiennej wartość 3.",
      "Wyświetl wartość w pętli.",
    ],
    expectedCode:
      "int liczba = 3;\nfor (int i = 0; i < 3; i++) {\n    cout << liczba;\n}",
    answerExplanation: "Kod deklaruje zmienną i wyświetla ją trzy razy.",
    adhdSupport: ADHD_SUPPORT,
  },
  {
    number: 7,
    taskSubtype: "open_explain",
    instruction: "Wyjaśnij, jaki wynik zwróci podany fragment programu.",
    expectedAnswer: "Program trzykrotnie wyświetli wartość zmiennej liczba.",
    answerExplanation: "Pętla wykonuje instrukcję wyświetlania trzy razy.",
    adhdSupport: ADHD_SUPPORT,
  },
];

const WORKSHEET_MATERIAL = {
  intro: "Zmienna przechowuje wartość używaną w programie.",
  tip: [
    {
      title: "Deklaracja",
      text: "Najpierw podaj typ, a potem nazwę zmiennej.",
      code: "int liczba = 18;",
    },
    {
      title: "Identyfikator",
      text: "Nazwa nie może zaczynać się od cyfry.",
      code: null,
    },
  ],
  glossary: [
    {
      term: "zmienna",
      translation: "змінна",
      explanation: "Miejsce przechowujące wartość.",
    },
    {
      term: "typ danych",
      translation: "тип даних",
      explanation: "Określa rodzaj przechowywanej wartości.",
    },
  ],
  tasks: WORKSHEET_TASKS,
};

const worksheetPlan = buildTaskPlan({
  materialType: "karta pracy",
  taskCount: 7,
});

assert.deepEqual(
  WORKSHEET_TASKS.map(({ number, taskSubtype }) => ({ number, taskSubtype })),
  worksheetPlan,
  "Fixture karty pracy musi odpowiadać aktualnemu templates.js."
);

const worksheetDocument = buildMaterialDocx({
  materialTypeValue: "karta pracy",
  materialTypeLabel: "Karta pracy",
  topicTitle: "Zmienne w C++",
  profiles: PROFILES,
  material: WORKSHEET_MATERIAL,
  gradeScale: GRADE_SCALE,
});

const worksheetBuffer = await Packer.toBuffer(worksheetDocument);
assert.ok(
  worksheetBuffer.length > 10000,
  "Wygenerowany DOCX karty pracy jest zbyt mały."
);

const { value: worksheetText } = await mammoth.extractRawText({
  buffer: worksheetBuffer,
});

for (const profile of PROFILES) {
  assert.ok(
    worksheetText.includes(`Karta pracy — Profil: ${profile.label}`),
    `Brak profilu ${profile.value} w DOCX.`
  );
}

assert.equal(
  worksheetText.split("Słowniczek polsko-ukraiński").length - 1,
  1,
  "Słowniczek powinien wystąpić tylko raz."
);
assert.equal(
  worksheetText.split("Klucz odpowiedzi dla nauczyciela").length - 1,
  1,
  "Klucz nauczyciela powinien wystąpić tylko raz."
);
assert.ok(worksheetText.includes("Suma punktów: 17 pkt"));
assert.ok(worksheetText.includes("6 — celujący: 95–100%"));
assert.ok(worksheetText.includes("for (int i = 0; i < 3; i++)"));
assert.ok(worksheetText.includes("cout << liczba;"));
assert.ok(worksheetText.includes("Plan działania"));
assert.ok(worksheetText.includes("Cel"));

const quizTasks = [
  { ...WORKSHEET_TASKS[0], number: 1 },
  {
    number: 2,
    taskSubtype: "closed_tf",
    statement: "Nazwa zmiennej może zaczynać się od cyfry.",
    correctAnswer: false,
    answerExplanation: "Identyfikator nie może zaczynać się od cyfry.",
    adhdSupport: ADHD_SUPPORT,
  },
  { ...WORKSHEET_TASKS[1], number: 3 },
  { ...WORKSHEET_TASKS[2], number: 4 },
  { ...WORKSHEET_TASKS[3], number: 5 },
];

assert.deepEqual(
  quizTasks.map(({ number, taskSubtype }) => ({ number, taskSubtype })),
  buildTaskPlan({ materialType: "kartkówka", taskCount: 5 }),
  "Fixture kartkówki musi odpowiadać aktualnemu templates.js."
);

const quizDocument = buildMaterialDocx({
  materialTypeValue: "kartkówka",
  materialTypeLabel: "Kartkówka",
  topicTitle: "Zmienne w C++",
  profiles: [PROFILES[0]],
  material: { tasks: quizTasks },
  gradeScale: GRADE_SCALE,
});

const quizBuffer = await Packer.toBuffer(quizDocument);
const { value: quizText } = await mammoth.extractRawText({ buffer: quizBuffer });

assert.ok(quizText.includes("Prawda     /     Fałsz"));
assert.ok(quizText.includes("Suma punktów: 9 pkt"));

if (process.env.SMARTTEACHER_WRITE_DOCX_FIXTURE === "1") {
  const outputPath = path.join(tmpdir(), "smartteacher-export-docx-test.docx");
  await writeFile(outputPath, worksheetBuffer);
  console.log(`Fixture DOCX: ${outputPath}`);
}

assert.throws(
  () =>
    buildMaterialDocx({
      materialTypeValue: "karta pracy",
      materialTypeLabel: "Karta pracy",
      topicTitle: "Zmienne w C++",
      profiles: [],
      material: WORKSHEET_MATERIAL,
      gradeScale: null,
    }),
  /co najmniej jednego profilu/
);

console.log(
  "OK: eksport DOCX obejmuje aktualną kartę pracy 7 zadań, 5 profili, kartkówkę z P/F, jeden słowniczek, jeden klucz oraz punktację z templates.js."
);
