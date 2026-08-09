import "server-only";

const OPERATIONS = new Set([
  "material_generation",
  "document_embedding",
]);

const STATUSES = new Set([
  "succeeded",
  "failed",
]);

function assertSupabaseAdmin(
  supabaseAdmin
) {
  if (
    !supabaseAdmin ||
    typeof supabaseAdmin.from !==
      "function"
  ) {
    throw new Error(
      "Brak serwerowego klienta Supabase dla rejestru użycia AI."
    );
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
    );
  }
}

function normalizeOptionalToken(
  value,
  label
) {
  if (
    value === null ||
    value === undefined
  ) {
    return null;
  }

  if (
    !Number.isInteger(value) ||
    value < 0
  ) {
    throw new Error(
      `${label} musi być nieujemną liczbą całkowitą albo NULL.`
    );
  }

  return value;
}

function normalizeUsage({
  operation,
  usage,
}) {
  if (
    usage === null ||
    usage === undefined
  ) {
    return {
      usageKnown: false,
      inputTokens: null,
      cachedInputTokens: null,
      outputTokens: null,
      totalTokens: null,
    };
  }

  if (
    typeof usage !== "object" ||
    Array.isArray(usage) ||
    typeof usage.usageKnown !==
      "boolean"
  ) {
    throw new Error(
      "Usage zdarzenia AI ma nieprawidłowy kontrakt."
    );
  }

  const normalized = {
    usageKnown:
      usage.usageKnown,

    inputTokens:
      normalizeOptionalToken(
        usage.inputTokens,
        "inputTokens"
      ),

    cachedInputTokens:
      normalizeOptionalToken(
        usage.cachedInputTokens,
        "cachedInputTokens"
      ),

    outputTokens:
      normalizeOptionalToken(
        usage.outputTokens,
        "outputTokens"
      ),

    totalTokens:
      normalizeOptionalToken(
        usage.totalTokens,
        "totalTokens"
      ),
  };

  if (
    normalized.cachedInputTokens !==
      null &&
    (
      normalized.inputTokens ===
        null ||
      normalized.cachedInputTokens >
        normalized.inputTokens
    )
  ) {
    throw new Error(
      "cachedInputTokens nie może przekraczać inputTokens."
    );
  }

  if (
    operation ===
      "document_embedding" &&
    (
      normalized.cachedInputTokens !==
        null ||
      normalized.outputTokens !==
        null
    )
  ) {
    throw new Error(
      "Embeddingi nie mogą zapisywać cachedInputTokens ani outputTokens."
    );
  }

  if (
    normalized.usageKnown
  ) {
    const hasKnownGenerationUsage =
      operation ===
        "material_generation" &&
      normalized.inputTokens !==
        null &&
      normalized.outputTokens !==
        null &&
      normalized.totalTokens ===
        normalized.inputTokens +
          normalized.outputTokens;

    const hasKnownEmbeddingUsage =
      operation ===
        "document_embedding" &&
      normalized.inputTokens !==
        null &&
      normalized.totalTokens ===
        normalized.inputTokens;

    if (
      !hasKnownGenerationUsage &&
      !hasKnownEmbeddingUsage
    ) {
      throw new Error(
        "Usage oznaczone jako znane jest niekompletne albo niespójne."
      );
    }
  }

  return normalized;
}

function assertRelation({
  operation,
  generatedMaterialId,
  sourceDocumentId,
}) {
  if (
    operation ===
      "material_generation"
  ) {
    assertNonEmptyString(
      generatedMaterialId,
      "generatedMaterialId"
    );

    if (sourceDocumentId !== null) {
      throw new Error(
        "Zdarzenie Generatora nie może wskazywać sourceDocumentId."
      );
    }

    return;
  }

  assertNonEmptyString(
    sourceDocumentId,
    "sourceDocumentId"
  );

  if (generatedMaterialId !== null) {
    throw new Error(
      "Zdarzenie embeddingów nie może wskazywać generatedMaterialId."
    );
  }
}

export async function recordAiUsageEvent({
  supabaseAdmin,
  ownerId,
  operation,
  model,
  status,
  usage = null,
  generatedMaterialId = null,
  sourceDocumentId = null,
}) {
  assertSupabaseAdmin(
    supabaseAdmin
  );

  assertNonEmptyString(
    ownerId,
    "ownerId"
  );

  if (!OPERATIONS.has(operation)) {
    throw new Error(
      `Nieobsługiwana operacja AI: ${
        operation || "[brak]"
      }.`
    );
  }

  assertNonEmptyString(
    model,
    "model"
  );

  if (!STATUSES.has(status)) {
    throw new Error(
      `Nieobsługiwany status zdarzenia AI: ${
        status || "[brak]"
      }.`
    );
  }

  assertRelation({
    operation,
    generatedMaterialId,
    sourceDocumentId,
  });

  const normalizedUsage =
    normalizeUsage({
      operation,
      usage,
    });

  const { error } =
    await supabaseAdmin
      .from("ai_usage_events")
      .insert({
        owner_id:
          ownerId.trim(),

        generated_material_id:
          generatedMaterialId ===
            null
            ? null
            : generatedMaterialId
                .trim(),

        source_document_id:
          sourceDocumentId ===
            null
            ? null
            : sourceDocumentId
                .trim(),

        operation,
        model: model.trim(),
        status,

        usage_known:
          normalizedUsage
            .usageKnown,

        input_tokens:
          normalizedUsage
            .inputTokens,

        cached_input_tokens:
          normalizedUsage
            .cachedInputTokens,

        output_tokens:
          normalizedUsage
            .outputTokens,

        total_tokens:
          normalizedUsage
            .totalTokens,
      });

  if (error) {
    throw new Error(
      `Nie udało się zapisać zdarzenia użycia AI: ${error.message}`
    );
  }

  return {
    recorded: true,
  };
}

export async function recordAiUsageEventSafely(
  eventData
) {
  try {
    return await recordAiUsageEvent(
      eventData
    );
  } catch (error) {
    console.error(
      "Failed to persist OpenAI usage event:",
      error instanceof Error
        ? error.message
        : String(error)
    );

    return {
      recorded: false,
    };
  }
}
