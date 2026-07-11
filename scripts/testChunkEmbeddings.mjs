import assert from "node:assert/strict"
import { createHash } from "node:crypto"
import process from "node:process"

import {
  createChunkEmbeddings,
  EMBEDDING_DIMENSIONS,
  EMBEDDING_MODEL,
} from "../lib/privateRag/createChunkEmbeddings.js"

const TEST_CHUNK_ID =
  "00000000-0000-4000-8000-000000000001"

const TEST_CONTENT =
  "Zmienna w języku C++ przechowuje wartość określonego typu. Przykład inicjalizacji: int liczba = 18;"

function createContentHash(content) {
  return createHash("sha256")
    .update(String(content || ""), "utf8")
    .digest("hex")
}

function assertUsage(usage) {
  assert.ok(
    usage && typeof usage === "object",
    "Brak informacji o użyciu tokenów."
  )

  assert.ok(
    Number.isInteger(usage.promptTokens) &&
      usage.promptTokens > 0,
    "Nieprawidłowa liczba promptTokens."
  )

  assert.ok(
    Number.isInteger(usage.totalTokens) &&
      usage.totalTokens >= usage.promptTokens,
    "Nieprawidłowa liczba totalTokens."
  )
}

function assertEmbeddingResult(result, expectedHash) {
  assert.ok(
    result && typeof result === "object",
    "Funkcja nie zwróciła obiektu wyniku."
  )

  assert.equal(
    result.model,
    EMBEDDING_MODEL,
    "Zwrócono inny model embeddingowy."
  )

  assert.equal(
    result.dimensions,
    EMBEDDING_DIMENSIONS,
    "Zwrócono inną liczbę wymiarów."
  )

  assert.equal(
    result.embeddingCount,
    1,
    "Powinien zostać utworzony dokładnie jeden embedding."
  )

  assert.ok(
    Array.isArray(result.embeddings),
    "Pole embeddings nie jest tablicą."
  )

  assert.equal(
    result.embeddings.length,
    1,
    "Tablica embeddings powinna zawierać jeden element."
  )

  const embeddingResult = result.embeddings[0]

  assert.equal(
    embeddingResult.chunk_id,
    TEST_CHUNK_ID,
    "Embedding został przypisany do niewłaściwego chunka."
  )

  assert.equal(
    embeddingResult.content_hash,
    expectedHash,
    "Embedding ma nieprawidłowy content_hash."
  )

  assert.equal(
    embeddingResult.embedding_model,
    EMBEDDING_MODEL,
    "Embedding ma nieprawidłową nazwę modelu."
  )

  assert.equal(
    embeddingResult.embedding_dimensions,
    EMBEDDING_DIMENSIONS,
    "Embedding ma nieprawidłową liczbę wymiarów."
  )

  assert.ok(
    Array.isArray(embeddingResult.embedding),
    "Embedding nie jest tablicą."
  )

  assert.equal(
    embeddingResult.embedding.length,
    EMBEDDING_DIMENSIONS,
    `Embedding powinien mieć ${EMBEDDING_DIMENSIONS} wymiarów.`
  )

  embeddingResult.embedding.forEach(
    (value, index) => {
      assert.ok(
        typeof value === "number" &&
          Number.isFinite(value),
        `Nieprawidłowa wartość embeddingu na pozycji ${index}.`
      )
    }
  )

  assert.ok(
    embeddingResult.embedding.some(
      (value) => value !== 0
    ),
    "Embedding nie może składać się wyłącznie z zer."
  )

  const vectorMagnitude = Math.sqrt(
    embeddingResult.embedding.reduce(
      (sum, value) => sum + value * value,
      0
    )
  )

  assert.ok(
    Number.isFinite(vectorMagnitude) &&
      vectorMagnitude > 0,
    "Embedding ma nieprawidłową długość wektora."
  )

  assertUsage(result.usage)

  return {
    vectorMagnitude,
    promptTokens: result.usage.promptTokens,
    totalTokens: result.usage.totalTokens,
  }
}

async function main() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error(
      "Brak OPENAI_API_KEY. Uruchom skrypt z opcją --env-file=.env.local."
    )
  }

  const contentHash =
    createContentHash(TEST_CONTENT)

  console.log(
    "Uruchamiam test jednego embeddingu..."
  )

  const result = await createChunkEmbeddings({
    chunks: [
      {
        id: TEST_CHUNK_ID,
        content: TEST_CONTENT,
        content_hash: contentHash,
      },
    ],
  })

  const summary = assertEmbeddingResult(
    result,
    contentHash
  )

  console.log("\nWYNIK TESTU:")
  console.log(`Model: ${result.model}`)
  console.log(
    `Wymiary: ${result.dimensions}`
  )
  console.log(
    `Liczba embeddingów: ${result.embeddingCount}`
  )
  console.log(
    `Prompt tokens: ${summary.promptTokens}`
  )
  console.log(
    `Total tokens: ${summary.totalTokens}`
  )
  console.log(
    `Długość wektora: ${summary.vectorMagnitude.toFixed(6)}`
  )
  console.log(
    "Wartości wektora: pominięte celowo"
  )

  console.log(
    "\nTEST EMBEDDINGU: OK"
  )
}

try {
  await main()
} catch (error) {
  console.error("\nTEST EMBEDDINGU: BŁĄD")
  console.error(
    error instanceof Error
      ? error.message
      : String(error)
  )

  process.exitCode = 1
}
