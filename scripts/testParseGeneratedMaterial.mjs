import assert from "node:assert/strict";

import {
  buildTaskPlan,
} from "../lib/generation/buildTaskPlan.js";

import {
  parseGeneratedMaterial,
} from "../lib/generation/parseGeneratedMaterial.js";

function buildAdhdSupport() {
  return {
    focus: "Sprawdź zmianę wartości licznika.",
    steps: [
      "Ustal wartość początkową.",
      "Sprawdź warunek zakończenia.",
    ],
    checkpoint: "Czy licznik zmienia się w dobrym kierunku?",
  };
}

function buildTask({ number, taskSubtype, withAdhdSupport }) {
  const adhdSupport = withAdhdSupport
    ? buildAdhdSupport()
    : null;

  const base = {
    number,
    taskSubtype,
    adhdSupport,
  };

  switch (taskSubtype) {
    case "closed_single":
      return {
        ...base,
        question: "Który zapis rozpoczyna pętlę for?",
        options: [
          { id: "A", text: "for" },
          { id: "B", text: "if" },
          { id: "C", text: "switch" },
        ],
        correctAnswer: "A",
        answerExplanation: "Pętla rozpoczyna się słowem for.",
      };

    case "closed_tf":
      return {
        ...base,
        statement: "Licznik pętli może zmieniać się po każdej iteracji.",
        correctAnswer: true,
        answerExplanation: "Krok pętli zmienia licznik.",
      };

    case "match_pair":
      return {
        ...base,
        instruction: "Dopasuj elementy pętli do opisów.",
        leftItems: [
          { id: "1", text: "inicjalizacja" },
          { id: "2", text: "warunek" },
          { id: "3", text: "krok" },
        ],
        rightItems: [
          { id: "A", text: "ustawia wartość początkową" },
          { id: "B", text: "decyduje o kontynuacji" },
          { id: "C", text: "zmienia licznik" },
        ],
        correctPairs: [
          { leftId: "1", rightId: "A" },
          { leftId: "2", rightId: "B" },
          { leftId: "3", rightId: "C" },
        ],
        answerExplanation: "Każdy element pełni inną rolę.",
      };

    case "match_fill":
      return {
        ...base,
        question: "Pętla zaczyna się od __________ i trwa do __________.",
        hints: ["0", "5", "10", "20"],
        correctAnswers: ["0", "5"],
        answerExplanation: "Zakres obejmuje wartości od 0 do 4.",
      };

    case "error_find":
      return {
        ...base,
        instruction: "Znajdź i popraw błąd w zmianie licznika.",
        codeWithError: "for (int i = 0; i < 5; i--) {\n  cout << i;\n}",
        expectedCode: "for (int i = 0; i < 5; i++) {\n  cout << i;\n}",
        answerExplanation: "Licznik musi rosnąć.",
      };

    case "open_code":
      return {
        ...base,
        instruction: "Napisz pętlę wypisującą liczby od 1 do 5.",
        requirements: ["Użyj pętli for.", "Wypisz pięć liczb."],
        expectedCode: "for (int i = 1; i <= 5; i++) {\n  cout << i;\n}",
        answerExplanation: "Pętla wykonuje pięć iteracji.",
      };

    case "open_explain":
      return {
        ...base,
        instruction: "Wyjaśnij, dlaczego warunek pętli decyduje o liczbie iteracji.",
        expectedAnswer: "Warunek jest sprawdzany przed każdą iteracją i zatrzymuje pętlę, gdy staje się fałszywy.",
        answerExplanation: "To warunek określa, ile razy blok instrukcji może zostać wykonany.",
      };

    default:
      throw new Error(`Brak danych testowych dla ${taskSubtype}.`);
  }
}

function buildTasks(taskPlan, withAdhdSupport) {
  return taskPlan.map(({ number, taskSubtype }) =>
    buildTask({ number, taskSubtype, withAdhdSupport })
  );
}

function parseMaterial({
  materialType,
  taskPlan,
  shouldGenerateGlossary,
  value,
}) {
  return parseGeneratedMaterial(
    JSON.stringify(value),
    {
      materialType,
      taskPlan,
      shouldGenerateGlossary,
    }
  );
}

