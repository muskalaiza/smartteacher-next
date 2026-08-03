import assert from "node:assert/strict";

import {
  buildTeacherGradeScaleRanges,
  DEFAULT_TEACHER_GRADE_THRESHOLDS,
  mapTeacherGradeScaleRow,
  validateTeacherGradeScaleThresholds,
} from "../lib/gradeScale/teacherGradeScale.js";

const normalized = validateTeacherGradeScaleThresholds(
  DEFAULT_TEACHER_GRADE_THRESHOLDS
);

assert.deepEqual(normalized, {
  grade2Min: 40,
  grade3Min: 55,
  grade4Min: 70,
  grade5Min: 85,
  grade6Min: 95,
});

assert.deepEqual(
  buildTeacherGradeScaleRanges(DEFAULT_TEACHER_GRADE_THRESHOLDS),
  [
    { grade: 1, label: "niedostateczny", min: 0, max: 39 },
    { grade: 2, label: "dopuszczający", min: 40, max: 54 },
    { grade: 3, label: "dostateczny", min: 55, max: 69 },
    { grade: 4, label: "dobry", min: 70, max: 84 },
    { grade: 5, label: "bardzo dobry", min: 85, max: 94 },
    { grade: 6, label: "celujący", min: 95, max: 100 },
  ]
);


assert.deepEqual(
  mapTeacherGradeScaleRow({
    grade_2_min: 40,
    grade_3_min: 55,
    grade_4_min: 70,
    grade_5_min: 85,
    grade_6_min: 95,
    scale_schema_version: "teacher_grade_scale_v1",
    updated_at: "2026-08-03T10:00:00.000Z",
  }),
  {
    grade2Min: 40,
    grade3Min: 55,
    grade4Min: 70,
    grade5Min: 85,
    grade6Min: 95,
    schemaVersion: "teacher_grade_scale_v1",
    updatedAt: "2026-08-03T10:00:00.000Z",
  }
);

assert.throws(
  () =>
    mapTeacherGradeScaleRow({
      grade_2_min: 40,
      grade_3_min: 55,
      grade_4_min: 70,
      grade_5_min: 85,
      grade_6_min: 95,
      scale_schema_version: "teacher_grade_scale_v2",
      updated_at: null,
    }),
  /nieobsługiwaną wersję/
);

assert.throws(
  () =>
    validateTeacherGradeScaleThresholds({
      ...DEFAULT_TEACHER_GRADE_THRESHOLDS,
      grade2Min: 40.5,
    }),
  /liczbami całkowitymi/
);

assert.throws(
  () =>
    validateTeacherGradeScaleThresholds({
      ...DEFAULT_TEACHER_GRADE_THRESHOLDS,
      grade2Min: 0,
    }),
  /1–100%/
);

assert.throws(
  () =>
    validateTeacherGradeScaleThresholds({
      ...DEFAULT_TEACHER_GRADE_THRESHOLDS,
      grade3Min: 40,
    }),
  /wyższy od poprzedniego/
);

assert.throws(
  () =>
    validateTeacherGradeScaleThresholds({
      ...DEFAULT_TEACHER_GRADE_THRESHOLDS,
      grade6Min: 101,
    }),
  /1–100%/
);

console.log("Teacher grade scale tests passed.");
