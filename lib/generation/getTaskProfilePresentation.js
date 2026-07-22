const ADHD_RENDER_POLICY = {
  "karta pracy": {
    showFocus: true,
    showSteps: true,
    showCheckpoint: true,
  },

  "kartkówka": {
    showFocus: true,
    showSteps: true,
    showCheckpoint: false,
  },

  "sprawdzian": {
    showFocus: true,
    showSteps: true,
    showCheckpoint: false,
  },
};

const ASD_OBJECTIVES = {
  closed_single: "Wybranie poprawnej odpowiedzi.",

  closed_tf:
    "Ocenienie, czy zdanie jest prawdziwe, czy fałszywe.",

  match_fill:
    "Uzupełnienie brakujących elementów.",

  match_pair:
    "Dopasowanie elementów do opisów.",

  error_find:
    "Znalezienie i poprawienie błędu.",

  open_code:
    "Napisanie kodu zgodnie z wymaganiami.",

  open_explain:
    "Wyjaśnienie działania podanego kontekstu.",
};

const ASD_ANSWER_HINTS = {
  closed_single:
    "Zaznacz kółkiem wybraną literę.",

  closed_tf:
    "Zaznacz kółkiem: Prawda albo Fałsz.",

  match_fill:
    "Wpisz odpowiednie elementy w luki.",

  match_pair:
    "Połącz pary, np. 1-A, 2-B, 3-C.",
};

const EMPTY_PRESENTATION = Object.freeze({
  objective: null,
  plan: null,
  answerHint: null,
});

export function getTaskProfilePresentation({
  task,
  profileValue,
  materialTypeValue,
}) {
  if (profileValue === "ADHD") {
    const normalizedMaterialType =
      String(materialTypeValue || "").toLowerCase();

    const policy =
      ADHD_RENDER_POLICY[normalizedMaterialType];

    if (!policy) {
      throw new Error(
        `Brak polityki ADHD dla typu materiału: ${
          materialTypeValue || "[brak]"
        }.`
      );
    }

    const support = task?.adhdSupport;

    if (!support) {
      throw new Error(
        `Brak adhdSupport dla zadania ${
          task?.number || "[brak numeru]"
        }.`
      );
    }

    return {
      objective: null,

      plan: {
        focus: policy.showFocus
          ? support.focus
          : null,

        steps: policy.showSteps
          ? support.steps
          : [],

        checkpoint: policy.showCheckpoint
          ? support.checkpoint
          : null,
      },

      answerHint: null,
    };
  }

  if (profileValue === "ASD") {
    const objective =
      ASD_OBJECTIVES[task?.taskSubtype];

    if (!objective) {
      throw new Error(
        `Brak celu ASD dla typu zadania: ${
          task?.taskSubtype || "[brak]"
        }.`
      );
    }

    return {
      objective,
      plan: null,
      answerHint:
        ASD_ANSWER_HINTS[task.taskSubtype] ||
        null,
    };
  }

  return EMPTY_PRESENTATION;
}
