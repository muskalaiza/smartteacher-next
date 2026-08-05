import "server-only"

const CLAIM_STATES = new Set([
  "hit",
  "reserved",
  "in_progress",
])

function assertSupabaseAdmin(
  supabaseAdmin
) {
  if (!supabaseAdmin) {
    throw new Error(
      "Brak serwerowego klienta Supabase dla cache Generatora."
    )
  }
}

function assertNonEmptyString(
  value,
  label
) {
  if (
    typeof value !== "string" ||
    !value.trim()
  ) {
    throw new Error(
      `${label} musi być niepustym tekstem.`
    )
  }
}

function assertClaimData(
  claimData
) {
  if (
    !claimData ||
    typeof claimData !== "object" ||
    Array.isArray(claimData)
  ) {
    throw new Error(
      "Brak danych rezerwacji cache Generatora."
    )
  }

  [
    "ownerId",
    "subjectId",
    "subjectNameSnapshot",
    "topicTitleSnapshot",
    "sourceFileNameSnapshot",
    "materialType",
    "sourceFingerprint",
    "sourceManifestVersion",
    "generationFingerprint",
    "generatorVersion",
    "contentSchemaVersion",
    "model",
  ].forEach((field) =>
    assertNonEmptyString(
      claimData[field],
      field
    )
  )

  const materialType =
    claimData.materialType
      .trim()
      .toLowerCase()

  if (
    materialType ===
    "sprawdzian"
  ) {
    if (
      claimData.lessonTopicId !==
        null ||
      claimData.sourceDocumentId !==
        null
    ) {
      throw new Error(
        "Sprawdzian nie może wskazywać pojedynczego tematu ani dokumentu."
      )
    }
  } else {
    assertNonEmptyString(
      claimData.lessonTopicId,
      "lessonTopicId"
    )

    assertNonEmptyString(
      claimData.sourceDocumentId,
      "sourceDocumentId"
    )
  }

  if (
    ![5, 6, 7].includes(
      claimData.taskCount
    )
  ) {
    throw new Error(
      "taskCount musi mieć wartość 5, 6 albo 7."
    )
  }

  if (
    !Array.isArray(
      claimData.profiles
    ) ||
    claimData.profiles.length === 0
  ) {
    throw new Error(
      "profiles musi być niepustą tablicą."
    )
  }

  if (
    !Array.isArray(
      claimData.taskPlan
    ) ||
    claimData.taskPlan.length !==
      claimData.taskCount
  ) {
    throw new Error(
      "taskPlan musi odpowiadać taskCount."
    )
  }
}

function normalizeClaimResult(
  data
) {
  if (
    !Array.isArray(data) ||
    data.length !== 1
  ) {
    throw new Error(
      "RPC cache Generatora nie zwróciło dokładnie jednego wyniku."
    )
  }

  const row =
    data[0]

  if (
    !CLAIM_STATES.has(
      row.claim_state
    )
  ) {
    throw new Error(
      `RPC cache Generatora zwróciło nieobsługiwany stan: ${
        row.claim_state ||
        "[brak]"
      }.`
    )
  }

  assertNonEmptyString(
    row.generated_material_id,
    "generated_material_id"
  )

  assertNonEmptyString(
    row.claim_started_at,
    "started_at"
  )

  if (
    !Number.isInteger(
      row.claim_access_count
    ) ||
    row.claim_access_count < 1
  ) {
    throw new Error(
      "RPC cache Generatora zwróciło nieprawidłowy access_count."
    )
  }

  if (
    row.claim_state === "hit" &&
    (
      !row.claim_content_json||
      typeof row.claim_content_json !==
        "object" ||
      Array.isArray(
        row.claim_content_json
      )
    )
  ) {
    throw new Error(
      "Cache HIT nie zawiera poprawnego content_json."
    )
  }

  return {
    state:
      row.claim_state,

    generatedMaterialId:
      row.generated_material_id,

    materialStatus:
      row.material_status,

    material:
      row.claim_content_json ??
      null,

    accessCount:
      row.claim_access_count,

    startedAt:
      row.claim_started_at,
  }
}

export async function claimGeneratedMaterial({
  supabaseAdmin,
  claimData,
}) {
  assertSupabaseAdmin(
    supabaseAdmin
  )

  assertClaimData(
    claimData
  )

  const {
    data,
    error,
  } =
    await supabaseAdmin.rpc(
      "claim_generated_material",
      {
        p_owner_id:
          claimData.ownerId,

        p_subject_id:
          claimData.subjectId,

        p_lesson_topic_id:
          claimData.lessonTopicId,

        p_source_document_id:
          claimData.sourceDocumentId,

        p_subject_name_snapshot:
          claimData
            .subjectNameSnapshot,

        p_topic_title_snapshot:
          claimData
            .topicTitleSnapshot,

        p_source_file_name_snapshot:
          claimData
            .sourceFileNameSnapshot,

        p_material_type:
          claimData.materialType,

        p_task_count:
          claimData.taskCount,

        p_profiles:
          claimData.profiles,

        p_task_plan:
          claimData.taskPlan,

        p_source_fingerprint:
          claimData
            .sourceFingerprint,

        p_source_manifest_version:
          claimData
            .sourceManifestVersion,

        p_generation_fingerprint:
          claimData
            .generationFingerprint,

        p_generator_version:
          claimData
            .generatorVersion,

        p_content_schema_version:
          claimData
            .contentSchemaVersion,

        p_model:
          claimData.model,
      }
    )

  if (error) {
    throw new Error(
      `Nie udało się zarezerwować cache Generatora: ${error.message}`
    )
  }

  return normalizeClaimResult(
    data
  )
}

