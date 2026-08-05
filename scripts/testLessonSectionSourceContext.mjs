import assert from "node:assert/strict"
import {
  createHash,
} from "node:crypto"

import {
  buildDocumentSourceIdentity,
} from "../lib/privateRag/buildDocumentSourceIdentity.js"

import {
  buildLessonSectionSourceContext,
  LessonSectionSourceNotFoundError,
} from "../lib/generation/getLessonSectionSourceContext.js"

const OWNER_ID =
  "00000000-0000-4000-8000-000000000001"

const SUBJECT_ID =
  "00000000-0000-4000-8000-000000000002"

const SECTION_ID =
  "00000000-0000-4000-8000-000000000003"

const TOPIC_IDS = [
  "00000000-0000-4000-8000-000000000011",
  "00000000-0000-4000-8000-000000000012",
  "00000000-0000-4000-8000-000000000013",
]

const DOCUMENT_IDS = [
  "00000000-0000-4000-8000-000000000021",
  "00000000-0000-4000-8000-000000000022",
]

function createChunk({
  documentId,
  chunkIndex,
  content,
}) {
  return {
    document_id:
      documentId,

    chunk_index:
      chunkIndex,

    content,

    content_hash:
      createHash("sha256")
        .update(
          content,
          "utf8"
        )
        .digest("hex"),

    heading_path: [],
    block_indices: [
      chunkIndex,
    ],
    chunking_version:
      "chunker_test_v1",
  }
}

function createReadyDocument({
  documentId,
  lessonTopicId,
  fileName,
  chunks,
}) {
  const identity =
    buildDocumentSourceIdentity({
      chunks,
      chunkingVersion:
        "chunker_test_v1",
    })

  return {
    id:
      documentId,
    owner_id:
      OWNER_ID,
    subject_id:
      SUBJECT_ID,
    lesson_topic_id:
      lessonTopicId,
    original_file_name:
      fileName,
    status:
      "ready",
    source_fingerprint:
      identity.sourceFingerprint,
    source_manifest_version:
      identity.sourceManifestVersion,
    ready_at:
      "2026-08-05T12:00:00.000Z",
  }
}

const topics = [
  {
    id: TOPIC_IDS[0],
    display_title:
      "Pierwszy temat",
    order_index: 1,
  },
  {
    id: TOPIC_IDS[1],
    display_title:
      "Drugi temat",
    order_index: 2,
  },
  {
    id: TOPIC_IDS[2],
    display_title:
      "Trzeci temat bez źródła",
    order_index: 3,
  },
]

const firstDocumentChunks = [
  createChunk({
    documentId:
      DOCUMENT_IDS[0],
    chunkIndex: 1,
    content:
      "Treść pierwszego tematu.",
  }),
]

const secondDocumentChunks = [
  createChunk({
    documentId:
      DOCUMENT_IDS[1],
    chunkIndex: 1,
    content:
      "Pierwszy fragment drugiego tematu.",
  }),
  createChunk({
    documentId:
      DOCUMENT_IDS[1],
    chunkIndex: 2,
    content:
      "Drugi fragment drugiego tematu.",
  }),
]

const documents = [
  createReadyDocument({
    documentId:
      DOCUMENT_IDS[0],
    lessonTopicId:
      TOPIC_IDS[0],
    fileName:
      "pierwszy.docx",
    chunks:
      firstDocumentChunks,
  }),
  createReadyDocument({
    documentId:
      DOCUMENT_IDS[1],
    lessonTopicId:
      TOPIC_IDS[1],
    fileName:
      "drugi.docx",
    chunks:
      secondDocumentChunks,
  }),
]

function buildResult(
  overrides = {}
) {
  return buildLessonSectionSourceContext({
    lessonSectionId:
      SECTION_ID,
    topics,
    documents,
    chunks: [
      ...secondDocumentChunks,
      ...firstDocumentChunks,
    ],
    ...overrides,
  })
}

const result =
  buildResult()

assert.equal(
  result.topicCount,
  3
)

assert.equal(
  result.readyTopicCount,
  2
)

assert.equal(
  result.missingTopicCount,
  1
)

assert.deepEqual(
  result.sourceTopics.map(
    ({ id, title }) => ({
      id,
      title,
    })
  ),
  [
    {
      id: TOPIC_IDS[0],
      title:
        "Pierwszy temat",
    },
    {
      id: TOPIC_IDS[1],
      title:
        "Drugi temat",
    },
  ]
)

assert.deepEqual(
  result.missingTopics,
  [
    {
      id: TOPIC_IDS[2],
      title:
        "Trzeci temat bez źródła",
    },
  ]
)

assert.match(
  result.sourceContext,
  new RegExp(
    `SOURCE_TOPIC_ID: ${TOPIC_IDS[0]}`
  )
)

assert.match(
  result.sourceContext,
  /TYTUŁ TEMATU: Pierwszy temat/
)

assert.match(
  result.sourceContext,
  /Treść pierwszego tematu\./
)

assert.ok(
  result.sourceContext.indexOf(
    "Pierwszy temat"
  ) <
    result.sourceContext.indexOf(
      "Drugi temat"
    ),
  "Kontekst musi zachowywać kolejność tematów działu."
)

assert.match(
  result.sourceFingerprint,
  /^[0-9a-f]{64}$/
)

assert.equal(
  result.sourceManifestVersion,
  "lesson_section_sources_v1"
)

assert.equal(
  result.chunkCount,
  3
)

assert.equal(
  result.sourceFileNameSnapshot,
  "pierwszy.docx; drugi.docx"
)

assert.equal(
  result.sourceManifest.topics[2]
    .sourceFingerprint,
  null,
  "Manifest musi uwzględniać temat bez gotowego źródła."
)

assert.equal(
  buildResult()
    .sourceFingerprint,
  result.sourceFingerprint,
  "Identyczne źródła działu muszą mieć identyczny fingerprint."
)

assert.notEqual(
  buildResult({
    topics: topics.map(
      (topic, index) =>
        index === 2
          ? {
              ...topic,
              display_title:
                "Zmieniona nazwa trzeciego tematu",
            }
          : topic
    ),
  }).sourceFingerprint,
  result.sourceFingerprint,
  "Zmiana zakresu działu musi powodować inny fingerprint."
)

assert.throws(
  () =>
    buildResult({
      documents: [
        ...documents,
        {
          ...documents[0],
          id:
            "00000000-0000-4000-8000-000000000099",
        },
      ],
    }),
  /więcej niż jeden dokument DOCX/
)

assert.throws(
  () =>
    buildResult({
      documents: [],
      chunks: [],
    }),
  LessonSectionSourceNotFoundError
)

console.log(
  "Lesson section source context tests OK"
)

/*
Uruchomienie testu:
node --conditions=react-server scripts/testLessonSectionSourceContext.mjs
*/
