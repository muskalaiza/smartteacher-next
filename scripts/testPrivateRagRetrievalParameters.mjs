import assert from "node:assert/strict"
import { performance } from "node:perf_hooks"
import process from "node:process"

import {
  createClient,
} from "@supabase/supabase-js"

import {
  chunkDocumentBlocks,
} from "../lib/privateRag/chunkDocumentBlocks.js"

import {
  createEmbeddingVectors,
} from "../lib/privateRag/createEmbeddingVectors.js"

const DOCUMENT_NAMES = [
  "zmienne_CPP_semantic.docx",
  "petla_for_CPP.docx",
]

const CHUNK_LIMITS = [
  1000,
  1600,
  2200,
]

const MATCH_COUNTS = [
  3,
  5,
]

const THRESHOLDS = [
  0.45,
  0.5,
  0.55,
]

const TEST_CASES = [
  {
    key: "variables_declaration",
    query:
      "Jak zadeklarować i zainicjalizować zmienną typu int w języku C++?",
    expectedSource: true,
    expectedDocumentName:
      "zmienne_CPP_semantic.docx",
    requiredTerms: [
      "int liczba",
      "inicjalizacja",
    ],
  },

  {
    key: "variables_naming",
    query:
      "Jakie znaki mogą występować w nazwie zmiennej i od czego może zaczynać się jej nazwa?",
    expectedSource: true,
    expectedDocumentName:
      "zmienne_CPP_semantic.docx",
    requiredTerms: [
      "litery",
      "cyfry",
      "podkreślenie",
    ],
  },

  {
    key: "for_header",
    query:
      "Z jakich elementów składa się nagłówek pętli for w języku C++ i jaką rolę pełni każdy z nich?",
    expectedSource: true,
    expectedDocumentName:
      "petla_for_CPP.docx",
    requiredTerms: [
      "inicjalizacja",
      "warunek",
      "iteracja",
    ],
  },

  {
    key: "for_errors",
    query:
      "Jakie typowe błędy można popełnić podczas zapisywania pętli for w języku C++?",
    expectedSource: true,
    expectedDocumentName:
      "petla_for_CPP.docx",
    requiredTerms: [
      "błąd",
      "for",
    ],
  },

  {
    key: "missing_same_domain",
    query:
      "Jak działa instrukcja switch w języku C++?",
    expectedSource: false,
    expectedDocumentName: null,
    requiredTerms: [],
  },

  {
    key: "missing_unrelated",
    query:
      "Jak przebiega fotosynteza u roślin?",
    expectedSource: false,
    expectedDocumentName: null,
    requiredTerms: [],
  },
]

