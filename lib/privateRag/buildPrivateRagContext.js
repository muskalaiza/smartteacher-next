/*
  SOURCE-ONLY PRIVATE RAG CONTEXT

  Odpowiedzialność:
  wynik searchPrivateLessonTopicChunks
  ze statusem retrieved
  → audytowalny kontrakt źródeł
  → tekstowy ragContext.

  Ten moduł:
  - nie wykonuje retrieval,
  - nie tworzy embeddingów,
  - nie filtruje similarity,
  - nie zmienia treści chunków,
  - nie używa modelu generatywnego,
  - nie zapisuje danych do Supabase.
*/

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const CONTENT_HASH_PATTERN =
  /^[0-9a-f]{64}$/i

function isUuid(value) {
  return (
    typeof value === "string" &&
    UUID_PATTERN.test(value)
  )
}

function assertRetrievedResult(
  retrievalResult
) {
  if (
    !retrievalResult ||
    typeof retrievalResult !== "object"
  ) {
    throw new Error(
      "buildPrivateRagContext wymaga wyniku retrieval."
    )
  }

  if (
    retrievalResult.status !==
      "retrieved"
  ) {
    throw new Error(
      "buildPrivateRagContext wymaga statusu retrieved."
    )
  }

  if (
    !retrievalResult.retrieval ||
    typeof retrievalResult.retrieval !==
      "object"
  ) {
    throw new Error(
      "Brak danych semantic retrieval."
    )
  }

  const {
    matches,
    resultCount,
  } = retrievalResult.retrieval

  if (
    !Array.isArray(matches) ||
    matches.length === 0
  ) {
    throw new Error(
      "Brak zaakceptowanych chunków źródłowych."
    )
  }

  if (
    !Number.isInteger(resultCount) ||
    resultCount !== matches.length
  ) {
    throw new Error(
      "resultCount nie odpowiada liczbie chunków."
    )
  }

  if (
    !Array.isArray(
      retrievalResult.sourceDocuments
    ) ||
    retrievalResult.sourceDocuments
      .length === 0
  ) {
    throw new Error(
      "Brak metadanych dokumentów źródłowych."
    )
  }
}

function createSourceDocumentMap(
  sourceDocuments
) {
  const sourceDocumentMap = new Map()

  sourceDocuments.forEach(
    (document, index) => {
      if (
        !document ||
        typeof document !== "object"
      ) {
        throw new Error(
          `Nieprawidłowy dokument źródłowy na pozycji ${index + 1}.`
        )
      }

      if (!isUuid(document.id)) {
        throw new Error(
          `Dokument źródłowy ${index + 1} nie ma poprawnego id.`
        )
      }

      if (
        typeof document.originalFileName !==
          "string" ||
        !document.originalFileName.trim()
      ) {
        throw new Error(
          `Dokument źródłowy ${index + 1} nie ma nazwy pliku.`
        )
      }

      if (
        sourceDocumentMap.has(document.id)
      ) {
        throw new Error(
          `Powielony dokument źródłowy: ${document.id}.`
        )
      }

      sourceDocumentMap.set(
        document.id,
        {
          id: document.id,
          originalFileName:
            document.originalFileName,
          status: document.status,
        }
      )
    }
  )

  return sourceDocumentMap
}

