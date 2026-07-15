import assert from "node:assert/strict"
import process from "node:process"

import {
  createClient,
} from "@supabase/supabase-js"

import {
  assessPrivateRagTaskTypeCoverage,
  PRIVATE_RAG_TASK_SUBTYPES,
} from "../lib/privateRag/assessPrivateRagTaskTypeCoverage.js"

import {
  buildPrivateRagContext,
} from "../lib/privateRag/buildPrivateRagContext.js"

import {
  searchPrivateLessonTopicChunks,
} from "../lib/privateRag/searchPrivateLessonTopicChunks.js"

const TEST_DOCUMENT_NAME =
  process.env
    .PRIVATE_RAG_COVERAGE_DOCUMENT_NAME
    ?.trim() ||
  "petla_for_CPP.docx"

const MAX_SOURCE_COUNT = 3
const MINIMUM_SIMILARITY = 0.55

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

async function getReferenceDocument(
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
          "lesson_topic_id",
          "original_file_name",
          "status",
          "created_at",
        ].join(", ")
      )
      .eq(
        "original_file_name",
        TEST_DOCUMENT_NAME
      )
      .eq("status", "embedded")
      .not(
        "lesson_topic_id",
        "is",
        null
      )
      .order("created_at", {
        ascending: false,
      })
      .limit(1)

  if (error) {
    throw new Error(
      `Nie udało się pobrać dokumentu testowego: ${error.message}`
    )
  }

  const document = data?.[0]

  if (!document) {
    throw new Error(
      `Nie znaleziono dokumentu embedded: ${TEST_DOCUMENT_NAME}.`
    )
  }

  return document
}

async function getLessonTopic({
  supabaseAdmin,
  lessonTopicId,
}) {
  const { data, error } =
    await supabaseAdmin
      .from("lesson_topics")
      .select(
        [
          "id",
          "display_title",
          "lesson_key",
        ].join(", ")
      )
      .eq(
        "id",
        lessonTopicId
      )
      .maybeSingle()

  if (error) {
    throw new Error(
      `Nie udało się pobrać tematu testowego: ${error.message}`
    )
  }

  if (!data) {
    throw new Error(
      "Nie znaleziono tematu testowego."
    )
  }

  return data
}

function getChunkPreview(content) {
  return String(content || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 180)
}

function assertStringArray(
  value,
  label
) {
  assert.ok(
    Array.isArray(value),
    `${label} nie jest tablicą.`
  )

  assert.ok(
    value.every(
      (item) =>
        typeof item === "string" &&
        item.trim()
    ),
    `${label} zawiera nieprawidłową wartość.`
  )
}

