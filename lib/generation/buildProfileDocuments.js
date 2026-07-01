import {
  renderProfileSupport,
  renderGlossary,
  renderTip
} from "./profileRenderers";

import {
  getTaskPoints,
  renderScoringCriteria,
  calculateTotalPoints,
  renderGradeScale
} from "./scoring";

/* 5. SKŁADANIE DOKUMENTÓW Z PODZIAŁEM NA PROFILE */

export function buildProfileDocuments({
  profiles,
  parsedTasks,
  type,
  isKartaPracy,
  intro,
  tip,
  glossary
}) {
  return profiles.map((profile) => {
    let studentHeader = "";
    const studentTaskBlocks = [];
    let teacherText = "";

    if (isKartaPracy) {
      studentHeader += `### Wstęp\n${intro || ""}\n\n`;
      studentHeader += renderTip(tip);

      if (profile === "Obcojęzyczny" && glossary) {
        studentHeader += renderGlossary(glossary);
      }
    }

    studentHeader += "### Zadania dla ucznia\n\n";

    parsedTasks.forEach((task, index) => {
      const taskNum = index + 1;
      const taskPoints = getTaskPoints(task);

      let studentText = `#### Zadanie ${taskNum}\n`;
      teacherText += `#### Zadanie ${taskNum} (${taskPoints} pkt)\n`;

      const isASD = profile === "ASD";
      const isADHD = profile === "ADHD";
      const profileSupport = renderProfileSupport(task, profile, type);

      // Profil ASD zachowuje cel bezpośrednio pod nagłówkiem zadania.
      if (isASD) {
        studentText += profileSupport;
      }

      // 1. TYP: closed_single (Wybór A/B/C)
      if (task.taskSubtype === "closed_single") {
        if (isASD) {
          studentText += `**ZADANIE:**\n${
            task.question || "Wybierz poprawną odpowiedź."
          }\n\n`;

          (task.options || []).forEach((opt) => {
            studentText += `${opt.id}) ${opt.text}\n\n`;
          });

          studentText +=
            `\n**ODPOWIEDŹ:**\n` +
            `[Zaznacz kółkiem wybraną literę.]\n\n`;
        } else {
          studentText += `${task.question}\n\n`;

          (task.options || []).forEach((opt) => {
            studentText += `${opt.id}) ${opt.text}\n\n`;
          });

          if (isADHD) {
            studentText += profileSupport;
          }
        }

        teacherText +=
          `**Poprawna odpowiedź:** ${task.correctAnswer}\n\n` +
          `**Wyjaśnienie:** ${task.answerExplanation}\n\n`;
      }

      // 2. TYP: closed_tf (Prawda / Fałsz)
      else if (task.taskSubtype === "closed_tf") {
        if (isASD) {
          studentText += `**ZADANIE:**\n${task.statement}\n\n`;
          studentText +=
            `**ODPOWIEDŹ:**\n` +
            `[Zaznacz kółkiem: Prawda/Fałsz]\n\n`;
        } else {
          studentText += `${task.statement}\n\n`;
          studentText += `Prawda / Fałsz\n\n`;

          if (isADHD) {
            studentText += profileSupport;
          }
        }

        teacherText +=
          `**Poprawna odpowiedź:** ${
            task.correctAnswer ? "Prawda" : "Fałsz"
          }\n\n` +
          `**Wyjaśnienie:** ${task.answerExplanation}\n\n`;
      }

// 3. TYP: match_fill (Uzupełnianie luk)
else if (task.taskSubtype === "match_fill") {
  const hints = Array.isArray(task.hints) ? task.hints : [];
  const correctAnswers = Array.isArray(task.correctAnswers)
    ? task.correctAnswers
    : [];

  const instructionText =
    "Uzupełnij luki korzystając z podpowiedzi.";

  const hintLabels = ["A", "B", "C", "D"];

  if (isASD) {
    studentText += `**ZADANIE:** ${task.question}\n\n`;
  } else {
    studentText += `**Zadanie:** ${instructionText}\n\n`;
    studentText += `${task.question}\n\n`;
  }

  if (hints.length > 0) {
    studentText += `**Podpowiedzi:** \n`;

    hints.forEach((hint, hintIndex) => {
      const label = hintLabels[hintIndex] || `${hintIndex + 1}`;
      studentText += `${label}) ${hint} \n`;
    });

    studentText += `\n`;
  }

  if (isADHD) {
    studentText += profileSupport;
  }

  if (isASD) {
    studentText +=
      `**ODPOWIEDŹ:**\n` +
      `[Wpisz brakujące słowa lub znaki w odpowiednie luki]\n\n`;
  }

  teacherText +=
    `**Wpisz w luki:** ${correctAnswers.join(", ")}\n\n` +
    `**Wyjaśnienie:** ${task.answerExplanation}\n\n`;
}

      // 4. TYP: match_pair (Łączenie w pary)
      else if (task.taskSubtype === "match_pair") {
        const instructionText =
          task.instruction ||
          "Połącz elementy z ich opisami rysując linie, np. 1-A, 2-B, 3-C.";

        if (isASD) {
          studentText += `**ZADANIE:**\n${instructionText}\n\n`;
        } else {
          studentText += `${instructionText}\n\n`;
        }

studentText += `Elementy:\n\n`;

(task.leftItems || []).forEach((item) => {
  studentText += `${item.id}. ${item.text}\n`;
});

studentText += `\nOpisy: \n`;

(task.rightItems || []).forEach((item) => {
  studentText += `${item.id}) ${item.text} \n`;
});

studentText += `\n`;

        if (isADHD) {
          studentText += profileSupport;
        }

        if (isASD) {
          studentText +=
            `\n**ODPOWIEDŹ:**\n` +
            `[Połącz dopasowane pary, np. 1-A, 2-B, 3-C]\n\n`;
        }

        teacherText += `**Poprawne pary:**\n`;

        (task.correctPairs || []).forEach((pair) => {
          teacherText += `- ${pair.leftId} — ${pair.rightId}\n\n`;
        });

        teacherText +=
          `**Wyjaśnienie:** ${task.answerExplanation}\n\n`;
      }

      // 5. TYP: error_find (Znajdowanie błędu)
      else if (task.taskSubtype === "error_find") {
        const answerLines =
          "\n*Tu wpisz poprawioną linię kodu lub poprawiony fragment*\n\n" +
          ".........................................................................................................................................\n\n" +
          ".........................................................................................................................................\n\n" +
          ".........................................................................................................................................\n\n";

        if (isASD) {
          studentText +=
            `**WEJŚCIE:**\n` +
            `\`\`\`cpp\n${task.codeWithError}\n\`\`\`\n\n`;

          studentText +=
            `**ZADANIE:**\n` +
            `${task.instruction || "Znajdź i popraw błąd w kodzie."}\n`;

          studentText += answerLines;
        } else {
          studentText +=
            `${task.instruction || "Znajdź i popraw błąd w kodzie."}\n\n`;

          studentText +=
            `\`\`\`cpp\n${task.codeWithError}\n\`\`\`\n`;

          if (isADHD) {
            studentText += profileSupport;
          }

          studentText += answerLines;
        }

        teacherText +=
          `**Poprawny kod:**\n` +
          `\`\`\`cpp\n${task.expectedCode || task.correctedCode}\n\`\`\`\n`;

        teacherText +=
          `**Wyjaśnienie błędu:** ${
            task.answerExplanation || task.errorExplanation
          }\n\n`;
      }

      // 6. TYP: open_code (Pisanie kodu od zera)
      else if (task.taskSubtype === "open_code") {
        const answerLines =
          "\n*Tu wpisz rozwiązanie*\n\n" +
          ".........................................................................................................................................\n\n" +
          ".........................................................................................................................................\n\n" +
          ".........................................................................................................................................\n\n";

        if (isASD) {
          studentText += `**ZADANIE:**\n${task.question}\n\n`;
          studentText += `**WYMAGANIA:**\n`;

          (task.requirements || []).forEach((reqLine) => {
            studentText += `- ${reqLine}\n`;
          });

          studentText += answerLines;
        } else {
          studentText += `${task.question}\n\n`;
          studentText += `Wymagania:\n`;

          (task.requirements || []).forEach((reqLine) => {
            studentText += `- ${reqLine}\n`;
          });

          studentText += `\n`;

          if (isADHD) {
            studentText += profileSupport;
          }

          studentText += answerLines;
        }

        teacherText +=
          `**Wzorcowe rozwiązanie:**\n` +
          `\`\`\`cpp\n${task.expectedCode}\n\`\`\`\n\n` +
          `**Wyjaśnienie:** ${task.answerExplanation}\n\n`;
      }

      // 7. TYP: open_explain (Analiza i opis słowny)
      else if (task.taskSubtype === "open_explain") {
        const answerLines =
          "\n*Tu wpisz wyjaśnienie własnymi słowami*\n\n" +
          ".........................................................................................................................................\n\n" +
          ".........................................................................................................................................\n\n" +
          ".........................................................................................................................................\n\n";

        if (isASD) {
          studentText +=
            `**WEJŚCIE:**\n` +
            `\`\`\`cpp\n${task.context}\n\`\`\`\n\n`;

          studentText += `**ZADANIE:**\n${task.question}\n`;
          studentText += answerLines;
        } else {
          studentText += `${task.question}\n\n`;
          studentText +=
            `\`\`\`cpp\n${task.context}\n\`\`\`\n`;

          if (isADHD) {
            studentText += profileSupport;
          }

          studentText += answerLines;
        }

        teacherText +=
          `**Oczekiwana odpowiedź:** ${task.expectedAnswer}\n\n` +
          `**Wyjaśnienie merytoryczne:** ${task.answerExplanation}\n\n`;
      }

      teacherText += renderScoringCriteria(task);

      studentTaskBlocks.push(studentText);
    });

    const totalPoints = calculateTotalPoints(parsedTasks);

    teacherText += `---\n\n`;
    teacherText += `### Podsumowanie punktacji\n\n`;
    teacherText += `**Suma punktów:** ${totalPoints} pkt\n\n`;
    teacherText += renderGradeScale();

  return {
    profile,
    studentHeader,
    studentTaskBlocks,
    studentView: `${studentHeader}${studentTaskBlocks.join("")}`,
    teacherView: teacherText
    };
});
}
