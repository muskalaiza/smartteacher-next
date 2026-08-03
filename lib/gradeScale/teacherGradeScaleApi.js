import "client-only";

import { getCurrentUserId } from "@/lib/api/clientApiHelpers";
import {
  mapTeacherGradeScaleRow,
  TEACHER_GRADE_SCALE_SCHEMA_VERSION,
  validateTeacherGradeScaleThresholds,
} from "@/lib/gradeScale/teacherGradeScale";

const SELECT_COLUMNS = [
  "owner_id",
  "grade_2_min",
  "grade_3_min",
  "grade_4_min",
  "grade_5_min",
  "grade_6_min",
  "scale_schema_version",
  "updated_at",
].join(", ");

function assertSupabaseClient(supabase) {
  if (!supabase || typeof supabase.from !== "function") {
    throw new Error("Brak klienta Supabase dla skali ocen.");
  }
}

export async function getTeacherGradeScale({ supabase }) {
  assertSupabaseClient(supabase);

  const userId = await getCurrentUserId(supabase);

  const { data, error } = await supabase
    .from("teacher_grade_scales")
    .select(SELECT_COLUMNS)
    .eq("owner_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error("Nie udało się pobrać skali ocen nauczyciela.");
  }

  return mapTeacherGradeScaleRow(data);
}

export async function saveTeacherGradeScale({
  supabase,
  thresholds,
}) {
  assertSupabaseClient(supabase);

  const userId = await getCurrentUserId(supabase);
  const normalized = validateTeacherGradeScaleThresholds(thresholds);

  const { data, error } = await supabase
    .from("teacher_grade_scales")
    .upsert(
      {
        owner_id: userId,
        grade_2_min: normalized.grade2Min,
        grade_3_min: normalized.grade3Min,
        grade_4_min: normalized.grade4Min,
        grade_5_min: normalized.grade5Min,
        grade_6_min: normalized.grade6Min,
        scale_schema_version:
          TEACHER_GRADE_SCALE_SCHEMA_VERSION,
      },
      { onConflict: "owner_id" }
    )
    .select(SELECT_COLUMNS)
    .single();

  if (error) {
    throw new Error("Nie udało się zapisać skali ocen nauczyciela.");
  }

  return mapTeacherGradeScaleRow(data);
}
