export const TEACHER_GRADE_SCALE_SCHEMA_VERSION =
  "teacher_grade_scale_v1";

export const DEFAULT_TEACHER_GRADE_THRESHOLDS = {
  grade2Min: 40,
  grade3Min: 55,
  grade4Min: 70,
  grade5Min: 85,
  grade6Min: 95,
};

export const TEACHER_GRADE_DEFINITIONS = [
  { grade: 1, label: "niedostateczny" },
  { grade: 2, label: "dopuszczający" },
  { grade: 3, label: "dostateczny" },
  { grade: 4, label: "dobry" },
  { grade: 5, label: "bardzo dobry" },
  { grade: 6, label: "celujący" },
];

const THRESHOLD_KEYS = [
  "grade2Min",
  "grade3Min",
  "grade4Min",
  "grade5Min",
  "grade6Min",
];

function assertPlainObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Skala ocen ma nieprawidłową strukturę.");
  }
}

export function validateTeacherGradeScaleThresholds(value) {
  assertPlainObject(value);

  const normalized = {};

  THRESHOLD_KEYS.forEach((key) => {
    const threshold = Number(value[key]);

    if (!Number.isInteger(threshold)) {
      throw new Error("Progi ocen muszą być liczbami całkowitymi.");
    }

    if (threshold < 1 || threshold > 100) {
      throw new Error("Każdy próg oceny musi mieścić się w zakresie 1–100%.");
    }

    normalized[key] = threshold;
  });

  for (let index = 1; index < THRESHOLD_KEYS.length; index += 1) {
    const previousKey = THRESHOLD_KEYS[index - 1];
    const currentKey = THRESHOLD_KEYS[index];

    if (normalized[currentKey] <= normalized[previousKey]) {
      throw new Error(
        "Każdy kolejny próg oceny musi być wyższy od poprzedniego."
      );
    }
  }

  return normalized;
}

export function buildTeacherGradeScaleRanges(value) {
  const thresholds = validateTeacherGradeScaleThresholds(value);

  const minimums = [
    0,
    thresholds.grade2Min,
    thresholds.grade3Min,
    thresholds.grade4Min,
    thresholds.grade5Min,
    thresholds.grade6Min,
  ];

  return TEACHER_GRADE_DEFINITIONS.map((definition, index) => ({
    ...definition,
    min: minimums[index],
    max:
      index === TEACHER_GRADE_DEFINITIONS.length - 1
        ? 100
        : minimums[index + 1] - 1,
  }));
}

export function mapTeacherGradeScaleRow(row) {
  if (!row) {
    return null;
  }

  const thresholds = validateTeacherGradeScaleThresholds({
    grade2Min: row.grade_2_min,
    grade3Min: row.grade_3_min,
    grade4Min: row.grade_4_min,
    grade5Min: row.grade_5_min,
    grade6Min: row.grade_6_min,
  });

  if (
    row.scale_schema_version !==
    TEACHER_GRADE_SCALE_SCHEMA_VERSION
  ) {
    throw new Error("Skala ocen ma nieobsługiwaną wersję.");
  }

  return {
    ...thresholds,
    schemaVersion: row.scale_schema_version,
    updatedAt: row.updated_at || null,
  };
}
