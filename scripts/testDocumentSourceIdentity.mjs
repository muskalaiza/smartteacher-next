import assert from "node:assert/strict"

import {
  buildDocumentSourceIdentity,
  SOURCE_MANIFEST_VERSION,
} from "../lib/privateRag/buildDocumentSourceIdentity.js"

const CHUNKING_VERSION =
  "source_only_v1"

const baseChunks = [
  {
    chunk_index: 1,

    content_hash:
      "a".repeat(64),

    heading_path: [
      "Zmienne",
      "Deklaracja",
    ],
  },

  {
    chunk_index: 2,

    content_hash:
      "b".repeat(64),

    heading_path: [
      "Zmienne",
      "Inicjalizacja",
    ],
  },
]

const first =
  buildDocumentSourceIdentity({
    chunks:
      baseChunks,

    chunkingVersion:
      CHUNKING_VERSION,
  })

const second =
  buildDocumentSourceIdentity({
    chunks:
      baseChunks.map(
        (chunk) => ({
          ...chunk,

          heading_path: [
            ...chunk.heading_path,
          ],
        })
      ),

    chunkingVersion:
      CHUNKING_VERSION,
  })

assert.equal(
  first.sourceFingerprint,
  second.sourceFingerprint,
  "Identyczne źródło powinno mieć identyczny fingerprint."
)

assert.equal(
  first.sourceManifestVersion,
  SOURCE_MANIFEST_VERSION
)

assert.equal(
  first.sourceChunkCount,
  2
)

const changedContent =
  buildDocumentSourceIdentity({
    chunks: [
      baseChunks[0],

      {
        ...baseChunks[1],

        content_hash:
          "c".repeat(64),
      },
    ],

    chunkingVersion:
      CHUNKING_VERSION,
  })

assert.notEqual(
  first.sourceFingerprint,
  changedContent.sourceFingerprint,
  "Zmiana treści jednego chunka musi zmienić fingerprint."
)

const changedHeading =
  buildDocumentSourceIdentity({
    chunks: [
      {
        ...baseChunks[0],

        heading_path: [
          "Zmienne",
          "Inny nagłówek",
        ],
      },

      baseChunks[1],
    ],

    chunkingVersion:
      CHUNKING_VERSION,
  })

assert.notEqual(
  first.sourceFingerprint,
  changedHeading.sourceFingerprint,
  "Zmiana heading_path musi zmienić fingerprint."
)

assert.throws(
  () =>
    buildDocumentSourceIdentity({
      chunks: [
        baseChunks[1],
        baseChunks[0],
      ],

      chunkingVersion:
        CHUNKING_VERSION,
    }),

  /Nieprawidłowa kolejność chunków/
)

console.log(
  "Document source identity test OK"
)

console.log({
  sourceFingerprint:
    first.sourceFingerprint,

  sourceManifestVersion:
    first.sourceManifestVersion,

  sourceChunkCount:
    first.sourceChunkCount,
})

/*
uruchomienie skryptu
node scripts\testDocumentSourceIdentity.mjs
*/