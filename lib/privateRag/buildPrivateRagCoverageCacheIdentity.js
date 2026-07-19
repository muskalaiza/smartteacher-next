import {
  createHash,
} from "node:crypto"

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const CONTENT_HASH_PATTERN =
  /^[0-9a-f]{64}$/i

function assertCondition(
  condition,
  message
) {
  if (!condition) {
    throw new Error(message)
  }
}

function normalizeQuery(query) {
  assertCondition(
    typeof query === "string" &&
      query.trim(),

    "sourceContext nie zawiera prawidłowego zapytania retrieval."
  )

  return query
    .replace(/\s+/g, " ")
    .trim()
}

function buildSourceRefs(sources) {
  assertCondition(
    Array.isArray(sources) &&
      sources.length > 0,

    "sourceContext nie zawiera źródeł do utworzenia fingerprintu."
  )

  const uniqueChunkIds =
    new Set()

  return sources.map(
    (source, index) => {
      const expectedRank =
        index + 1

      assertCondition(
        source &&
          typeof source ===
            "object" &&
          !Array.isArray(source),

        `Nieprawidłowe źródło na pozycji ${expectedRank}.`
      )

      assertCondition(
        source.rank ===
          expectedRank,

        `Źródło ${expectedRank} ma nieprawidłowy rank.`
      )

      assertCondition(
        typeof source.chunkId ===
          "string" &&
          UUID_PATTERN.test(
            source.chunkId
          ),

        `Źródło ${expectedRank} ma nieprawidłowy chunkId.`
      )

      assertCondition(
        !uniqueChunkIds.has(
          source.chunkId
        ),

        `Powielony chunkId w sourceContext: ${source.chunkId}.`
      )

      assertCondition(
        typeof source.contentHash ===
          "string" &&
          CONTENT_HASH_PATTERN.test(
            source.contentHash
          ),

        `Źródło ${expectedRank} ma nieprawidłowy contentHash.`
      )

      uniqueChunkIds.add(
        source.chunkId
      )

      return {
        rank:
          expectedRank,

        chunkId:
          source.chunkId.toLowerCase(),

        contentHash:
          source.contentHash.toLowerCase(),
      }
    }
  )
}

export function buildPrivateRagCoverageCacheIdentity({
  sourceContext,
}) {
  assertCondition(
    sourceContext &&
      typeof sourceContext ===
        "object" &&
      !Array.isArray(
        sourceContext
      ),

    "Funkcja wymaga sourceContext."
  )

  assertCondition(
    sourceContext.status ===
      "ready",

    "Cache coverage wymaga sourceContext ze statusem ready."
  )

  assertCondition(
    sourceContext.sourceType ===
      "teacher_private",

    "Cache coverage obsługuje wyłącznie źródła teacher_private."
  )

  const retrievalQuery =
    normalizeQuery(
      sourceContext.query
    )

  const sourceRefs =
    buildSourceRefs(
      sourceContext.sources
    )

  assertCondition(
    Number.isInteger(
      sourceContext.sourceCount
    ) &&
      sourceContext.sourceCount ===
        sourceRefs.length,

    "sourceCount nie odpowiada liczbie źródeł."
  )

  /*
    Kolejność pól i elementów tablicy jest celowo stała.
    Dzięki temu identyczne wejście daje identyczny fingerprint.
  */
  const fingerprintPayload =
    JSON.stringify({
      retrievalQuery,
      sourceRefs,
    })

  const sourceFingerprint =
    createHash("sha256")
      .update(
        fingerprintPayload,
        "utf8"
      )
      .digest("hex")

  return {
    sourceFingerprint,
    retrievalQuery,

    sourceRefs:
      sourceRefs.map(
        (sourceRef) => ({
          ...sourceRef,
        })
      ),

    sourceCount:
      sourceRefs.length,
  }
}
