import "server-only"

import {
  createHash,
} from "node:crypto"

import {
  buildVerifiedDocumentSourceContext,
  DOCX_MIME_TYPE,
  isDocumentReadyForGeneratorStatus,
} from "./getLessonTopicSourceContext.js"

export const LESSON_SECTION_SOURCE_MANIFEST_VERSION =
  "lesson_section_sources_v1"

export class LessonSectionSourceNotFoundError extends Error {
  constructor() {
    super(
      "Wybrany dział nie zawiera żadnego gotowego materiału źródłowego."
    )

    this.name =
      "LessonSectionSourceNotFoundError"
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

  return value.trim()
}

function getOrderedTopics(
  topics
) {
  if (
    !Array.isArray(topics) ||
    topics.length === 0
  ) {
    throw new LessonSectionSourceNotFoundError()
  }

  return topics
    .map(
      (topic, index) => {
        if (
          !topic ||
          typeof topic !== "object" ||
          Array.isArray(topic)
        ) {
          throw new Error(
            `Nieprawidłowy temat działu na pozycji ${index + 1}.`
          )
        }

        return {
          ...topic,

          id:
            assertNonEmptyString(
              topic.id,
              `topics[${index}].id`
            ),

          display_title:
            assertNonEmptyString(
              topic.display_title,
              `topics[${index}].display_title`
            ),

          order_index:
            Number.isInteger(
              topic.order_index
            )
              ? topic.order_index
              : index + 1,
        }
      }
    )
    .sort(
      (firstTopic, secondTopic) =>
        firstTopic.order_index -
          secondTopic.order_index ||
        firstTopic.id.localeCompare(
          secondTopic.id
        )
    )
}

function groupDocumentsByTopic(
  documents
) {
  if (!Array.isArray(documents)) {
    throw new Error(
      "documents musi być tablicą."
    )
  }

  const documentsByTopic =
    new Map()

  documents.forEach(
    (document, index) => {
      if (
        !document ||
        typeof document !== "object" ||
        Array.isArray(document)
      ) {
        throw new Error(
          `Nieprawidłowy dokument działu na pozycji ${index + 1}.`
        )
      }

      const lessonTopicId =
        assertNonEmptyString(
          document.lesson_topic_id,
          `documents[${index}].lesson_topic_id`
        )

      const topicDocuments =
        documentsByTopic.get(
          lessonTopicId
        ) || []

      topicDocuments.push(
        document
      )

      documentsByTopic.set(
        lessonTopicId,
        topicDocuments
      )
    }
  )

  return documentsByTopic
}

function groupChunksByDocument(
  chunks
) {
  if (!Array.isArray(chunks)) {
    throw new Error(
      "chunks musi być tablicą."
    )
  }

  const chunksByDocument =
    new Map()

  chunks.forEach(
    (chunk, index) => {
      if (
        !chunk ||
        typeof chunk !== "object" ||
        Array.isArray(chunk)
      ) {
        throw new Error(
          `Nieprawidłowy chunk działu na pozycji ${index + 1}.`
        )
      }

      const documentId =
        assertNonEmptyString(
          chunk.document_id,
          `chunks[${index}].document_id`
        )

      const documentChunks =
        chunksByDocument.get(
          documentId
        ) || []

      documentChunks.push(
        chunk
      )

      chunksByDocument.set(
        documentId,
        documentChunks
      )
    }
  )

  chunksByDocument.forEach(
    (documentChunks) =>
      documentChunks.sort(
        (firstChunk, secondChunk) =>
          firstChunk.chunk_index -
          secondChunk.chunk_index
      )
  )

  return chunksByDocument
}

function buildTopicSourceContext({
  topic,
  documentSource,
}) {
  return [
    "==================================================",
    `SOURCE_TOPIC_ID: ${topic.id}`,
    `TYTUŁ TEMATU: ${topic.display_title}`,
    "",
    documentSource.sourceContext,
  ].join("\n")
}

function buildSectionSourceIdentity({
  lessonSectionId,
  topicSources,
}) {
  const sourceManifest = {
    sourceManifestVersion:
      LESSON_SECTION_SOURCE_MANIFEST_VERSION,

    lessonSectionId,

    topics:
      topicSources.map(
        ({
          topic,
          documentSource,
        }) => ({
          lessonTopicId:
            topic.id,

          title:
            topic.display_title,

          sourceFingerprint:
            documentSource
              ?.sourceFingerprint ??
            null,

          sourceManifestVersion:
            documentSource
              ?.sourceManifestVersion ??
            null,
        })
      ),
  }

  const sourceFingerprint =
    createHash("sha256")
      .update(
        JSON.stringify(
          sourceManifest
        ),
        "utf8"
      )
      .digest("hex")

  return {
    sourceFingerprint,
    sourceManifest,
  }
}

export function buildLessonSectionSourceContext({
  lessonSectionId,
  topics,
  documents,
  chunks,
}) {
  const normalizedLessonSectionId =
    assertNonEmptyString(
      lessonSectionId,
      "lessonSectionId"
    )

  const orderedTopics =
    getOrderedTopics(
      topics
    )

  const documentsByTopic =
    groupDocumentsByTopic(
      documents
    )

  const chunksByDocument =
    groupChunksByDocument(
      chunks
    )

  const topicSources =
    orderedTopics.map(
      (topic) => {
        const topicDocuments =
          documentsByTopic.get(
            topic.id
          ) || []

        if (
          topicDocuments.length > 1
        ) {
          throw new Error(
            `Do tematu „${topic.display_title}” przypisano więcej niż jeden dokument DOCX.`
          )
        }

        const document =
          topicDocuments[0]

        if (
          !document ||
          !isDocumentReadyForGeneratorStatus(
            document.status
          )
        ) {
          return {
            topic,
            documentSource: null,
          }
        }

        return {
          topic,

          documentSource:
            buildVerifiedDocumentSourceContext({
              document,
              chunks:
                chunksByDocument.get(
                  document.id
                ) || [],
            }),
        }
      }
    )

  const readyTopicSources =
    topicSources.filter(
      ({ documentSource }) =>
        documentSource !== null
    )

  if (
    readyTopicSources.length === 0
  ) {
    throw new LessonSectionSourceNotFoundError()
  }

  const missingTopics =
    topicSources
      .filter(
        ({ documentSource }) =>
          documentSource === null
      )
      .map(
        ({ topic }) => ({
          id:
            topic.id,
          title:
            topic.display_title,
        })
      )

  const {
    sourceFingerprint,
    sourceManifest,
  } =
    buildSectionSourceIdentity({
      lessonSectionId:
        normalizedLessonSectionId,
      topicSources,
    })

  const sourceDocuments =
    readyTopicSources.map(
      ({
        topic,
        documentSource,
      }) => ({
        topicId:
          topic.id,
        topicTitle:
          topic.display_title,
        ...documentSource,
      })
    )

  return {
    lessonSectionId:
      normalizedLessonSectionId,

    topicCount:
      orderedTopics.length,

    readyTopicCount:
      readyTopicSources.length,

    missingTopicCount:
      missingTopics.length,

    sourceTopics:
      readyTopicSources.map(
        ({ topic }) => ({
          id:
            topic.id,
          title:
            topic.display_title,
        })
      ),

    missingTopics,
    sourceDocuments,

    documentCount:
      sourceDocuments.length,

    chunkCount:
      sourceDocuments.reduce(
        (sum, document) =>
          sum +
          document.chunkCount,
        0
      ),

    sourceFileNameSnapshot:
      sourceDocuments
        .map(
          (document) =>
            document.sourceFilename
        )
        .join("; "),

    sourceFingerprint,

    sourceManifestVersion:
      LESSON_SECTION_SOURCE_MANIFEST_VERSION,

    sourceManifest,

    sourceContext:
      readyTopicSources
        .map(
          ({
            topic,
            documentSource,
          }) =>
            buildTopicSourceContext({
              topic,
              documentSource,
            })
        )
        .join("\n\n"),
  }
}

function assertRequiredArguments({
  supabaseAdmin,
  ownerId,
  subjectId,
  lessonCatalogId,
  lessonSectionId,
}) {
  if (!supabaseAdmin) {
    throw new Error(
      "Brak serwerowego klienta Supabase."
    )
  }

  assertNonEmptyString(
    ownerId,
    "ownerId"
  )

  assertNonEmptyString(
    subjectId,
    "subjectId"
  )

  assertNonEmptyString(
    lessonCatalogId,
    "lessonCatalogId"
  )

  assertNonEmptyString(
    lessonSectionId,
    "lessonSectionId"
  )
}

export async function getLessonSectionSourceContext({
  supabaseAdmin,
  ownerId,
  subjectId,
  lessonCatalogId,
  lessonSectionId,
}) {
  assertRequiredArguments({
    supabaseAdmin,
    ownerId,
    subjectId,
    lessonCatalogId,
    lessonSectionId,
  })

  const {
    data: loadedTopics,
    error: topicsError,
  } =
    await supabaseAdmin
      .from("lesson_topics")
      .select(
        [
          "id",
          "catalog_id",
          "section_id",
          "display_title",
          "lesson_key",
          "order_index",
        ].join(", ")
      )
      .eq(
        "catalog_id",
        lessonCatalogId
      )
      .eq(
        "section_id",
        lessonSectionId
      )
      .eq(
        "is_active",
        true
      )
      .order(
        "order_index",
        {
          ascending: true,
        }
      )
      .order(
        "id",
        {
          ascending: true,
        }
      )

  if (topicsError) {
    throw new Error(
      `Nie udało się pobrać tematów działu: ${topicsError.message}`
    )
  }

  const topics =
    loadedTopics || []

  if (topics.length === 0) {
    throw new LessonSectionSourceNotFoundError()
  }

  const topicIds =
    topics.map(
      (topic) =>
        topic.id
    )

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
          "mime_type",
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
        "mime_type",
        DOCX_MIME_TYPE
      )
      .in(
        "lesson_topic_id",
        topicIds
      )

  if (documentsError) {
    throw new Error(
      `Nie udało się pobrać dokumentów źródłowych działu: ${documentsError.message}`
    )
  }

  const documents =
    loadedDocuments || []

  const readyDocumentIds =
    documents
      .filter(
        (document) =>
          isDocumentReadyForGeneratorStatus(
            document.status
          )
      )
      .map(
        (document) =>
          document.id
      )

  let chunks = []

  if (
    readyDocumentIds.length > 0
  ) {
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
          "owner_id",
          ownerId
        )
        .in(
          "document_id",
          readyDocumentIds
        )
        .order(
          "document_id",
          {
            ascending: true,
          }
        )
        .order(
          "chunk_index",
          {
            ascending: true,
          }
        )

    if (chunksError) {
      throw new Error(
        `Nie udało się pobrać chunków dokumentów działu: ${chunksError.message}`
      )
    }

    chunks =
      loadedChunks || []
  }

  return buildLessonSectionSourceContext({
    lessonSectionId,
    topics,
    documents,
    chunks,
  })
}