async function main() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error(
      "Brak OPENAI_API_KEY. Uruchom test z opcją --env-file=.env.local."
    )
  }

  const supabaseAdmin =
    createAdminClient()

  const document =
    await getReferenceDocument(
      supabaseAdmin
    )

  const lessonTopic =
    await getLessonTopic({
      supabaseAdmin,
      lessonTopicId:
        document.lesson_topic_id,
    })

  const query =
    process.env
      .PRIVATE_RAG_COVERAGE_QUERY
      ?.trim() ||
    `Wyjaśnij najważniejsze informacje, definicje, zasady, składnię, przykłady i typowe błędy dotyczące tematu: ${lessonTopic.display_title}.`

  console.log(
    "Uruchamiam ocenę pokrycia siedmiu typów zadań..."
  )

  console.log(
    `Dokument referencyjny: ${document.original_file_name}`
  )

  console.log(
    `Temat: ${lessonTopic.display_title}`
  )

  console.log(
    `Zapytanie retrieval: ${query}`
  )

  const retrievalResult =
    await searchPrivateLessonTopicChunks({
      supabaseAdmin,

      ownerId:
        document.owner_id,

      subjectId:
        document.subject_id,

      lessonTopicId:
        document.lesson_topic_id,

      query,
    })

  assert.equal(
    retrievalResult.status,
    "retrieved",
    `Test wymaga statusu retrieved, otrzymano: ${retrievalResult.status}.`
  )

  const sourceContext =
    buildPrivateRagContext({
      retrievalResult,
    })

  assert.equal(
    sourceContext.status,
    "ready",
    "Kontekst źródłowy nie otrzymał statusu ready."
  )

  assert.ok(
    sourceContext.sourceCount > 0 &&
      sourceContext.sourceCount <=
        MAX_SOURCE_COUNT,
    "Kontekst powinien zawierać od 1 do 3 zaakceptowanych chunków."
  )

  sourceContext.sources.forEach(
    (source) => {
      assert.ok(
        typeof source.similarity ===
          "number" &&
          source.similarity >=
            MINIMUM_SIMILARITY,
        `Źródło ${source.chunkId} ma similarity poniżej 0.55.`
      )
    }
  )

  console.log(
    `Zaakceptowane źródła: ${sourceContext.sourceCount}`
  )

  sourceContext.sources.forEach(
    (source) => {
      console.log(
        [
          `- ${source.originalFileName}`,
          `chunk ${source.chunkIndex}`,
          `similarity ${source.similarity.toFixed(6)}`,
          `[${source.chunkId}]`,
           getChunkPreview(
          source.content
        ),
        ].join(" | ")
      )
    }
  )

  const sourceContextSnapshot =
    JSON.stringify(
      sourceContext
    )

  const result =
    await assessPrivateRagTaskTypeCoverage({
      sourceContext,
    })

  assert.equal(
    JSON.stringify(
      sourceContext
    ),
    sourceContextSnapshot,
    "Ocena pokrycia zmodyfikowała sourceContext."
  )

  assert.equal(
    result.status,
    "assessed",
    "Ocena nie zakończyła się statusem assessed."
  )

  assert.equal(
    result.sourceCount,
    sourceContext.sourceCount,
    "Wynik oceny ma inną liczbę źródeł."
  )

  assert.deepEqual(
    result.sources,
    sourceContext.sources,
    "Wynik oceny zmienił źródła."
  )

  assert.ok(
    result.assessments &&
      typeof result.assessments ===
        "object",
    "Brak macierzy ocen."
  )

  assert.deepEqual(
    Object.keys(
      result.assessments
    ).sort(),
    [
      ...PRIVATE_RAG_TASK_SUBTYPES,
    ].sort(),
    "Nie oceniono dokładnie siedmiu typów zadań."
  )

  const sourceByChunkId =
    new Map(
      sourceContext.sources.map(
        (source) => [
          source.chunkId,
          source,
        ]
      )
    )

  console.log(
    "\nMACIERZ POKRYCIA:"
  )

  PRIVATE_RAG_TASK_SUBTYPES.forEach(
    (taskSubtype) => {
      const assessment =
        result.assessments[
          taskSubtype
        ]

      assert.equal(
        typeof assessment.isSupported,
        "boolean",
        `Typ ${taskSubtype} nie ma binarnej oceny isSupported.`
      )

      assertStringArray(
        assessment.evidenceChunkIds,
        `${taskSubtype}.evidenceChunkIds`
      )

      assertStringArray(
        assessment.missingEvidence,
        `${taskSubtype}.missingEvidence`
      )

      assertStringArray(
        assessment.constraints,
        `${taskSubtype}.constraints`
      )

      assert.ok(
        typeof assessment.evidenceSummary ===
          "string" &&
          assessment.evidenceSummary.trim(),
        `Typ ${taskSubtype} ma pusty evidenceSummary.`
      )

      assessment.evidenceChunkIds.forEach(
        (chunkId) => {
          assert.ok(
            sourceByChunkId.has(
              chunkId
            ),
            `Typ ${taskSubtype} wskazuje chunk spoza sourceContext: ${chunkId}.`
          )
        }
      )

      if (
        assessment.isSupported
      ) {
        assert.ok(
          assessment
            .evidenceChunkIds
            .length > 0,
          `Typ ${taskSubtype} ma status TAK bez dowodu.`
        )

        assert.equal(
          assessment
            .missingEvidence
            .length,
          0,
          `Typ ${taskSubtype} ma status TAK i jednocześnie braki.`
        )
      } else {
        assert.ok(
          assessment
            .missingEvidence
            .length > 0,
          `Typ ${taskSubtype} ma status NIE bez opisu braków.`
        )

        assert.equal(
          assessment
            .constraints
            .length,
          0,
          `Typ ${taskSubtype} ma status NIE i niepuste constraints.`
        )
      }

      console.log(
        "\n=================================================="
      )

      console.log(
        `Typ: ${taskSubtype}`
      )

      console.log(
        `Obsługiwany: ${
          assessment.isSupported
            ? "TAK"
            : "NIE"
        }`
      )

      console.log(
        `Dowód: ${assessment.evidenceSummary}`
      )

      console.log(
        `Braki: ${
          assessment.missingEvidence
            .length > 0
            ? assessment
                .missingEvidence
                .join(" | ")
            : "-"
        }`
      )

      console.log(
        `Ograniczenia: ${
          assessment.constraints
            .length > 0
            ? assessment
                .constraints
                .join(" | ")
            : "-"
        }`
      )

      console.log(
        "Chunki dowodowe:"
      )

      if (
        assessment.evidenceChunkIds
          .length === 0
      ) {
        console.log("- brak")
        return
      }

      assessment.evidenceChunkIds.forEach(
        (chunkId) => {
          const source =
            sourceByChunkId.get(
              chunkId
            )

          console.log(
            [
              `- ${source.originalFileName}`,
              `chunk ${source.chunkIndex}`,
              `[${chunkId}]`,
              getChunkPreview(
                source.content
              ),
            ].join(" | ")
          )
        }
      )
    }
  )

  const supportedTaskSubtypes =
    PRIVATE_RAG_TASK_SUBTYPES.filter(
      (taskSubtype) =>
        result.assessments[
          taskSubtype
        ].isSupported
    )

  const unsupportedTaskSubtypes =
    PRIVATE_RAG_TASK_SUBTYPES.filter(
      (taskSubtype) =>
        !result.assessments[
          taskSubtype
        ].isSupported
    )

  assert.equal(
    supportedTaskSubtypes.length +
      unsupportedTaskSubtypes.length,
    PRIVATE_RAG_TASK_SUBTYPES.length,
    "Podsumowanie nie obejmuje siedmiu typów zadań."
  )

  console.log(
    `\nObsługiwane typy (${supportedTaskSubtypes.length}): ${
      supportedTaskSubtypes.length > 0
        ? supportedTaskSubtypes.join(", ")
        : "brak"
    }`
  )

  console.log(
    `Nieobsługiwane typy (${unsupportedTaskSubtypes.length}): ${
      unsupportedTaskSubtypes.length > 0
        ? unsupportedTaskSubtypes.join(", ")
        : "brak"
    }`
  )

  console.log(
    "\nMETADANE OCENY:"
  )

  console.log(
    `Model: ${result.evaluationModel}`
  )

  console.log(
    `Prompt tokens: ${result.usage.promptTokens}`
  )

  console.log(
    `Completion tokens: ${result.usage.completionTokens}`
  )

  console.log(
    `Total tokens: ${result.usage.totalTokens}`
  )

  console.log(
    "\nTEST TECHNICZNY POKRYCIA TYPÓW ZADAŃ: OK"
  )

  console.log(
    "Wynik macierzy wymaga kontroli merytorycznej nauczyciela."
  )
}

try {
  await main()
} catch (error) {
  console.error(
    "\nTEST POKRYCIA TYPÓW ZADAŃ: BŁĄD"
  )

  console.error(
    error instanceof Error
      ? error.message
      : String(error)
  )

  process.exitCode = 1
}

/*
Uruchomienie testu:
node --env-file=.env.local scripts\testPrivateRagTaskTypeCoverage.mjs
*/