function getRequiredEnvironmentVariable(
  name
) {
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

function normalizeText(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
}

function formatNumber(value) {
  return Number.isFinite(value)
    ? value.toFixed(6)
    : "-"
}

function formatMilliseconds(value) {
  return Number.isFinite(value)
    ? `${value.toFixed(0)} ms`
    : "-"
}

function cosineSimilarity(
  leftVector,
  rightVector
) {
  if (
    !Array.isArray(leftVector) ||
    !Array.isArray(rightVector) ||
    leftVector.length === 0 ||
    leftVector.length !==
      rightVector.length
  ) {
    throw new Error(
      "Nie można obliczyć cosine similarity dla niezgodnych wektorów."
    )
  }

  let dotProduct = 0
  let leftMagnitudeSquared = 0
  let rightMagnitudeSquared = 0

  for (
    let index = 0;
    index < leftVector.length;
    index += 1
  ) {
    const leftValue =
      leftVector[index]

    const rightValue =
      rightVector[index]

    dotProduct +=
      leftValue * rightValue

    leftMagnitudeSquared +=
      leftValue * leftValue

    rightMagnitudeSquared +=
      rightValue * rightValue
  }

  const denominator =
    Math.sqrt(
      leftMagnitudeSquared
    ) *
    Math.sqrt(
      rightMagnitudeSquared
    )

  if (
    !Number.isFinite(denominator) ||
    denominator === 0
  ) {
    throw new Error(
      "Wektor embeddingu ma nieprawidłową długość."
    )
  }

  return dotProduct / denominator
}

async function getReferenceDocuments(
  supabaseAdmin
) {
  const { data, error } =
    await supabaseAdmin
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

  const latestDocumentByName =
    new Map()

  ;(data || []).forEach(
    (document) => {
      if (
        !latestDocumentByName.has(
          document.original_file_name
        )
      ) {
        latestDocumentByName.set(
          document.original_file_name,
          document
        )
      }
    }
  )

  const documents =
    DOCUMENT_NAMES.map(
      (documentName) =>
        latestDocumentByName.get(
          documentName
        )
    )

  if (
    documents.some(
      (document) => !document
    )
  ) {
    throw new Error(
      "Nie znaleziono obu dokumentów referencyjnych ze statusem embedded."
    )
  }

  const ownerIds =
    new Set(
      documents.map(
        (document) =>
          document.owner_id
      )
    )

  const subjectIds =
    new Set(
      documents.map(
        (document) =>
          document.subject_id
      )
    )

  if (ownerIds.size !== 1) {
    throw new Error(
      "Dokumenty referencyjne należą do różnych właścicieli."
    )
  }

  if (subjectIds.size !== 1) {
    throw new Error(
      "Dokumenty referencyjne należą do różnych przedmiotów."
    )
  }

  return documents
}

async function getDocumentBlocks({
  supabaseAdmin,
  documents,
}) {
  const documentIds =
    documents.map(
      (document) => document.id
    )

  const ownerId =
    documents[0].owner_id

  const { data, error } =
    await supabaseAdmin
      .from("document_blocks")
      .select(
        [
          "document_id",
          "block_index",
          "block_type",
          "heading_path",
          "content",
          "content_hash",
          "is_excluded",
          "exclude_reason",
        ].join(", ")
      )
      .in(
        "document_id",
        documentIds
      )
      .eq("owner_id", ownerId)
      .order("block_index", {
        ascending: true,
      })

  if (error) {
    throw new Error(
      `Nie udało się pobrać bloków dokumentów: ${error.message}`
    )
  }

  const blocksByDocumentId =
    new Map(
      documentIds.map(
        (documentId) => [
          documentId,
          [],
        ]
      )
    )

  ;(data || []).forEach(
    (block) => {
      blocksByDocumentId
        .get(block.document_id)
        ?.push(block)
    }
  )

  documents.forEach(
    (document) => {
      const blocks =
        blocksByDocumentId.get(
          document.id
        )

      if (
        !Array.isArray(blocks) ||
        blocks.length === 0
      ) {
        throw new Error(
          `Dokument ${document.original_file_name} nie ma bloków źródłowych.`
        )
      }
    }
  )

  return blocksByDocumentId
}

function buildChunkVariant({
  documents,
  blocksByDocumentId,
  maxChunkChars,
}) {
  const chunks = []

  documents.forEach(
    (document) => {
      const chunkingResult =
        chunkDocumentBlocks({
          blocks:
            blocksByDocumentId.get(
              document.id
            ),

          documentId:
            document.id,

          maxChunkChars,
        })

      chunkingResult.chunks.forEach(
        (chunk) => {
          chunks.push({
            ...chunk,

            documentName:
              document.original_file_name,
          })
        }
      )
    }
  )

  return chunks
}

function rankChunks({
  chunks,
  chunkEmbeddings,
  queryEmbedding,
}) {
  return chunks
    .map(
      (chunk, index) => ({
        ...chunk,

        similarity:
          cosineSimilarity(
            queryEmbedding,
            chunkEmbeddings[index]
          ),
      })
    )
    .sort(
      (left, right) =>
        right.similarity -
        left.similarity
    )
}

function hasRequiredEvidence({
  matches,
  requiredTerms,
}) {
  if (requiredTerms.length === 0) {
    return true
  }

  const context =
    normalizeText(
      matches
        .map(
          (match) =>
            match.content
        )
        .join("\n\n")
    )

  return requiredTerms.every(
    (term) =>
      context.includes(
        normalizeText(term)
      )
  )
}

function evaluateConfiguration({
  rankingsByCase,
  matchCount,
  threshold,
}) {
  let acceptedPositive = 0
  let rejectedNegative = 0

  let falseAccept = 0
  let falseReject = 0
  let wrongDocument = 0
  let incompleteEvidence = 0

  let totalContextChars = 0
  let acceptedCaseCount = 0

  TEST_CASES.forEach(
    (testCase) => {
      const ranking =
        rankingsByCase.get(
          testCase.key
        )

      const topMatch =
        ranking?.[0]

      if (!topMatch) {
        throw new Error(
          `Brak rankingu dla przypadku ${testCase.key}.`
        )
      }

      const accepted =
        topMatch.similarity >=
        threshold

      const acceptedMatches =
        ranking
          .slice(0, matchCount)
          .filter(
            (match) =>
              match.similarity >=
              threshold
          )

      if (accepted) {
        acceptedCaseCount += 1

        totalContextChars +=
          acceptedMatches.reduce(
            (sum, match) =>
              sum +
              match.content.length,
            0
          )
      }

      if (testCase.expectedSource) {
        if (!accepted) {
          falseReject += 1
          return
        }

        if (
          topMatch.documentName !==
          testCase.expectedDocumentName
        ) {
          wrongDocument += 1
          return
        }

        if (
          !hasRequiredEvidence({
            matches:
              acceptedMatches,
            requiredTerms:
              testCase.requiredTerms,
          })
        ) {
          incompleteEvidence += 1
          return
        }

        acceptedPositive += 1
        return
      }

      if (accepted) {
        falseAccept += 1
      } else {
        rejectedNegative += 1
      }
    }
  )

  const averageContextChars =
    acceptedCaseCount > 0
      ? totalContextChars /
        acceptedCaseCount
      : 0

  return {
    matchCount,
    threshold,

    acceptedPositive,
    rejectedNegative,

    falseAccept,
    falseReject,
    wrongDocument,
    incompleteEvidence,

    averageContextChars,

    errorCount:
      falseAccept +
      falseReject +
      wrongDocument +
      incompleteEvidence,
  }
}

async function main() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error(
      "Brak OPENAI_API_KEY. Uruchom test z opcją --env-file=.env.local."
    )
  }

  const supabaseAdmin =
    createAdminClient()

  const documents =
    await getReferenceDocuments(
      supabaseAdmin
    )

  const blocksByDocumentId =
    await getDocumentBlocks({
      supabaseAdmin,
      documents,
    })

  console.log(
    "Uruchamiam test parametrów semantic retrieval..."
  )

  console.log(
    "\nDOKUMENTY REFERENCYJNE:"
  )

  documents.forEach(
    (document) => {
      console.log(
        `- ${document.original_file_name}`
      )
    }
  )

  /*
    Embeddingi pytań są wspólne dla
    wszystkich wariantów chunkingu.
  */
  const queryEmbeddingStartedAt =
    performance.now()

  const queryEmbeddingResult =
    await createEmbeddingVectors({
      inputs:
        TEST_CASES.map(
          (testCase) =>
            testCase.query
        ),
    })

  const queryEmbeddingDuration =
    performance.now() -
    queryEmbeddingStartedAt

  const variantResults = []

  for (
    const maxChunkChars of
    CHUNK_LIMITS
  ) {
    const chunks =
      buildChunkVariant({
        documents,
        blocksByDocumentId,
        maxChunkChars,
      })

    const chunkEmbeddingStartedAt =
      performance.now()

    const chunkEmbeddingResult =
      await createEmbeddingVectors({
        inputs:
          chunks.map(
            (chunk) =>
              chunk.content
          ),
      })

    const chunkEmbeddingDuration =
      performance.now() -
      chunkEmbeddingStartedAt

    assert.equal(
      chunkEmbeddingResult
        .embeddings.length,
      chunks.length,
      "Liczba embeddingów nie odpowiada liczbie chunków."
    )

    const rankingsByCase =
      new Map()

    TEST_CASES.forEach(
      (testCase, index) => {
        const ranking =
          rankChunks({
            chunks,

            chunkEmbeddings:
              chunkEmbeddingResult
                .embeddings,

            queryEmbedding:
              queryEmbeddingResult
                .embeddings[index],
          })

        rankingsByCase.set(
          testCase.key,
          ranking
        )

        if (
          testCase.expectedSource
        ) {
          assert.equal(
            ranking[0]
              .documentName,
            testCase
              .expectedDocumentName,
            `Dla ${testCase.key} pierwszy wynik pochodzi z niewłaściwego dokumentu przy limicie ${maxChunkChars}.`
          )
        }
      }
    )

    const configurations = []

    MATCH_COUNTS.forEach(
      (matchCount) => {
        THRESHOLDS.forEach(
          (threshold) => {
            configurations.push(
              evaluateConfiguration({
                rankingsByCase,
                matchCount,
                threshold,
              })
            )
          }
        )
      }
    )

    variantResults.push({
      maxChunkChars,
      chunks,
      rankingsByCase,
      configurations,

      embeddingUsage:
        chunkEmbeddingResult.usage,

      embeddingDuration:
        chunkEmbeddingDuration,
    })
  }

  console.log(
    "\nEMBEDDINGI ZAPYTAŃ:"
  )

  console.log(
    `Prompt tokens: ${queryEmbeddingResult.usage.promptTokens}`
  )

  console.log(
    `Total tokens: ${queryEmbeddingResult.usage.totalTokens}`
  )

  console.log(
    `Czas: ${formatMilliseconds(queryEmbeddingDuration)}`
  )

  console.log(
    "\nWARIANTY CHUNKINGU:"
  )

  variantResults.forEach(
    (variant) => {
      const chunkLengths =
        variant.chunks.map(
          (chunk) =>
            chunk.content.length
        )

      const averageLength =
        chunkLengths.reduce(
          (sum, length) =>
            sum + length,
          0
        ) /
        chunkLengths.length

      console.log(
        [
          `limit=${variant.maxChunkChars}`,
          `chunki=${variant.chunks.length}`,
          `średnio=${averageLength.toFixed(0)} znaków`,
          `maksymalnie=${Math.max(...chunkLengths)} znaków`,
          `embedding tokens=${variant.embeddingUsage.totalTokens}`,
          `czas=${formatMilliseconds(variant.embeddingDuration)}`,
        ].join(" | ")
      )
    }
  )

  console.log(
    "\nTOP 1 DLA PYTAŃ:"
  )

  variantResults.forEach(
    (variant) => {
      console.log(
        `\n--- maxChunkChars=${variant.maxChunkChars} ---`
      )

      TEST_CASES.forEach(
        (testCase) => {
          const topMatch =
            variant.rankingsByCase
              .get(testCase.key)[0]

          console.log(
            [
              testCase.key,
              `similarity=${formatNumber(topMatch.similarity)}`,
              `dokument=${topMatch.documentName}`,
              `chunk=${topMatch.chunk_index}`,
            ].join(" | ")
          )
        }
      )
    }
  )

  console.log(
    "\nPORÓWNANIE KONFIGURACJI:"
  )

  const allConfigurations = []

  variantResults.forEach(
    (variant) => {
      variant.configurations.forEach(
        (configuration) => {
          const row = {
            maxChunkChars:
              variant.maxChunkChars,

            ...configuration,
          }

          allConfigurations.push(
            row
          )

          console.log(
            [
              `limit=${row.maxChunkChars}`,
              `top=${row.matchCount}`,
              `próg=${row.threshold.toFixed(2)}`,
              `trafne=${row.acceptedPositive}/4`,
              `odrzucone bez źródła=${row.rejectedNegative}/2`,
              `false accept=${row.falseAccept}`,
              `false reject=${row.falseReject}`,
              `zły dokument=${row.wrongDocument}`,
              `niepełny kontekst=${row.incompleteEvidence}`,
              `średni kontekst=${row.averageContextChars.toFixed(0)} znaków`,
              `błędy=${row.errorCount}`,
            ].join(" | ")
          )
        }
      )
    }
  )

  const minimumErrorCount =
    Math.min(
      ...allConfigurations.map(
        (configuration) =>
          configuration.errorCount
      )
    )

  const bestCandidates =
    allConfigurations
      .filter(
        (configuration) =>
          configuration.errorCount ===
          minimumErrorCount
      )
      .sort(
        (left, right) =>
          left.falseAccept -
            right.falseAccept ||
          left.averageContextChars -
            right.averageContextChars
      )

  console.log(
    "\nNAJLEPSI KANDYDACI DIAGNOSTYCZNI:"
  )

  bestCandidates
    .slice(0, 6)
    .forEach(
      (candidate) => {
        console.log(
          [
            `limit=${candidate.maxChunkChars}`,
            `top=${candidate.matchCount}`,
            `próg=${candidate.threshold.toFixed(2)}`,
            `błędy=${candidate.errorCount}`,
            `false accept=${candidate.falseAccept}`,
            `średni kontekst=${candidate.averageContextChars.toFixed(0)} znaków`,
          ].join(" | ")
        )
      }
    )

  console.log(
    "\nTEST TECHNICZNY PARAMETRÓW RETRIEVALU: OK"
  )

  console.log(
    "Wynik nie zatwierdza jeszcze automatycznie wartości produkcyjnych."
  )
}

try {
  await main()
} catch (error) {
  console.error(
    "\nTEST PARAMETRÓW RETRIEVALU: BŁĄD"
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
node --env-file=.env.local scripts\testPrivateRagRetrievalParameters.mjs
Konfiguracja robocza po teście:
const PRIVATE_RAG_MATCH_COUNT = 3
const PRIVATE_RAG_MIN_SIMILARITY = 0.55
const DEFAULT_MAX_CHUNK_CHARS = 1600
*/

