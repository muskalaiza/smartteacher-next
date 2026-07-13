import assert from "node:assert/strict"
import process from "node:process"

import {
  createClient,
} from "@supabase/supabase-js"

import {
  searchPrivateDocumentChunks,
} from "../lib/privateRag/searchPrivateDocumentChunks.js"

const DOCUMENT_NAMES = [
  "zmienne_CPP_semantic.docx",
  "petla_for_CPP.docx",
]

const TEST_MATCH_COUNT = 5

const TEST_CASES = [
  {
    key: "variables_document",
    query:
      "Jak zadeklarować i zainicjalizować zmienną typu int w języku C++?",
    expectedDocumentName:
      "zmienne_CPP_semantic.docx",
  },
  {
    key: "for_loop_document",
    query:
      "Jak działa pętla for w języku C++ i z jakich elementów składa się jej nagłówek?",
    expectedDocumentName:
      "petla_for_CPP.docx",
  },
  {
    key: "missing_unrelated",
    query:
      "Jak przebiega fotosynteza u roślin?",
    expectedDocumentName: null,
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

function selectDocumentSet(rows) {
  const documentsByOwner = new Map()

  rows.forEach((document) => {
    if (
      !document?.owner_id ||
      !document?.original_file_name
    ) {
      return
    }

    if (
      !documentsByOwner.has(
        document.owner_id
      )
    ) {
      documentsByOwner.set(
        document.owner_id,
        new Map()
      )
    }

    const ownerDocuments =
      documentsByOwner.get(
        document.owner_id
      )

    /*
      Dane są posortowane od najnowszych,
      dlatego zachowujemy pierwszy rekord
      dla danej nazwy dokumentu.
    */
    if (
      !ownerDocuments.has(
        document.original_file_name
      )
    ) {
      ownerDocuments.set(
        document.original_file_name,
        document
      )
    }
  })

  const completeSets = [
    ...documentsByOwner.entries(),
  ].filter(([, documents]) =>
    DOCUMENT_NAMES.every((name) =>
      documents.has(name)
    )
  )

  if (completeSets.length === 0) {
    throw new Error(
      "Nie znaleziono jednego właściciela posiadającego oba dokumenty embedded."
    )
  }

  if (completeSets.length > 1) {
    throw new Error(
      "Znaleziono kilka kont posiadających oba dokumenty. Test jest niejednoznaczny."
    )
  }

  const [
    ownerId,
    documentsByName,
  ] = completeSets[0]

  const documents =
    DOCUMENT_NAMES.map((name) =>
      documentsByName.get(name)
    )

  const subjectIds = new Set(
    documents.map(
      (document) =>
        document.subject_id
    )
  )

  if (subjectIds.size !== 1) {
    throw new Error(
      "Dokumenty testowe należą do różnych przedmiotów."
    )
  }

  return {
    ownerId,
    documents,
  }
}

async function getEmbeddedDocuments(
  supabaseAdmin
) {
  const {
    data,
    error,
  } = await supabaseAdmin
    .from("teacher_documents")
    .select(
      [
        "id",
        "owner_id",
        "subject_id",
        "original_file_name",
        "status",
        "created_at",
      ].join(", ")
    )
    .in(
      "original_file_name",
      DOCUMENT_NAMES
    )
    .eq("status", "embedded")
    .order("created_at", {
      ascending: false,
    })

  if (error) {
    throw new Error(
      `Nie udało się pobrać dokumentów testowych: ${error.message}`
    )
  }

  if (!Array.isArray(data)) {
    throw new Error(
      "Supabase nie zwrócił tablicy dokumentów."
    )
  }

  return selectDocumentSet(data)
}

function assertTechnicalResult({
  result,
  allowedDocumentIds,
}) {
  assert.ok(
    result &&
      typeof result === "object",
    "Retrieval nie zwrócił obiektu."
  )

  assert.ok(
    result.resultCount > 0,
    "Retrieval nie zwrócił wyników."
  )

  assert.equal(
    result.resultCount,
    result.matches.length,
    "Liczba wyników nie odpowiada matches."
  )

  result.matches.forEach(
    (match, index) => {
      assert.ok(
        allowedDocumentIds.has(
          match.document_id
        ),
        `Wynik ${index + 1} pochodzi z niedozwolonego dokumentu.`
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
    !Array.isArray(
      match.heading_path
    ) ||
    match.heading_path.length === 0
  ) {
    return "(bez nagłówka)"
  }

  return match.heading_path.join(
    " > "
  )
}

function getContentPreview(content) {
  return String(content || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 180)
}

function getBestScoresByDocument({
  matches,
  documentNameById,
}) {
  const bestScores = new Map()

  matches.forEach((match) => {
    const documentName =
      documentNameById.get(
        match.document_id
      )

    const currentScore =
      bestScores.get(documentName)

    if (
      currentScore === undefined ||
      match.similarity > currentScore
    ) {
      bestScores.set(
        documentName,
        match.similarity
      )
    }
  })

  return bestScores
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
    documents,
  } = await getEmbeddedDocuments(
    supabaseAdmin
  )

  const documentIds =
    documents.map(
      (document) => document.id
    )

  const allowedDocumentIds =
    new Set(documentIds)

  const documentNameById =
    new Map(
      documents.map((document) => [
        document.id,
        document.original_file_name,
      ])
    )

  console.log(
    "Uruchamiam retrieval dla dwóch dokumentów..."
  )

  documents.forEach((document) => {
    console.log(
      `- ${document.original_file_name}: ${document.id}`
    )
  })

  const summaries = []

  for (const testCase of TEST_CASES) {
    console.log(
      "\n=================================================="
    )

    console.log(
      `Przypadek: ${testCase.key}`
    )

    console.log(
      `Zapytanie: ${testCase.query}`
    )

    console.log(
      `Oczekiwany dokument: ${
        testCase.expectedDocumentName ||
        "BRAK ŹRÓDŁA"
      }`
    )

    const result =
      await searchPrivateDocumentChunks({
        supabaseAdmin,
        ownerId,
        documentIds,
        query: testCase.query,
        matchCount:
          TEST_MATCH_COUNT,
      })

    assertTechnicalResult({
      result,
      allowedDocumentIds,
    })

    result.matches.forEach(
      (match, index) => {
        const documentName =
          documentNameById.get(
            match.document_id
          )

        console.log(
          `\n${index + 1}. ${documentName} / chunk ${match.chunk_index}`
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

    const topMatch =
      result.matches[0]

    const actualTopDocumentName =
      documentNameById.get(
        topMatch.document_id
      )

    const bestScores =
      getBestScoresByDocument({
        matches: result.matches,
        documentNameById,
      })

    const expectedScore =
      testCase.expectedDocumentName
        ? bestScores.get(
            testCase.expectedDocumentName
          )
        : null

    const otherDocumentName =
      testCase.expectedDocumentName
        ? DOCUMENT_NAMES.find(
            (name) =>
              name !==
              testCase.expectedDocumentName
          )
        : null

    const otherScore =
      otherDocumentName
        ? bestScores.get(
            otherDocumentName
          )
        : null

    summaries.push({
      key: testCase.key,

      expectedDocumentName:
        testCase.expectedDocumentName,

      actualTopDocumentName,

      top1:
        topMatch.similarity,

      expectedScore,

      otherScore,

      routingOk:
        testCase.expectedDocumentName
          ? actualTopDocumentName ===
            testCase.expectedDocumentName
          : null,
    })
  }

  console.log(
    "\n=================================================="
  )

  console.log(
    "\nPODSUMOWANIE ROUTINGU:"
  )

  summaries.forEach((summary) => {
    console.log(
      [
        summary.key,
        `oczekiwany: ${
          summary.expectedDocumentName ||
          "BRAK"
        }`,
        `top dokument: ${summary.actualTopDocumentName}`,
        `top1: ${formatSimilarity(
          summary.top1
        )}`,
        `najlepszy oczekiwany: ${formatSimilarity(
          summary.expectedScore
        )}`,
        `najlepszy drugi: ${formatSimilarity(
          summary.otherScore
        )}`,
        `routing: ${
          summary.routingOk === null
            ? "DIAGNOSTYKA"
            : summary.routingOk
              ? "OK"
              : "NIE"
        }`,
      ].join(" | ")
    )
  })

  console.log(
    "\nTEST TECHNICZNY ROUTINGU MIĘDZY DOKUMENTAMI: OK"
  )

  console.log(
    "Nie oznacza to jeszcze zatwierdzenia progu ani statusu ready."
  )
}

try {
  await main()
} catch (error) {
  console.error(
    "\nTEST ROUTINGU MIĘDZY DOKUMENTAMI: BŁĄD"
  )

  console.error(
    error instanceof Error
      ? error.message
      : String(error)
  )

  process.exitCode = 1
}

/*
uruchamiam test poleceniem:
node --env-file=.env.local scripts\testPrivateRagCrossDocumentRetrieval.mjs
*/