function assertSourceMatch({
  match,
  index,
  sourceDocumentMap,
}) {
  if (
    !match ||
    typeof match !== "object"
  ) {
    throw new Error(
      `Nieprawidłowy chunk na pozycji ${index + 1}.`
    )
  }

  if (!isUuid(match.chunk_id)) {
    throw new Error(
      `Chunk ${index + 1} nie ma poprawnego chunk_id.`
    )
  }

  if (
    !isUuid(match.document_id) ||
    !sourceDocumentMap.has(
      match.document_id
    )
  ) {
    throw new Error(
      `Chunk ${index + 1} pochodzi z nieznanego dokumentu.`
    )
  }

  if (
    !Number.isInteger(
      match.chunk_index
    ) ||
    match.chunk_index < 1
  ) {
    throw new Error(
      `Chunk ${index + 1} ma nieprawidłowy chunk_index.`
    )
  }

  if (
    typeof match.content !== "string" ||
    !match.content.trim()
  ) {
    throw new Error(
      `Chunk ${index + 1} ma pustą treść.`
    )
  }

  if (
    typeof match.content_hash !==
      "string" ||
    !CONTENT_HASH_PATTERN.test(
      match.content_hash
    )
  ) {
    throw new Error(
      `Chunk ${index + 1} ma nieprawidłowy content_hash.`
    )
  }

  if (
    !Array.isArray(
      match.block_indices
    ) ||
    match.block_indices.length === 0 ||
    match.block_indices.some(
      (blockIndex) =>
        !Number.isInteger(
          blockIndex
        ) ||
        blockIndex < 1
    )
  ) {
    throw new Error(
      `Chunk ${index + 1} ma nieprawidłowe block_indices.`
    )
  }

  if (
    !Array.isArray(
      match.heading_path
    ) ||
    match.heading_path.some(
      (heading) =>
        typeof heading !== "string"
    )
  ) {
    throw new Error(
      `Chunk ${index + 1} ma nieprawidłowy heading_path.`
    )
  }

  if (
    typeof match.similarity !==
      "number" ||
    !Number.isFinite(
      match.similarity
    )
  ) {
    throw new Error(
      `Chunk ${index + 1} ma nieprawidłowe similarity.`
    )
  }
}

function createSourceEntry({
  match,
  rank,
  sourceDocument,
}) {
  return {
    rank,
    documentId:
      match.document_id,
    originalFileName:
      sourceDocument.originalFileName,
    chunkId:
      match.chunk_id,
    chunkIndex:
      match.chunk_index,
    blockIndices: [
      ...match.block_indices,
    ],
    headingPath: [
      ...match.heading_path,
    ],
    contentHash:
      match.content_hash,
    similarity:
      match.similarity,
    content:
      match.content,
  }
}

function buildSourceText(source) {
  const heading =
    source.headingPath.length > 0
      ? source.headingPath.join(" > ")
      : "(bez nagłówka)"

  return [
    "==================================================",
    `ŹRÓDŁO ${source.rank}`,
    `PLIK: ${source.originalFileName}`,
    `DOCUMENT_ID: ${source.documentId}`,
    `CHUNK_ID: ${source.chunkId}`,
    `CHUNK_INDEX: ${source.chunkIndex}`,
    `BLOCK_INDICES: ${source.blockIndices.join(", ")}`,
    `HEADING_PATH: ${heading}`,
    `CONTENT_HASH: ${source.contentHash}`,
    `SIMILARITY: ${source.similarity}`,
    "",
    source.content,
  ].join("\n")
}

export function buildPrivateRagContext({
  retrievalResult,
}) {
  assertRetrievedResult(
    retrievalResult
  )

  const sourceDocumentMap =
    createSourceDocumentMap(
      retrievalResult.sourceDocuments
    )

  const sources =
    retrievalResult.retrieval.matches.map(
      (match, index) => {
        assertSourceMatch({
          match,
          index,
          sourceDocumentMap,
        })

        return createSourceEntry({
          match,
          rank: index + 1,
          sourceDocument:
            sourceDocumentMap.get(
              match.document_id
            ),
        })
      }
    )

  const ragContext =
    sources
      .map(buildSourceText)
      .join("\n\n")

  return {
    status: "ready",

    sourceType:
      "teacher_private",

    ownerId:
      retrievalResult.ownerId,

    subjectId:
      retrievalResult.subjectId,

    lessonTopic: {
      ...retrievalResult.lessonTopic,
    },

    lessonCatalog: {
      ...retrievalResult.lessonCatalog,
    },

    query:
      retrievalResult.retrieval.query,

    sourceCount:
      sources.length,

    sources,

    ragContext,
  }
}
