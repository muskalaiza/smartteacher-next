const createObjectSchema = (properties) => ({
  type: "object",
  properties,
  required: Object.keys(properties),
  additionalProperties: false
});

const textSchema = (description) => ({
  type: "string",
  pattern: "\\S",
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
    schema: createTaskSchema("closed_single", {
      question: textSchema(
        "Jednoznaczne pytanie bez numeru zadania ani oznaczeń opcji."
      ),

      options: {
        type: "array",
        description:
          "Trzy różne odpowiedzi: jedna poprawna i dwa realistyczne dystraktory.",
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
    })
  },

  closed_tf: {
    schema: createTaskSchema("closed_tf", {
      statement: textSchema(
        "Jednoznaczne zdanie twierdzące bez słów Prawda i Fałsz."
      ),

      correctAnswer: {
        type: "boolean"
      },

      answerExplanation: textSchema(
        "Krótkie wyjaśnienie, dlaczego zdanie jest prawdziwe lub fałszywe."
      )
    })
  },

  match_fill: {
    schema: createTaskSchema("match_fill", {
      question: textSchema(
        "Treść zadania z dokładnie dwiema lukami oznaczonymi jako __________."
      ),

      hints: {
        type: "array",
        description:
          "Cztery pojedyncze podpowiedzi: dwie poprawne i dwa dystraktory.",
        minItems: 4,
        maxItems: 4,
        items: textSchema(
          "Jedna pojedyncza podpowiedź do wyboru."
        )
      },

      correctAnswers: {
        type: "array",
        description:
          "Dwie poprawne odpowiedzi w kolejności luk.",
        minItems: 2,
        maxItems: 2,
        items: textSchema(
          "Jedna poprawna odpowiedź do jednej luki."
        )
      },

      answerExplanation: textSchema(
        "Krótkie wyjaśnienie rozwiązania."
      )
    })
  },

  match_pair: {
    schema: createTaskSchema("match_pair", {
      instruction: textSchema(
        "Krótkie polecenie dopasowania elementów bez odwołań do układu strony."
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
    })
  },

  error_find: {
    schema: createTaskSchema("error_find", {
      instruction: textSchema(
        "Krótkie polecenie znalezienia i poprawienia jednego błędu, bez kodu ani fragmentu rozwiązania."
      ),

      codeWithError: textSchema(
        "Czysty kod bez komentarzy ujawniających odpowiedź, zawierający dokładnie jeden rzeczywisty i jednoznaczny błąd."
      ),

      expectedCode: textSchema(
        "Czysty, w pełni poprawiony kod, różniący się od codeWithError tylko w zakresie potrzebnym do usunięcia błędu."
      ),

      answerExplanation: textSchema(
        "Krótkie, poprawne merytorycznie wyjaśnienie błędu oraz sposobu jego poprawienia."
      )
    })
  },

  open_code: {
    schema: createTaskSchema("open_code", {
      requirements: {
        type: "array",
        description:
          "Krótkie, mierzalne i jednoznaczne wymagania dla kodu ucznia.",
        minItems: 1,
        items: textSchema(
          "Krótkie, mierzalne wymaganie funkcjonalne."
        )
      },

      expectedCode: textSchema(
        "Czysty przykładowy kod spełniający wszystkie requirements."
      )
    })
  },

  open_explain: {
    schema: createTaskSchema("open_explain", {
      instruction: textSchema(
        "Samodzielne pytanie wymagające odpowiedzi opisowej, bez gotowej odpowiedzi w treści."
      ),

      expectedAnswer: textSchema(
        "Wzorcowa odpowiedź opisowa, która bezpośrednio odpowiada na instruction."
      )
    })
  }
};
