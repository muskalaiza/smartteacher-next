import assert from "node:assert/strict"
import process from "node:process"

import {
  createQueryEmbedding,
} from "../lib/privateRag/createQueryEmbedding.js"

import {
  EMBEDDING_DIMENSIONS,
  EMBEDDING_MODEL,
} from "../lib/privateRag/createEmbeddingVectors.js"

const TEST_QUERY =
  "Jak zadeklarować i zainicjalizować zmienną typu int w języku C++?"

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
      usage.totalTokens >=
        usage.promptTokens,
    "Nieprawidłowa liczba totalTokens."
  )
}

function assertEmbedding(result) {
  assert.ok(
    result && typeof result === "object",
    "Funkcja nie zwróciła obiektu."
  )

  assert.equal(
    result.query,
    TEST_QUERY,
    "Zwrócono inne zapytanie."
  )

  assert.equal(
    result.embedding_model,
    EMBEDDING_MODEL,
    "Zwrócono inny model embeddingowy."
  )

  assert.equal(
    result.embedding_dimensions,
    EMBEDDING_DIMENSIONS,
    "Zwrócono inną liczbę wymiarów."
  )

  assert.ok(
    Array.isArray(result.embedding),
    "Embedding zapytania nie jest tablicą."
  )

  assert.equal(
    result.embedding.length,
    EMBEDDING_DIMENSIONS,
    `Embedding powinien mieć ${EMBEDDING_DIMENSIONS} wymiarów.`
  )

  result.embedding.forEach(
    (value, index) => {
      assert.ok(
        typeof value === "number" &&
          Number.isFinite(value),
        `Nieprawidłowa wartość embeddingu na pozycji ${index}.`
      )
    }
  )

  assert.ok(
    result.embedding.some(
      (value) => value !== 0
    ),
    "Embedding nie może składać się wyłącznie z zer."
  )

  const vectorMagnitude = Math.sqrt(
    result.embedding.reduce(
      (sum, value) =>
        sum + value * value,
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
    promptTokens:
      result.usage.promptTokens,
    totalTokens:
      result.usage.totalTokens,
  }
}

async function main() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error(
      "Brak OPENAI_API_KEY. Uruchom skrypt z opcją --env-file=.env.local."
    )
  }

  console.log(
    "Uruchamiam test embeddingu zapytania..."
  )

  const result =
    await createQueryEmbedding({
      query: TEST_QUERY,
    })

  const summary =
    assertEmbedding(result)

  console.log("\nWYNIK TESTU:")
  console.log(
    `Model: ${result.embedding_model}`
  )
  console.log(
    `Wymiary: ${result.embedding_dimensions}`
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
    "\nTEST EMBEDDINGU ZAPYTANIA: OK"
  )
}

try {
  await main()
} catch (error) {
  console.error(
    "\nTEST EMBEDDINGU ZAPYTANIA: BŁĄD"
  )

  console.error(
    error instanceof Error
      ? error.message
      : String(error)
  )

  process.exitCode = 1
}