function testWorksheet() {
  const taskPlan = buildTaskPlan({
    materialType: "karta pracy",
    taskCount: 5,
  });

  const parsed = parseMaterial({
    materialType: "karta pracy",
    taskPlan,
    shouldGenerateGlossary: true,
    value: {
      intro: "  Pętla for powtarza instrukcje określoną liczbę razy.  ",
      tip: [
        {
          title: "  Budowa pętli  ",
          text: "  Sprawdź inicjalizację, warunek i krok.  ",
          code: "```cpp\nfor (int i = 0; i < 5; i++) { }\n```",
        },
        {
          title: "Zakres",
          text: "Warunek decyduje o zakończeniu.",
          code: null,
        },
      ],
      glossary: [
        {
          term: "Licznik",
          translation: "Лічильник",
          explanation: "Змінна, що керує кількістю повторень.",
        },
      ],
      tasks: buildTasks(taskPlan, true),
    },
  });

  assert.equal(
    parsed.intro,
    "Pętla for powtarza instrukcje określoną liczbę razy."
  );
  assert.equal(parsed.tip.length, 2);
  assert.equal(
    parsed.tip[0].code,
    "for (int i = 0; i < 5; i++) { }"
  );
  assert.equal(parsed.tip[1].code, null);
  assert.equal(parsed.glossary.length, 1);
  assert.equal(parsed.tasks.length, 5);
  assert.equal(parsed.tasks[0].adhdSupport.steps.length, 2);
  assert.equal(
    Object.prototype.hasOwnProperty.call(
      parsed.tasks[4],
      "context"
    ),
    false
  );

  console.log("Parser karty pracy: OK");
}

function testLegacyOpenExplainContextIsDiscarded() {
  const taskPlan = buildTaskPlan({
    materialType: "karta pracy",
    taskCount: 5,
  });

  const tasks = buildTasks(taskPlan, true);
  tasks[4].context =
    "Historyczny kontekst zapisany w material_schema_v2.";

  const parsed = parseMaterial({
    materialType: "karta pracy",
    taskPlan,
    shouldGenerateGlossary: false,
    value: {
      intro: "Wstęp",
      tip: [
        {
          title: "Wskazówka",
          text: "Krótka pomoc.",
          code: null,
        },
      ],
      glossary: [],
      tasks,
    },
  });

  assert.equal(
    Object.prototype.hasOwnProperty.call(
      parsed.tasks[4],
      "context"
    ),
    false
  );

  console.log(
    "Historyczne context z material_schema_v2 jest odrzucane: OK"
  );
}

function testQuizRegression() {
  const taskPlan = buildTaskPlan({
    materialType: "kartkówka",
    taskCount: 5,
  });

  const parsed = parseMaterial({
    materialType: "kartkówka",
    taskPlan,
    shouldGenerateGlossary: false,
    value: {
      intro: "",
      tip: [],
      glossary: [],
      tasks: buildTasks(taskPlan, false),
    },
  });

  assert.equal(parsed.intro, "");
  assert.deepEqual(parsed.tip, []);
  assert.deepEqual(parsed.glossary, []);
  assert.equal(parsed.tasks.length, 5);

  console.log("Regresja parsera kartkówki: OK");
}

function testStoredTestRegression() {
  const taskPlan = buildTaskPlan({
    materialType: "sprawdzian",
    taskCount: 5,
  });

  const parsed = parseMaterial({
    materialType: "sprawdzian",
    taskPlan,
    shouldGenerateGlossary: false,
    value: {
      intro: "",
      tip: [],
      glossary: [],
      tasks: buildTasks(taskPlan, false),
    },
  });

  assert.equal(parsed.intro, "");
  assert.deepEqual(parsed.tip, []);
  assert.deepEqual(parsed.glossary, []);
  assert.equal(parsed.tasks.length, 5);

  console.log(
    "Regresja parsera sprawdzianu zapisanego w Historii: OK"
  );
}

function testInvalidWorksheetFields() {
  const taskPlan = buildTaskPlan({
    materialType: "karta pracy",
    taskCount: 5,
  });

  const base = {
    intro: "Wstęp",
    tip: [
      {
        title: "Budowa",
        text: "Krótka pomoc.",
        code: null,
      },
    ],
    glossary: [],
    tasks: buildTasks(taskPlan, false),
  };

  assert.throws(
    () =>
      parseMaterial({
        materialType: "karta pracy",
        taskPlan,
        shouldGenerateGlossary: false,
        value: { ...base, intro: "" },
      }),
    /intro nie może być puste/
  );

  assert.throws(
    () =>
      parseMaterial({
        materialType: "karta pracy",
        taskPlan,
        shouldGenerateGlossary: false,
        value: { ...base, tip: [] },
      }),
    /od 1 do 2/
  );

  assert.throws(
    () =>
      parseMaterial({
        materialType: "karta pracy",
        taskPlan,
        shouldGenerateGlossary: false,
        value: {
          ...base,
          glossary: [
            {
              term: "Licznik",
              translation: "Лічильник",
              explanation: "Opis",
            },
          ],
        },
      }),
    /glossary musi być puste/
  );

  console.log("Odrzucanie nieprawidłowych pól karty pracy: OK");
}

try {
  testWorksheet();
  testLegacyOpenExplainContextIsDiscarded();
  testQuizRegression();
  testStoredTestRegression();
  testInvalidWorksheetFields();
  console.log("TEST PARSE GENERATED MATERIAL: OK");
} catch (error) {
  console.error("TEST PARSE GENERATED MATERIAL: BŁĄD");
  console.error(error);
  process.exitCode = 1;
}
