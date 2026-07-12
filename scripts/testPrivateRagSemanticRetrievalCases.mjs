import assert from "node:assert/strict"
import process from "node:process"

import {
  createClient,
} from "@supabase/supabase-js"

import {
  searchPrivateDocumentChunks,
} from "../lib/privateRag/searchPrivateDocumentChunks.js"

const TEST_MATCH_COUNT = 3

/*
  Ten zestaw dotyczy aktualnego dokumentu referencyjnego:
  „Zmienne w języku C++”.

  Test nie ustala jeszcze progu trafności.
  Zbiera dane diagnostyczne dla pytań:
  - jednoznacznie trafnych,
  - wymagających kilku chunków,
  - zawierających termin techniczny,
  - bez źródła w tej samej domenie,
  - całkowicie niezwiązanych.
*/
const TEST_CASES = [
  {
    key: "direct_answer",
    expectedSource: true,
    query:
      "Jak zadeklarować i zainicjalizować zmienną typu int w języku C++?",
  },
  {
    key: "multiple_chunks",
    expectedSource: true,
    query:
      "Wyjaśnij, czym jest zmienna oraz pokaż jej deklarację i inicjalizację w języku C++.",
  },
  {
    key: "technical_terms",
    expectedSource: true,
    query:
      "Jakie znaki mogą występować w nazwie zmiennej i od czego może zaczynać się jej nazwa?",
  },
  {
    key: "missing_same_domain",
    expectedSource: false,
    query:
      "Jak działa pętla for w języku C++?",
  },
  {
    key: "missing_unrelated",
    expectedSource: false,
    query:
      "Jak przebiega fotosynteza u roślin?",
  },
]

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
      "Brak embeddingów do przeprowadzenia testu."
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
    "Retrieval nie zwrócił obiektu."
  )

  assert.ok(
    result.resultCount > 0,
    "Retrieval nie zwrócił żadnego wyniku."
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
          "Wyniki nie są posortowane malejąco."
        )
      }
    }
  )
}

function getHeading(match) {
  if (
    !Array.isArray(match.heading_path) ||
    match.heading_path.length === 0
  ) {
    return "(bez nagłówka)"
  }

  return match.heading_path.join(" > ")
}

function getContentPreview(content) {
  return String(content || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 180)
}

function getSimilarity(
  matches,
  index
) {
  const value =
    matches[index]?.similarity

  return typeof value === "number"
    ? value
    : null
}

function formatSimilarity(value) {
  return typeof value === "number"
    ? value.toFixed(6)
    : "-"
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
    "Uruchamiam macierz testów semantic retrieval..."
  )

  console.log(
    `Dokument testowy: ${documentId}`
  )

  const summaries = []

  for (const testCase of TEST_CASES) {
    console.log(
      `\n==================================================`
    )

    console.log(
      `Przypadek: ${testCase.key}`
    )

    console.log(
      `Źródło oczekiwane: ${
        testCase.expectedSource
          ? "TAK"
          : "NIE"
      }`
    )

    console.log(
      `Zapytanie: ${testCase.query}`
    )

    const result =
      await searchPrivateDocumentChunks({
        supabaseAdmin,
        ownerId,
        documentIds: [documentId],
        query: testCase.query,
        matchCount:
          TEST_MATCH_COUNT,
      })

    assertRetrievalResult({
      result,
      expectedDocumentId: documentId,
    })

    result.matches.forEach(
      (match, index) => {
        console.log(
          `\n${index + 1}. Chunk ${match.chunk_index}`
        )

        console.log(
          `Similarity: ${match.similarity.toFixed(
            6
          )}`
        )

        console.log(
          `Nagłówek: ${getHeading(
            match
          )}`
        )

        console.log(
          `Treść: ${getContentPreview(
            match.content
          )}`
        )
      }
    )

    const top1 = getSimilarity(
      result.matches,
      0
    )

    const top2 = getSimilarity(
      result.matches,
      1
    )

    const top3 = getSimilarity(
      result.matches,
      2
    )

    summaries.push({
      key: testCase.key,
      expectedSource:
        testCase.expectedSource,
      top1,
      top2,
      top3,
      gap:
        typeof top1 === "number" &&
        typeof top2 === "number"
          ? top1 - top2
          : null,
    })
  }

  console.log(
    "\n=================================================="
  )

  console.log(
    "\nPODSUMOWANIE DIAGNOSTYCZNE:"
  )

  summaries.forEach((summary) => {
    console.log(
      [
        summary.key,
        `źródło: ${
          summary.expectedSource
            ? "TAK"
            : "NIE"
        }`,
        `top1: ${formatSimilarity(
          summary.top1
        )}`,
        `top2: ${formatSimilarity(
          summary.top2
        )}`,
        `top3: ${formatSimilarity(
          summary.top3
        )}`,
        `różnica 1-2: ${formatSimilarity(
          summary.gap
        )}`,
      ].join(" | ")
    )
  })

  console.log(
    "\nTEST TECHNICZNY MACIERZY RETRIEVAL: OK"
  )

  console.log(
    "Nie oznacza to jeszcze zatwierdzenia jakości ani progu trafności."
  )
}

try {
  await main()
} catch (error) {
  console.error(
    "\nTEST MACIERZY RETRIEVAL: BŁĄD"
  )

  console.error(
    error instanceof Error
      ? error.message
      : String(error)
  )

  process.exitCode = 1
}