function assertMaterial(
  material
) {
  if (
    !material ||
    typeof material !== "object" ||
    Array.isArray(material)
  ) {
    throw new Error(
      "Materiał zapisywany w cache musi być obiektem."
    )
  }
}

function assertUsage(
  usage
) {
  if (
    !usage ||
    !Number.isInteger(
      usage.promptTokens
    ) ||
    usage.promptTokens < 0 ||
    !Number.isInteger(
      usage.completionTokens
    ) ||
    usage.completionTokens < 0 ||
    !Number.isInteger(
      usage.totalTokens
    ) ||
    usage.totalTokens !==
      usage.promptTokens +
        usage.completionTokens
  ) {
    throw new Error(
      "Nieprawidłowe usage materiału zapisywanego w cache."
    )
  }
}

export async function markGeneratedMaterialReady({
  supabaseAdmin,
  ownerId,
  generatedMaterialId,
  reservationStartedAt,
  material,
  usage,
}) {
  assertSupabaseAdmin(
    supabaseAdmin
  )

  assertNonEmptyString(
    ownerId,
    "ownerId"
  )

  assertNonEmptyString(
    generatedMaterialId,
    "generatedMaterialId"
  )

  assertNonEmptyString(
    reservationStartedAt,
    "reservationStartedAt"
  )

  assertMaterial(
    material
  )

  assertUsage(
    usage
  )

  const now =
    new Date()
      .toISOString()

  const {
    data,
    error,
  } =
    await supabaseAdmin
      .from(
        "generated_materials"
      )
      .update({
        status:
          "ready",

        content_json:
          material,

        error_message:
          null,

        prompt_tokens:
          usage.promptTokens,

        completion_tokens:
          usage.completionTokens,

        total_tokens:
          usage.totalTokens,

        last_accessed_at:
          now,

        completed_at:
          now,
      })
      .eq(
        "id",
        generatedMaterialId
      )
      .eq(
        "owner_id",
        ownerId
      )
      .eq(
        "status",
        "generating"
      )
      .eq(
        "started_at",
        reservationStartedAt
      )
      .select(
        [
          "id",
          "status",
          "content_json",
          "access_count",
          "started_at",
          "completed_at",
        ].join(", ")
      )
      .maybeSingle()

  if (error) {
    throw new Error(
      `Nie udało się zapisać gotowego materiału w cache: ${error.message}`
    )
  }

  if (!data) {
    throw new Error(
      "Rezerwacja cache wygasła przed zapisaniem gotowego materiału."
    )
  }

  return {
    generatedMaterialId:
      data.id,

    status:
      data.status,

    material:
      data.content_json,

    accessCount:
      data.access_count,

    startedAt:
      data.started_at,

    completedAt:
      data.completed_at,
  }
}

export async function markGeneratedMaterialFailed({
  supabaseAdmin,
  ownerId,
  generatedMaterialId,
  reservationStartedAt,
  errorMessage,
}) {
  assertSupabaseAdmin(
    supabaseAdmin
  )

  assertNonEmptyString(
    ownerId,
    "ownerId"
  )

  assertNonEmptyString(
    generatedMaterialId,
    "generatedMaterialId"
  )

  assertNonEmptyString(
    reservationStartedAt,
    "reservationStartedAt"
  )

  const normalizedErrorMessage =
    typeof errorMessage === "string" &&
    errorMessage.trim()
      ? errorMessage
          .trim()
          .slice(0, 4000)
      : "Nieznany błąd Generatora."

  const {
    data,
    error,
  } =
    await supabaseAdmin
      .from(
        "generated_materials"
      )
      .update({
        status:
          "failed",

        content_json:
          null,

        error_message:
          normalizedErrorMessage,

        prompt_tokens:
          null,

        completion_tokens:
          null,

        total_tokens:
          null,

        completed_at:
          new Date()
            .toISOString(),
      })
      .eq(
        "id",
        generatedMaterialId
      )
      .eq(
        "owner_id",
        ownerId
      )
      .eq(
        "status",
        "generating"
      )
      .eq(
        "started_at",
        reservationStartedAt
      )
      .select(
        [
          "id",
          "status",
          "error_message",
          "completed_at",
        ].join(", ")
      )
      .maybeSingle()

  if (error) {
    throw new Error(
      `Nie udało się zapisać błędu Generatora w cache: ${error.message}`
    )
  }

  return data || null
}
