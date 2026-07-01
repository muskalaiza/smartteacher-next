
 /* =========================
   STAŁE POMOCNICZE (Wsparcie profili)
========================= */

const ADHD_RENDER_POLICY = {
  "karta pracy": {
    showFocus: true,
    showSteps: true,
    showCheckpoint: true
  },

  "kartkówka": {
    showFocus: true,
    showSteps: true,
    showCheckpoint: false
  },

  "sprawdzian": {
    showFocus: true,
    showSteps: true,
    showCheckpoint: false
  }
};

const ASD_RENDER_POLICY = {
  "karta pracy": {
    showObjective: true,  
  },

  "kartkówka": {
    showObjective: true, 
  },

  "sprawdzian": {
    showObjective: true,  
  }
};

/*
  Profil ASD nadal otrzymuje krótki, neutralny cel zadania.

  Cele zostały oddzielone od wsparcia ADHD, ponieważ profil ADHD
  korzysta teraz z merytorycznego pola task.adhdSupport.
*/
const ASD_OBJECTIVES = {
  closed_single: "Wybranie poprawnej odpowiedzi.",

  closed_tf:
    "Ocenienie, czy zdanie jest prawdziwe, czy fałszywe.",

  match_fill:
    "Uzupełnienie brakującego elementu.",

  match_pair:
    "Dopasowanie elementów do opisów.",

  error_find:
    "Znajdowanie i poprawianie błędów.",

  open_code:
    "Napisanie krótkiego kodu zgodnie z wymaganiami.",

  open_explain:
    "Wyjaśnienie działania podanego fragmentu kodu."
};

/* =========================
   WSPARCIE PROFILOWE
========================= */

export function renderProfileSupport(task, profile, type) {
  const normalizedType = String(type || "").toLowerCase();

  /* =========================
     PROFIL ADHD
  ========================= */

  if (profile === "ADHD") {
    const policy = ADHD_RENDER_POLICY[normalizedType];
    const support = task?.adhdSupport;

    /*
      Parser odpowiada za walidację adhdSupport.

      Jeśli parser ustawił null, renderer nie tworzy żadnego
      ogólnego wsparcia zastępczego.
    */
    if (!policy || !support) return "";

    let text = `**PLAN DZIAŁANIA**\n\n`;

    if (policy.showFocus) {
      text += `${support.focus}\n\n`;
    }

    if (policy.showSteps) {
      support.steps.forEach((step, index) => {
        text += `${index + 1}. ${step}\n`;
      });

      text += `\n`;
    }

    if (policy.showCheckpoint) {
      text += `⚠ **SPRAWDŹ:** ${support.checkpoint}\n\n`;
    }

    return text;
  }

  /* =========================
     PROFIL ASD
  ========================= */

  if (profile === "ASD") {
    const policy = ASD_RENDER_POLICY[normalizedType];
    const objective = ASD_OBJECTIVES[task?.taskSubtype];

    if (!policy || !policy.showObjective || !objective) {
      return "";
    }

    return `*Cel zadania:* ${objective}\n\n`;
  }

  return "";
}

/* =========================
   SŁOWNICZEK
========================= */

// Renderuje słowniczek dla uczniów obcojęzycznych,
// jeśli została wybrana karta pracy.
export function renderGlossary(glossary) {
  if (!Array.isArray(glossary) || glossary.length === 0) {
    return "";
  }

  let text = `### SŁOWNICZEK\n\n`;

  glossary.forEach((item) => {
    if (!item) return;

    const term = String(item.term || "").trim();
    const translation = String(item.translation || "").trim();
    const explanation = String(item.explanation || "").trim();

    if (!term) return;

    text += `- **${term}**`;

    if (translation) {
      text += ` — ${translation}`;
    }

    if (explanation) {
      text += `: ${explanation}`;
    }

    text += `\n`;
  });

  return text + "\n";
}

/* =========================
   MINI-ŚCIĄGAWKA
========================= */

// Renderuje mini-ściągawkę dla karty pracy,
// jeśli została wygenerowana.
export function renderTip(tip) {
  if (!Array.isArray(tip) || tip.length === 0) {
    return "";
  }

  let text = `### Mini-ściągawka\n\n`;

  tip.forEach((item) => {
    if (item.title) {
      text += `**${item.title}:** `;
    }

    if (item.text) {
      text += `${item.text}\n`;
    }

    if (item.code) {
      text += `\n\`\`\`\n${item.code}\n\`\`\`\n`;
    }

    text += `\n`;
  });

  return text;
}