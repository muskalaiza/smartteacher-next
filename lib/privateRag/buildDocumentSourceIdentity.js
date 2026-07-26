import {
  createHash,
} from "node:crypto"

export const SOURCE_MANIFEST_VERSION =
  "document_chunks_v1"

const SHA256_PATTERN =
  /^[0-9a-f]{64}$/i

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

function normalizeHeadingPath({
  headingPath,
  chunkIndex,
}) {
  if (!Array.isArray(headingPath)) {
    throw new Error(
      `Chunk ${chunkIndex} nie ma poprawnego heading_path.`
    )
  }

  if (
    headingPath.some(
      (heading) =>
        typeof heading !== "string"
    )
  ) {
    throw new Error(
      `Chunk ${chunkIndex} zawiera nieprawidłowy element heading_path.`
    )
  }

  return [
    ...headingPath,
  ]
}

export function buildDocumentSourceIdentity({
  chunks,
  chunkingVersion,
}) {
  if (
    !Array.isArray(chunks) ||
    chunks.length === 0
  ) {
    throw new Error(
      "Nie można zbudować source_fingerprint bez chunków."
    )
  }

  assertNonEmptyString(
    chunkingVersion,
    "chunkingVersion"
  )

  const normalizedChunks =
    chunks.map(
      (chunk, index) => {
        const expectedChunkIndex =
          index + 1

        if (
          !chunk ||
          typeof chunk !== "object" ||
          Array.isArray(chunk)
        ) {
          throw new Error(
            `Nieprawidłowy chunk na pozycji ${expectedChunkIndex}.`
          )
        }

        if (
          chunk.chunk_index !==
            expectedChunkIndex
        ) {
          throw new Error(
            `Nieprawidłowa kolejność chunków. Oczekiwano chunk_index=${expectedChunkIndex}.`
          )
        }

        if (
          typeof chunk.content_hash !==
            "string" ||
          !SHA256_PATTERN.test(
            chunk.content_hash
          )
        ) {
          throw new Error(
            `Chunk ${expectedChunkIndex} nie ma poprawnego content_hash SHA-256.`
          )
        }

        return {
          chunkIndex:
            chunk.chunk_index,

          contentHash:
            chunk.content_hash
              .toLowerCase(),

          headingPath:
            normalizeHeadingPath({
              headingPath:
                chunk.heading_path,

              chunkIndex:
                expectedChunkIndex,
            }),
        }
      }
    )

  const sourceManifest = {
    sourceManifestVersion:
      SOURCE_MANIFEST_VERSION,

    chunkingVersion:
      chunkingVersion.trim(),

    chunks:
      normalizedChunks,
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

    sourceManifestVersion:
      SOURCE_MANIFEST_VERSION,

    sourceChunkCount:
      normalizedChunks.length,

    sourceManifest,
  }
}
