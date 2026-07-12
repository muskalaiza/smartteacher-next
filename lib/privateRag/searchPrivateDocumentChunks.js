import {
  createQueryEmbedding,
} from "./createQueryEmbedding.js"

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function isUuid(value) {
  return (
    typeof value === "string" &&
    UUID_PATTERN.test(value)
  )
}

function getNormalizedOwnerId(ownerId) {
  const normalizedOwnerId =
    typeof ownerId === "string"
      ? ownerId.trim()
      : ""

  if (!isUuid(normalizedOwnerId)) {
    throw new Error(
      "searchPrivateDocumentChunks wymaga poprawnego ownerId."
    )
  }

  return normalizedOwnerId
}

function getNormalizedDocumentIds(documentIds) {
  if (!Array.isArray(documentIds)) {
    throw new Error(
      "searchPrivateDocumentChunks wymaga tablicy documentIds."
    )
  }

  const normalizedDocumentIds = [
    ...new Set(
      documentIds.map((documentId) =>
        typeof documentId === "string"
          ? documentId.trim()
          : ""
      )
    ),
  ]

  if (normalizedDocumentIds.length === 0) {
    throw new Error(
      "Semantic retrieval wymaga co najmniej jednego dokumentu."
    )
  }

  normalizedDocumentIds.forEach(
    (documentId, index) => {
      if (!isUuid(documentId)) {
        throw new Error(
          `Nieprawidłowy documentId na pozycji ${index + 1}.`
        )
      }
    }
  )

  return normalizedDocumentIds
}

function getNormalizedMatchCount(matchCount) {
  if (
    !Number.isInteger(matchCount) ||
    matchCount < 1 ||
    matchCount > 20
  ) {
    throw new Error(
      "matchCount musi być liczbą całkowitą od 1 do 20."
    )
  }

  return matchCount
}

function assertSupabaseAdmin(supabaseAdmin) {
  if (
    !supabaseAdmin ||
    typeof supabaseAdmin.rpc !== "function"
  ) {
    throw new Error(
      "Brak poprawnego serwerowego klienta Supabase."
    )
  }
}

function assertSearchMatch({
  match,
  index,
  allowedDocumentIds,
}) {
  if (!match || typeof match !== "object") {
    throw new Error(
      `Nieprawidłowy wynik retrieval na pozycji ${index + 1}.`
    )
  }

  if (!isUuid(match.chunk_id)) {
    throw new Error(
      `Wynik ${index + 1} nie ma poprawnego chunk_id.`
    )
  }

  if (
    !isUuid(match.document_id) ||
    !allowedDocumentIds.has(match.document_id)
  ) {
    throw new Error(
      `Wynik ${index + 1} pochodzi z niedozwolonego dokumentu.`
    )
  }

  if (
    !Number.isInteger(match.chunk_index) ||
    match.chunk_index < 1
  ) {
    throw new Error(
      `Wynik ${index + 1} ma nieprawidłowy chunk_index.`
    )
  }

  if (
    typeof match.content !== "string" ||
    !match.content.trim()
  ) {
    throw new Error(
      `Wynik ${index + 1} ma pustą treść.`
    )
  }

  if (
    typeof match.content_hash !== "string" ||
    !/^[0-9a-f]{64}$/i.test(
      match.content_hash
    )
  ) {
    throw new Error(
      `Wynik ${index + 1} ma nieprawidłowy content_hash.`
    )
  }

  if (
    !Array.isArray(match.heading_path) ||
    match.heading_path.some(
      (heading) =>
        typeof heading !== "string"
    )
  ) {
    throw new Error(
      `Wynik ${index + 1} ma nieprawidłowy heading_path.`
    )
  }

  if (
    !Array.isArray(match.block_indices) ||
    match.block_indices.length === 0 ||
    match.block_indices.some(
      (blockIndex) =>
        !Number.isInteger(blockIndex) ||
        blockIndex < 1
    )
  ) {
    throw new Error(
      `Wynik ${index + 1} ma nieprawidłowe block_indices.`
    )
  }

  if (
    typeof match.similarity !== "number" ||
    !Number.isFinite(match.similarity) ||
    match.similarity < -1.000001 ||
    match.similarity > 1.000001
  ) {
    throw new Error(
      `Wynik ${index + 1} ma nieprawidłową wartość similarity.`
    )
  }
}

function getRpcErrorMessage(error) {
  const details = [
    error?.message,
    error?.details,
    error?.hint,
  ]
    .filter(Boolean)
    .join(" ")

  return (
    details ||
    "Nieznany błąd funkcji semantic search."
  )
}

export async function searchPrivateDocumentChunks({
  supabaseAdmin,
  ownerId,
  documentIds,
  query,
  matchCount = 5,
  apiKey,
}) {
  assertSupabaseAdmin(supabaseAdmin)

  const normalizedOwnerId =
    getNormalizedOwnerId(ownerId)

  const normalizedDocumentIds =
    getNormalizedDocumentIds(documentIds)

  const normalizedMatchCount =
    getNormalizedMatchCount(matchCount)

  const queryEmbeddingResult =
    await createQueryEmbedding({
      query,
      apiKey,
    })

  const { data, error } =
    await supabaseAdmin.rpc(
      "search_private_document_chunks",
      {
        p_owner_id: normalizedOwnerId,
        p_document_ids:
          normalizedDocumentIds,
        p_query_embedding:
          queryEmbeddingResult.embedding,
        p_embedding_model:
          queryEmbeddingResult.embedding_model,
        p_match_count:
          normalizedMatchCount,
      }
    )

  if (error) {
    throw new Error(
      `Semantic retrieval zakończył się błędem Supabase: ${getRpcErrorMessage(
        error
      )}`
    )
  }

  if (!Array.isArray(data)) {
    throw new Error(
      "Supabase nie zwrócił tablicy wyników semantic retrieval."
    )
  }

  if (data.length > normalizedMatchCount) {
    throw new Error(
      "Semantic retrieval zwrócił więcej wyników niż żądany matchCount."
    )
  }

  const allowedDocumentIds = new Set(
    normalizedDocumentIds
  )

  data.forEach((match, index) => {
    assertSearchMatch({
      match,
      index,
      allowedDocumentIds,
    })
  })

  return {
    query: queryEmbeddingResult.query,
    ownerId: normalizedOwnerId,
    documentIds: normalizedDocumentIds,

    embeddingModel:
      queryEmbeddingResult.embedding_model,

    embeddingDimensions:
      queryEmbeddingResult.embedding_dimensions,

    matchCount: normalizedMatchCount,
    resultCount: data.length,

    usage: queryEmbeddingResult.usage,
    matches: data,
  }
}
