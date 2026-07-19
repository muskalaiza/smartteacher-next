function assertCondition(
  condition,
  message
) {
  if (!condition) {
    throw new Error(message)
  }
}

function assertNonEmptyString(
  value,
  label
) {
  assertCondition(
    typeof value === "string" &&
      value.trim(),

    `${label} musi być niepustym tekstem.`
  )
}

function normalizeTokenCount(
  value,
  label
) {
  if (value === null || value === undefined) {
    return null
  }

  assertCondition(
    Number.isInteger(value) &&
      value >= 0,

    `${label} musi być nieujemną liczbą całkowitą albo null.`
  )

  return value
}

export async function savePrivateRagTaskTypeCoverageCache({
  supabaseAdmin,
  ownerId,
  subjectId,
  lessonTopicId,
  cacheIdentity,
  coverageVersion,
  coverageResult,
}) {
  assertCondition(
    supabaseAdmin &&
      typeof supabaseAdmin.from ===
        "function",

    "Brak prawidłowego klienta Supabase."
  )

  assertNonEmptyString(
    ownerId,
    "ownerId"
  )

  assertNonEmptyString(
    subjectId,
    "subjectId"
  )

  assertNonEmptyString(
    lessonTopicId,
    "lessonTopicId"
  )

  assertCondition(
    cacheIdentity &&
      typeof cacheIdentity ===
        "object" &&
      !Array.isArray(
        cacheIdentity
      ),

    "Brak prawidłowej tożsamości cache."
  )

  assertNonEmptyString(
    cacheIdentity.sourceFingerprint,
    "sourceFingerprint"
  )

  assertNonEmptyString(
    cacheIdentity.retrievalQuery,
    "retrievalQuery"
  )

  assertCondition(
    Array.isArray(
      cacheIdentity.sourceRefs
    ) &&
      cacheIdentity.sourceRefs.length >
        0,

    "Cache identity nie zawiera sourceRefs."
  )

  assertCondition(
    Number.isInteger(
      cacheIdentity.sourceCount
    ) &&
      cacheIdentity.sourceCount ===
        cacheIdentity.sourceRefs.length,

    "sourceCount nie odpowiada liczbie sourceRefs."
  )

  assertNonEmptyString(
    coverageVersion,
    "coverageVersion"
  )

  assertCondition(
    coverageResult &&
      typeof coverageResult ===
        "object" &&
      !Array.isArray(
        coverageResult
      ),

    "Brak prawidłowego wyniku coverage."
  )

  assertCondition(
    coverageResult.status ===
      "assessed",

    "Do cache można zapisać tylko wynik coverage ze statusem assessed."
  )

  assertNonEmptyString(
    coverageResult.evaluationModel,
    "evaluationModel"
  )

  assertCondition(
    coverageResult.assessments &&
      typeof coverageResult
        .assessments === "object" &&
      !Array.isArray(
        coverageResult.assessments
      ),

    "Wynik coverage nie zawiera assessments."
  )

  const usage =
    coverageResult.usage || {}

  const row = {
    owner_id:
      ownerId,

    subject_id:
      subjectId,

    lesson_topic_id:
      lessonTopicId,

    source_fingerprint:
      cacheIdentity
        .sourceFingerprint,

    coverage_version:
      coverageVersion,

    evaluation_model:
      coverageResult
        .evaluationModel,

    retrieval_query:
      cacheIdentity
        .retrievalQuery,

    source_refs:
      cacheIdentity
        .sourceRefs,

    source_count:
      cacheIdentity
        .sourceCount,

    assessments:
      coverageResult
        .assessments,

    prompt_tokens:
      normalizeTokenCount(
        usage.promptTokens,
        "promptTokens"
      ),

    completion_tokens:
      normalizeTokenCount(
        usage.completionTokens,
        "completionTokens"
      ),

    total_tokens:
      normalizeTokenCount(
        usage.totalTokens,
        "totalTokens"
      ),

    updated_at:
      new Date().toISOString(),
  }

  const { data, error } =
    await supabaseAdmin
      .from(
        "private_rag_task_type_coverage_cache"
      )
      .upsert(
        row,
        {
          onConflict: [
            "owner_id",
            "subject_id",
            "lesson_topic_id",
            "source_fingerprint",
            "coverage_version",
            "evaluation_model",
          ].join(","),
        }
      )
      .select(
        [
          "id",
          "owner_id",
          "subject_id",
          "lesson_topic_id",
          "source_fingerprint",
          "coverage_version",
          "evaluation_model",
          "retrieval_query",
          "source_refs",
          "source_count",
          "assessments",
          "prompt_tokens",
          "completion_tokens",
          "total_tokens",
          "created_at",
          "updated_at",
        ].join(", ")
      )
      .single()

  if (error) {
    throw new Error(
      `Nie udało się zapisać cache coverage: ${error.message}`
    )
  }

  return {
    status: "saved",
    cacheEntry: data,
  }
}
