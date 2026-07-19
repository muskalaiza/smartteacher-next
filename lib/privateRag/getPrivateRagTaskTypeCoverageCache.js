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

export async function getPrivateRagTaskTypeCoverageCache({
  supabaseAdmin,
  ownerId,
  subjectId,
  lessonTopicId,
  cacheIdentity,
  coverageVersion,
  evaluationModel,
}) {
  assertCondition(
    supabaseAdmin &&
      typeof supabaseAdmin
        .from === "function",

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
    coverageVersion,
    "coverageVersion"
  )

  assertNonEmptyString(
    evaluationModel,
    "evaluationModel"
  )

  const { data, error } =
    await supabaseAdmin
      .from(
        "private_rag_task_type_coverage_cache"
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
      .match({
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
          evaluationModel,
      })
      .maybeSingle()

  if (error) {
    throw new Error(
      `Nie udało się odczytać cache coverage: ${error.message}`
    )
  }

  if (!data) {
    return {
      status: "miss",
      cacheEntry: null,
    }
  }

  return {
    status: "hit",
    cacheEntry: data,
  }
}
