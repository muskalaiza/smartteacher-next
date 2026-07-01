const createObjectSchema = (properties) => ({
  type: "object",
  properties,
  required: Object.keys(properties),
  additionalProperties: false
});

const textSchema = (description) => ({
  type: "string",
  description
});

const adhdSupportSchema = {
  anyOf: [
    createObjectSchema({
      focus: textSchema(
        "Jeden konkretny mechanizm merytoryczny zadania."
      ),

      steps: {
        type: "array",
        description: "Dokładnie dwa krótkie kroki merytoryczne.",
        minItems: 2,
        maxItems: 2,
        items: textSchema("Krótki krok merytoryczny.")
      },

      checkpoint: textSchema(
        "Kontrola jednego typowego błędu."
      )
    }),

    {
      type: "null"
    }
  ]
};

const createTaskSchema = (taskSubtype, properties) =>
  createObjectSchema({
    number: {
      type: "integer",
      description: "Numer zadania zgodny z planem dydaktycznym.",
      minimum: 1
    },

    taskSubtype: {
      type: "string",
      enum: [taskSubtype]
    },

    ...properties,

    adhdSupport: adhdSupportSchema
  });

const optionSchema = createObjectSchema({
  id: {
    type: "string",
    enum: ["A", "B", "C"]
  },

  text: textSchema("Treść odpowiedzi.")
});

const pairedItemSchema = (allowedIds) =>
  createObjectSchema({
    id: {
      type: "string",
      enum: allowedIds
    },

    text: textSchema("Treść elementu.")
  });

const correctPairSchema = createObjectSchema({
  leftId: {
    type: "string",
    enum: ["1", "2", "3"]
  },

  rightId: {
    type: "string",
    enum: ["A", "B", "C"]
  }
});

