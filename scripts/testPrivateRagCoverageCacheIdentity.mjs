import assert from "node:assert/strict"

import {
  buildPrivateRagCoverageCacheIdentity,
} from "../lib/privateRag/buildPrivateRagCoverageCacheIdentity.js"

const CHUNK_ID_1 =
  "11111111-1111-4111-8111-111111111111"

const CHUNK_ID_2 =
  "22222222-2222-4222-8222-222222222222"

const CONTENT_HASH_1 =
  "a".repeat(64)

const CONTENT_HASH_2 =
  "b".repeat(64)

function createSourceContext() {
  return {
    status: "ready",
    sourceType: "teacher_private",

    query:
      "  Wyjaśnij   pętlę for   w języku C++.  ",

    sourceCount: 2,

    sources: [
      {
        rank: 1,
        chunkId: CHUNK_ID_1,
        contentHash: CONTENT_HASH_1,
      },
      {
        rank: 2,
        chunkId: CHUNK_ID_2,
        contentHash: CONTENT_HASH_2,
      },
    ],
  }
}

function main() {
  const sourceContext =
    createSourceContext()

  const sourceContextSnapshot =
    JSON.stringify(sourceContext)

  const firstResult =
    buildPrivateRagCoverageCacheIdentity({
      sourceContext,
    })

  const secondResult =
    buildPrivateRagCoverageCacheIdentity({
      sourceContext,
    })

  /*
    To samo wejście musi zawsze dawać
    ten sam fingerprint.
  */
  assert.deepEqual(
    firstResult,
    secondResult
  )

  assert.match(
    firstResult.sourceFingerprint,
    /^[0-9a-f]{64}$/
  )

  assert.equal(
    firstResult.retrievalQuery,
    "Wyjaśnij pętlę for w języku C++."
  )

  assert.equal(
    firstResult.sourceCount,
    2
  )

  assert.deepEqual(
    firstResult.sourceRefs,
    [
      {
        rank: 1,
        chunkId: CHUNK_ID_1,
        contentHash: CONTENT_HASH_1,
      },
      {
        rank: 2,
        chunkId: CHUNK_ID_2,
        contentHash: CONTENT_HASH_2,
      },
    ]
  )

  /*
    Różnice wyłącznie w liczbie spacji
    nie mogą zmieniać fingerprintu.
  */
  const normalizedQueryContext =
    createSourceContext()

  normalizedQueryContext.query =
    "Wyjaśnij pętlę for w języku C++."

  const normalizedQueryResult =
    buildPrivateRagCoverageCacheIdentity({
      sourceContext:
        normalizedQueryContext,
    })

  assert.equal(
    normalizedQueryResult
      .sourceFingerprint,

    firstResult
      .sourceFingerprint
  )

  /*
    Zmiana treści źródła musi
    unieważnić poprzedni cache.
  */
  const changedContentContext =
    createSourceContext()

  changedContentContext
    .sources[0]
    .contentHash =
      "c".repeat(64)

  const changedContentResult =
    buildPrivateRagCoverageCacheIdentity({
      sourceContext:
        changedContentContext,
    })

  assert.notEqual(
    changedContentResult
      .sourceFingerprint,

    firstResult
      .sourceFingerprint
  )

  /*
    Zmiana zapytania retrieval również
    musi utworzyć nowy fingerprint.
  */
  const changedQueryContext =
    createSourceContext()

  changedQueryContext.query =
    "Wyjaśnij wyłącznie składnię pętli for."

  const changedQueryResult =
    buildPrivateRagCoverageCacheIdentity({
      sourceContext:
        changedQueryContext,
    })

  assert.notEqual(
    changedQueryResult
      .sourceFingerprint,

    firstResult
      .sourceFingerprint
  )

  /*
    Funkcja nie może zmieniać
    wejściowego sourceContext.
  */
  assert.equal(
    JSON.stringify(sourceContext),
    sourceContextSnapshot
  )

  console.log(
    "1. Identyczne dane dają identyczny fingerprint: OK"
  )

  console.log(
    "2. Zapytanie jest normalizowane: OK"
  )

  console.log(
    "3. Zmiana contentHash unieważnia cache: OK"
  )

  console.log(
    "4. Zmiana zapytania unieważnia cache: OK"
  )

  console.log(
    "5. sourceContext nie został zmieniony: OK"
  )

  console.log(
    "\nTEST COVERAGE CACHE IDENTITY: OK"
  )
}

try {
  main()
} catch (error) {
  console.error(
    "\nTEST COVERAGE CACHE IDENTITY: BŁĄD"
  )

  console.error(
    error instanceof Error
      ? error.message
      : String(error)
  )

  process.exitCode = 1
}
/*
uruchomienie testu
node scripts/testPrivateRagCoverageCacheIdentity.mjs

*/