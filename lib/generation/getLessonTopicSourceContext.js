import "server-only"

const READY_DOCUMENT_STATUSES = new Set([
  "chunked",
  "embedded",
  "ready",
])

const SHA256_PATTERN = /^[0-9a-f]{64}$/i

function assertRequiredArguments({
  supabaseAdmin,
  ownerId,
  subjectId,
  lessonTopicId,
}) {
  if (!supabaseAdmin) {
    throw new Error(
      "Brak serwerowego klienta Supabase."
    )
  }

  if (!ownerId) {
    throw new Error(
      "Brak identyfikatora właściciela dokumentu."
    )
  }

  if (!subjectId) {
    throw new Error(
      "Brak identyfikatora przedmiotu."
    )
  }

  if (!lessonTopicId) {
    throw new Error(
      "Brak identyfikatora tematu lekcji."
    )
  }
}

function assertDocumentIsReady(
  document
) {
  if (
    !READY_DOCUMENT_STATUSES.has(
      document.status
    )
  ) {
    throw new Error(
      `Dokument źródłowy nie jest gotowy dla Generatora. Aktualny status: ${
        document.status || "[brak]"
      }.`
    )
  }

  if (
    !SHA256_PATTERN.test(
      document.source_fingerprint || ""
    )
  ) {
    throw new Error(
      "Dokument źródłowy nie ma poprawnego source_fingerprint."
    )
  }

  if (
    typeof document.source_manifest_version !==
      "string" ||
    !document.source_manifest_version.trim()
  ) {
    throw new Error(
      "Dokument źródłowy nie ma source_manifest_version."
    )
  }

  if (
    !document.ready_at ||
    Number.isNaN(
      Date.parse(
        document.ready_at
      )
    )
  ) {
    throw new Error(
      "Dokument źródłowy nie ma poprawnego ready_at."
    )
  }
}

function validateAndGetChunkingVersion({
  chunks,
  documentId,
}) {
  if (chunks.length === 0) {
    throw new Error(
      "Dokument źródłowy nie ma zapisanych chunków."
    )
  }

  let previousChunkIndex = null
  let chunkingVersion = null

  chunks.forEach(
    (chunk, index) => {
      if (
        chunk.document_id !==
        documentId
      ) {
        throw new Error(
          `Chunk na pozycji ${
            index + 1
          } należy do innego dokumentu.`
        )
      }

      if (
        !Number.isInteger(
          chunk.chunk_index
        )
      ) {
        throw new Error(
          `Chunk na pozycji ${
            index + 1
          } nie ma poprawnego chunk_index.`
        )
      }

      if (
        previousChunkIndex !== null &&
        chunk.chunk_index <=
          previousChunkIndex
      ) {
        throw new Error(
          "Chunki dokumentu nie są zapisane w jednoznacznej kolejności."
        )
      }

      if (
        typeof chunk.content !==
          "string" ||
        !chunk.content.trim()
      ) {
        throw new Error(
          `Chunk ${chunk.chunk_index} nie ma treści.`
        )
      }

      if (
        !SHA256_PATTERN.test(
          chunk.content_hash || ""
        )
      ) {
        throw new Error(
          `Chunk ${chunk.chunk_index} nie ma poprawnego content_hash.`
        )
      }

      if (
        typeof chunk.chunking_version !==
          "string" ||
        !chunk.chunking_version.trim()
      ) {
        throw new Error(
          `Chunk ${chunk.chunk_index} nie ma chunking_version.`
        )
      }

      if (
        chunkingVersion === null
      ) {
        chunkingVersion =
          chunk.chunking_version
      } else if (
        chunk.chunking_version !==
          chunkingVersion
      ) {
        throw new Error(
          "Dokument zawiera chunki utworzone różnymi wersjami chunkingu."
        )
      }

      previousChunkIndex =
        chunk.chunk_index
    }
  )

  return chunkingVersion
}

export async function getLessonTopicSourceContext({
  supabaseAdmin,
  ownerId,
  subjectId,
  lessonTopicId,
}) {
  assertRequiredArguments({
    supabaseAdmin,
    ownerId,
    subjectId,
    lessonTopicId,
  })

  /*
    Pobieramy maksymalnie dwa dokumenty,
    aby jawnie wykryć naruszenie zasady:

    jeden temat lekcji
    → jeden dokument DOCX
  */
  const {
    data: loadedDocuments,
    error: documentsError,
  } =
    await supabaseAdmin
      .from("teacher_documents")
      .select(
        [
          "id",
          "owner_id",
          "subject_id",
          "lesson_topic_id",
          "original_file_name",
          "doc_type",
          "status",
          "source_fingerprint",
          "source_manifest_version",
          "ready_at",
        ].join(", ")
      )
      .eq(
        "owner_id",
        ownerId
      )
      .eq(
        "subject_id",
        subjectId
      )
      .eq(
        "lesson_topic_id",
        lessonTopicId
      )
      .eq(
        "doc_type",
        "docx"
      )
      .order(
        "ready_at",
        {
          ascending: false,
          nullsFirst: false,
        }
      )
      .limit(2)

  if (documentsError) {
    throw new Error(
      `Nie udało się pobrać dokumentu źródłowego: ${documentsError.message}`
    )
  }

  const documents =
    loadedDocuments || []

  if (documents.length === 0) {
    throw new Error(
      "Do wybranego tematu nie jest przypisany dokument DOCX."
    )
  }

  if (documents.length > 1) {
    throw new Error(
      "Do wybranego tematu przypisano więcej niż jeden dokument DOCX. Generator wymaga jednego jednoznacznego źródła."
    )
  }

  const document =
    documents[0]

  assertDocumentIsReady(
    document
  )

  /*
    Pobieramy pełną treść dokumentu.

    Nie ma:
    - embeddingu zapytania,
    - similarity,
    - top 3,
    - coverage,
    - wywołania modelu.
  */
  const {
    data: loadedChunks,
    error: chunksError,
  } =
    await supabaseAdmin
      .from("document_chunks")
      .select(
        [
          "document_id",
          "chunk_index",
          "content",
          "content_hash",
          "heading_path",
          "block_indices",
          "chunking_version",
        ].join(", ")
      )
      .eq(
        "document_id",
        document.id
      )
      .eq(
        "owner_id",
        ownerId
      )
      .order(
        "chunk_index",
        {
          ascending: true,
        }
      )

  if (chunksError) {
    throw new Error(
      `Nie udało się pobrać chunków dokumentu źródłowego: ${chunksError.message}`
    )
  }

  const chunks =
    loadedChunks || []

  const chunkingVersion =
    validateAndGetChunkingVersion({
      chunks,

      documentId:
        document.id,
    })

  /*
    Zachowujemy niezmienione treści chunków.

    Dodawany separator jest stały
    i służy wyłącznie oddzieleniu kolejnych
    fragmentów dokumentu w kontekście modelu.
  */
  const sourceContext =
    chunks
      .map(
        (chunk) =>
          chunk.content
      )
      .join("\n\n")

  return {
    documentId:
      document.id,

    ownerId:
      document.owner_id,

    subjectId:
      document.subject_id,

    lessonTopicId:
      document.lesson_topic_id,

    sourceFilename:
      document.original_file_name,

    documentStatus:
      document.status,

    sourceFingerprint:
      document.source_fingerprint,

    sourceManifestVersion:
      document.source_manifest_version,

    readyAt:
      document.ready_at,

    chunkingVersion,

    chunkCount:
      chunks.length,

    /*
      Chunks pozostają dostępne dla audytu.
      Generator otrzyma później sourceContext.
    */
    chunks,

    sourceContext,
  }
}