export const taskTypeSchemas = {
  closed_single: {
    description: "Zadanie jednokrotnego wyboru A/B/C.",

    schema: createTaskSchema("closed_single", {
      question: textSchema(
        "Treść pytania bez oznaczeń opcji."
      ),

      options: {
        type: "array",
        minItems: 3,
        maxItems: 3,
        items: optionSchema
      },

      correctAnswer: {
        type: "string",
        enum: ["A", "B", "C"]
      },

      answerExplanation: textSchema(
        "Krótkie wyjaśnienie poprawnej odpowiedzi."
      )
    }),

    rules: [
      "Tablica options musi zawierać dokładnie 3 elementy z ID: A, B, C.",
      "Tylko jedna odpowiedź może być poprawna. Dystraktory muszą być realistyczne.",
      "Pole question nie może zawierać oznaczeń opcji ani numeru zadania."
    ]
  },

  closed_tf: {
    description: "Zadanie prawda/fałsz.",

    schema: createTaskSchema("closed_tf", {
      statement: textSchema(
        "Jednoznaczne zdanie twierdzące do oceny."
      ),

      correctAnswer: {
        type: "boolean"
      },

      answerExplanation: textSchema(
        "Krótkie wyjaśnienie, dlaczego zdanie jest prawdziwe lub fałszywe."
      )
    }),

    rules: [
      "Pole statement musi być pojedynczym, jednoznacznym zdaniem twierdzącym.",
      "Różnicuj odpowiedzi — correctAnswer nie może być stale ustawiane na true.",
      "Nie umieszczaj słów „Prawda” ani „Fałsz” w polu statement."
    ]
  },

  match_fill: {
  description: "Zadanie z dwiema lukami i czterema pojedynczymi podpowiedziami.",

  schema: createTaskSchema("match_fill", {
    question: textSchema(
      "Treść zadania z dokładnie dwiema lukami oznaczonymi jako __________."
    ),

    hints: {
      type: "array",
      minItems: 4,
      maxItems: 4,
      items: textSchema(
        "Jedna pojedyncza podpowiedź do wyboru."
      )
    },

    correctAnswers: {
      type: "array",
      minItems: 2,
      maxItems: 2,
      items: textSchema(
        "Jedna poprawna odpowiedź do jednej luki."
      )
    },

    answerExplanation: textSchema(
      "Krótkie wyjaśnienie rozwiązania."
    )
  }),

  rules: [
    "Pole question musi zawierać dokładnie dwie luki oznaczone jako __________.",
    "Pole hints musi zawierać 4 pojedyncze podpowiedzi: 2 poprawne i 2 dystraktory.",
    "Pole correctAnswers musi zawierać 2 odpowiedzi w kolejności luk."
  ]
},

  match_pair: {
    description:
      "Zadanie polegające na dopasowaniu elementów w pary.",

    schema: createTaskSchema("match_pair", {
      instruction: textSchema(
        "Krótkie polecenie dopasowania elementów."
      ),

      leftItems: {
        type: "array",
        minItems: 3,
        maxItems: 3,
        items: pairedItemSchema(["1", "2", "3"])
      },

      rightItems: {
        type: "array",
        minItems: 3,
        maxItems: 3,
        items: pairedItemSchema(["A", "B", "C"])
      },

      correctPairs: {
        type: "array",
        minItems: 3,
        maxItems: 3,
        items: correctPairSchema
      },

      answerExplanation: textSchema(
        "Krótkie wyjaśnienie poprawnego dopasowania."
      )
    }),

    rules: [
      "ID lewej strony to wyłącznie 1, 2, 3, a prawej strony A, B, C.",
      "Każdy element może wystąpić tylko w jednej poprawnej parze.",
      "Nie odwołuj się w instruction do układu strony ani kolumn."
    ]
  },

  error_find: {
    description:
      "Zadanie polegające na znalezieniu i poprawieniu jednego błędu.",

    schema: createTaskSchema("error_find", {
      instruction: textSchema(
        "Polecenie znalezienia i poprawienia błędu."
      ),

      codeWithError: textSchema(
        "Czysty kod zawierający jeden celowy błąd."
      ),

      expectedCode: textSchema(
        "Czysty, w pełni poprawiony kod."
      ),

      answerExplanation: textSchema(
        "Wyjaśnienie błędu oraz sposobu jego poprawienia."
      )
    }),

    rules: [
      "Pole codeWithError musi zawierać dokładnie jeden celowy błąd.",
      "Pola codeWithError i expectedCode muszą zawierać czysty kod bez znaczników Markdown.",
      "Pole instruction nie może zawierać kodu ani fragmentu rozwiązania.",
      "Kod z błędem nie może zawierać komentarza zdradzającego odpowiedź."
    ]
  },

  open_code: {
    description:
      "Zadanie otwarte polegające na napisaniu krótkiego kodu.",

    schema: createTaskSchema("open_code", {
      instruction: textSchema(
        "Opis zadania programistycznego dla ucznia."
      ),

      requirements: {
        type: "array",
        minItems: 1,
        items: textSchema(
          "Krótkie, mierzalne wymaganie funkcjonalne."
        )
      },

      expectedCode: textSchema(
        "Czysty przykładowy kod rozwiązania."
      ),

      answerExplanation: textSchema(
        "Wyjaśnienie, w jaki sposób kod realizuje wymagania."
      )
    }),

    rules: [
      "Wymagania muszą być krótkie, mierzalne i jednoznaczne.",
      "Pole expectedCode musi zawierać czysty kod bez znaczników Markdown.",
      "Pole expectedCode służy wyłącznie jako klucz odpowiedzi."
    ]
  },

  open_explain: {
    description:
      "Zadanie otwarte polegające na wyjaśnieniu kodu lub mechanizmu.",

    schema: createTaskSchema("open_explain", {
      instruction: textSchema(
        "Polecenie określające, co uczeń ma przeanalizować i wyjaśnić."
      ),

      context: textSchema(
        "Czysty kod, schemat tekstowy albo opis algorytmu do analizy."
      ),

      expectedAnswer: textSchema(
        "Wzorcowa odpowiedź opisowa ucznia."
      ),

      answerExplanation: textSchema(
        "Uzasadnienie merytoryczne poprawnej interpretacji."
      )
    }),

    rules: [
      "Pole context nie może być puste ani zawierać gotowej odpowiedzi.",
      "Jeśli context zawiera kod, musi to być czysty kod bez znaczników Markdown.",
      "Zadanie musi wymagać wypowiedzi opisowej, a nie pojedynczego słowa."
    ]
  }
};