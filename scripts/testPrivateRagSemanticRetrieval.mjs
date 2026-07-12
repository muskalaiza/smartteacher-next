import assert from "node:assert/strict"
import process from "node:process"

import {
  createClient,
} from "@supabase/supabase-js"

import {
  searchPrivateDocumentChunks,
} from "../lib/privateRag/searchPrivateDocumentChunks.js"

const TEST_QUERY =
  process.env.PRIVATE_RAG_TEST_QUERY?.trim() ||
  "Jak zadeklarować i zainicjalizować zmienną typu int w języku C++?"

const TEST_MATCH_COUNT = 5

function getRequiredEnvironmentVariable(name) {
  const value = process.env[name]

  if (!value) {
    throw new Error(
      `Brak wymaganej zmiennej środowiskowej: ${name}.`
    )
  }

  return value
}

function getServerSupabaseKey() {
  const key =
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!key) {
    throw new Error(
      "Brak SUPABASE_SECRET_KEY albo SUPABASE_SERVICE_ROLE_KEY."
    )
  }

  return key
}

function createAdminClient() {
  return createClient(
    getRequiredEnvironmentVariable(
      "NEXT_PUBLIC_SUPABASE_URL"
    ),
    getServerSupabaseKey(),
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    }
  )
}

async function getLatestEmbeddedDocument(
  supabaseAdmin
) {
  const {
    data: embeddingRows,
    error: embeddingError,
  } = await supabaseAdmin
    .from("document_embeddings")
    .select(
      "owner_id, chunk_id, created_at"
    )
    .order("created_at", {
      ascending: false,
    })
    .limit(1)

  if (embeddingError) {
    throw new Error(
      `Nie udało się pobrać embeddingu testowego: ${embeddingError.message}`
    )
  }

  const latestEmbedding =
    embeddingRows?.[0]

  if (!latestEmbedding) {
    throw new Error(
      "Brak embeddingów do przeprowadzenia testu retrieval."
    )
  }

  const {
    data: chunkRows,
    error: chunkError,
  } = await supabaseAdmin
    .from("document_chunks")
    .select("document_id")
    .eq(
      "id",
      latestEmbedding.chunk_id
    )
    .eq(
      "owner_id",
      latestEmbedding.owner_id
    )
    .limit(1)

  if (chunkError) {
    throw new Error(
      `Nie udało się pobrać chunka testowego: ${chunkError.message}`
    )
  }

  const sourceChunk = chunkRows?.[0]

  if (!sourceChunk?.document_id) {
    throw new Error(
      "Nie znaleziono dokumentu dla embeddingu testowego."
    )
  }

  return {
    ownerId: latestEmbedding.owner_id,
    documentId: sourceChunk.document_id,
  }
}

function assertRetrievalResult({
  result,
  expectedDocumentId,
}) {
  assert.ok(
    result && typeof result === "object",
    "Retrieval nie zwrócił obiektu wyniku."
  )

  assert.equal(
    result.query,
    TEST_QUERY,
    "Retrieval zwrócił inne zapytanie."
  )

  assert.ok(
    result.resultCount > 0,
    "Retrieval nie zwrócił żadnego chunka."
  )

  assert.ok(
    result.resultCount <=
      TEST_MATCH_COUNT,
    "Retrieval zwrócił za dużo wyników."
  )

  assert.equal(
    result.matches.length,
    result.resultCount,
    "Liczba wyników nie odpowiada tablicy matches."
  )

  result.matches.forEach(
    (match, index) => {
      assert.equal(
        match.document_id,
        expectedDocumentId,
        `Wynik ${index + 1} pochodzi z innego dokumentu.`
      )

      assert.ok(
        typeof match.similarity ===
          "number" &&
          Number.isFinite(
            match.similarity
          ),
        `Wynik ${index + 1} ma nieprawidłowe similarity.`
      )

      if (index > 0) {
        assert.ok(
          result.matches[index - 1]
            .similarity >=
            match.similarity,
          "Wyniki nie są posortowane malejąco według similarity."
        )
      }
    }
  )
}

function getContentPreview(content) {
  return String(content || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 220)
}

async function main() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error(
      "Brak OPENAI_API_KEY. Uruchom test z opcją --env-file=.env.local."
    )
  }

  const supabaseAdmin =
    createAdminClient()

  const {
    ownerId,
    documentId,
  } = await getLatestEmbeddedDocument(
    supabaseAdmin
  )

  console.log(
    "Uruchamiam rzeczywisty semantic retrieval..."
  )

  console.log(`Zapytanie: ${TEST_QUERY}`)

  const result =
    await searchPrivateDocumentChunks({
      supabaseAdmin,
      ownerId,
      documentIds: [documentId],
      query: TEST_QUERY,
      matchCount: TEST_MATCH_COUNT,
    })

  assertRetrievalResult({
    result,
    expectedDocumentId: documentId,
  })

  console.log("\nWYNIKI RETRIEVAL:")

  result.matches.forEach(
    (match, index) => {
      const heading =
        match.heading_path.length > 0
          ? match.heading_path.join(
              " > "
            )
          : "(bez nagłówka)"

      console.log(
        `\n${index + 1}. Chunk ${match.chunk_index}`
      )

      console.log(
        `Similarity: ${match.similarity.toFixed(
          6
        )}`
      )

      console.log(
        `Nagłówek: ${heading}`
      )

      console.log(
        `Treść: ${getContentPreview(
          match.content
        )}`
      )
    }
  )

  console.log("\nMETADANE:")
  console.log(
    `Model: ${result.embeddingModel}`
  )

  console.log(
    `Wymiary: ${result.embeddingDimensions}`
  )

  console.log(
    `Liczba wyników: ${result.resultCount}`
  )

  console.log(
    `Prompt tokens: ${result.usage.promptTokens}`
  )

  console.log(
    `Total tokens: ${result.usage.totalTokens}`
  )

  console.log(
    "\nTEST SEMANTIC RETRIEVAL: OK"
  )
}

try {
  await main()
} catch (error) {
  console.error(
    "\nTEST SEMANTIC RETRIEVAL: BŁĄD"
  )

  console.error(
    error instanceof Error
      ? error.message
      : String(error)
  )

  process.exitCode = 1
}
