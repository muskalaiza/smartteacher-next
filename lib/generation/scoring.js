export const TASK_POINTS = {
  closed_single: 1,
  closed_tf: 1,
  match_fill: 2,
  error_find: 2,
  match_pair: 3,
  open_explain: 3,
  open_code: 3,
};

export const GRADE_SCALE = [
  { min: 95, max: 100, grade: "celujący" },
  { min: 85, max: 94, grade: "bardzo dobry" },
  { min: 70, max: 84, grade: "dobry" },
  { min: 55, max: 69, grade: "dostateczny" },
  { min: 40, max: 54, grade: "dopuszczający" },
  { min: 0, max: 39, grade: "niedostateczny" },
];

export function getTaskPoints(task) {
  return TASK_POINTS[task.taskSubtype] ?? 1;
}

export function getScoringCriteria(task) {
  switch (task.taskSubtype) {
    case "error_find":
      return [
        "1 pkt - wskazanie błędu",
        "1 pkt - poprawienie błędu",
      ];

    case "match_pair":
      return [
        "3 pkt - po 1 pkt za każde prawidłowe połączenie",
      ];
      case "match_fill":
        return [
          "2 pkt - po 1 pkt za każde prawidłowe wypełnienie",
        ];

    case "open_code":
      return [
        "1 pkt - poprawna logika / algorytm rozwiązania",
        "1 pkt - poprawna składnia i użycie właściwych konstrukcji",
        "1 pkt - kod daje oczekiwany wynik lub można go logicznie prześledzić",
      ];

    case "open_explain":
      return [
        "1 pkt - poprawne użycie pojęć",
        "1 pkt - logiczne wyjaśnienie krok po kroku",
        "1 pkt - poprawny przykład, wniosek lub odniesienie do działania kodu/algorytmu",
      ];

    default:
      return [`${getTaskPoints(task)} pkt - za poprawną odpowiedź`];
  }
}

// funkcja do obliczania łącznej punktacji z listy zadań

export function calculateTotalPoints(tasks = []) {
  return tasks.reduce((sum, task) => sum + getTaskPoints(task), 0);
}

export function renderScoringCriteria(task) {
  const criteria = getScoringCriteria(task);

  let text = `**Punktacja:**\n`;

  criteria.forEach((criterion) => {
    text += `- ${criterion}\n`;
  });

  return text + `\n`;
}
export function renderGradeScale() {
  let text = `### Proponowana skala ocen\n\n`;

  GRADE_SCALE.forEach((item) => {
    text += `- ${item.min}-${item.max}% — ${item.grade}\n`;
  });

  return text + `\n`;
}
