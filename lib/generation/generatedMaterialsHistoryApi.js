import "client-only";

import {
  getCurrentUserId,
  isUuid,
} from "@/lib/api/clientApiHelpers";

import {
  isKnownMaterialType,
  isMaterialContentSchemaVersionSupported,
} from "@/lib/generation/materialContracts";

import {
  parseGeneratedMaterial,
} from "@/lib/generation/parseGeneratedMaterial";

export const GENERATED_MATERIALS_HISTORY_PAGE_SIZE = 50;

function assertSupabaseClient(supabase) {
  if (!supabase || typeof supabase.from !== "function") {
    throw new Error("Brak klienta Supabase dla Historii Generowań.");
  }
}

function assertSubjectId(subjectId) {
  if (!isUuid(subjectId)) {
    throw new Error("Nie udało się ustalić aktywnego przedmiotu.");
  }
}

function assertMaterialTypeFilter(materialType) {
  if (
    materialType !== "all" &&
    !isKnownMaterialType(materialType)
  ) {
    throw new Error("Nieprawidłowy filtr typu materiału.");
  }
}

function assertPagination({ offset, limit }) {
  if (!Number.isInteger(offset) || offset < 0) {
    throw new Error("Nieprawidłowa pozycja listy Historii Generowań.");
  }

  if (
    !Number.isInteger(limit) ||
    limit < 1 ||
    limit > GENERATED_MATERIALS_HISTORY_PAGE_SIZE
  ) {
    throw new Error("Nieprawidłowy rozmiar strony Historii Generowań.");
  }
}

export async function listGeneratedMaterialsHistory({
  supabase,
  subjectId,
  materialType = "all",
  offset = 0,
  limit = GENERATED_MATERIALS_HISTORY_PAGE_SIZE,
}) {
  assertSupabaseClient(supabase);
  assertSubjectId(subjectId);
  assertMaterialTypeFilter(materialType);
  assertPagination({ offset, limit });

  const userId = await getCurrentUserId(supabase);

  let query = supabase
    .from("generated_materials")
    .select(
      [
        "id",
        "subject_id",
        "subject_name_snapshot",
        "topic_title_snapshot",
        "material_type",
        "task_count",
        "profiles",
        "access_count",
        "last_accessed_at",
        "content_schema_version",
        "created_at",
      ].join(", ")
    )
    .eq("owner_id", userId)
    .eq("subject_id", subjectId)
    .eq("status", "ready")
    .order("last_accessed_at", { ascending: false })
    .order("id", { ascending: false });

  if (materialType !== "all") {
    query = query.eq("material_type", materialType);
  }

  const { data, error } = await query.range(offset, offset + limit);

  if (error) {
    throw new Error("Nie udało się pobrać Historii Generowań.");
  }

  const rows = Array.isArray(data) ? data : [];

  return {
    items: rows.slice(0, limit),
    hasMore: rows.length > limit,
  };
}

export async function getGeneratedMaterialFromHistory({
  supabase,
  subjectId,
  generatedMaterialId,
}) {
  assertSupabaseClient(supabase);
  assertSubjectId(subjectId);

  if (!isUuid(generatedMaterialId)) {
    throw new Error("Nieprawidłowy identyfikator materiału.");
  }

  const userId = await getCurrentUserId(supabase);

  const { data, error } = await supabase
    .from("generated_materials")
    .select(
      [
        "id",
        "subject_id",
        "subject_name_snapshot",
        "topic_title_snapshot",
        "material_type",
        "task_count",
        "profiles",
        "task_plan",
        "access_count",
        "last_accessed_at",
        "content_schema_version",
        "content_json",
        "created_at",
      ].join(", ")
    )
    .eq("id", generatedMaterialId)
    .eq("owner_id", userId)
    .eq("subject_id", subjectId)
    .eq("status", "ready")
    .maybeSingle();

  if (error) {
    throw new Error("Nie udało się otworzyć zapisanego materiału.");
  }

  if (!data) {
    throw new Error(
      "Nie znaleziono materiału w historii tego przedmiotu."
    );
  }

  if (
    !isMaterialContentSchemaVersionSupported({
      materialType: data.material_type,
      contentSchemaVersion: data.content_schema_version,
    })
  ) {
    throw new Error(
      "Ten materiał został zapisany w nieobsługiwanej wersji i nie może zostać otwarty."
    );
  }

  if (!isKnownMaterialType(data.material_type)) {
    throw new Error("Materiał ma nieobsługiwany typ.");
  }

  if (
    !Array.isArray(data.profiles) ||
    data.profiles.length === 0 ||
    data.profiles.some(
      (profile) => typeof profile !== "string" || !profile.trim()
    )
  ) {
    throw new Error("Materiał nie zawiera poprawnej listy profili.");
  }

  const shouldGenerateGlossary =
    data.material_type === "karta pracy" &&
    data.profiles.includes("Obcojęzyczny");

  let normalizedContentJson;

  try {
    normalizedContentJson = parseGeneratedMaterial(
      JSON.stringify(data.content_json),
      {
        materialType: data.material_type,
        taskPlan: data.task_plan,
        shouldGenerateGlossary,
      }
    );
  } catch {
    throw new Error("Zapisany materiał ma nieprawidłową strukturę treści.");
  }

  if (normalizedContentJson.tasks.length !== data.task_count) {
    throw new Error("Zapisany materiał ma nieprawidłową liczbę zadań.");
  }

  return {
    ...data,
    content_json: normalizedContentJson,
  };
}
