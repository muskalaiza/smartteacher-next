import assert from "node:assert/strict"
import process from "node:process"

import {
  createClient,
} from "@supabase/supabase-js"

import {
  assessPrivateRagTaskTypeCoverage,
  PRIVATE_RAG_TASK_SUBTYPES,
} from "../lib/privateRag/assessPrivateRagTaskTypeCoverage.js"

const TEST_DOCUMENT_NAME =
  process.env
    .PRIVATE_RAG_COVERAGE_DOCUMENT_NAME
    ?.trim() ||
  "petla_for_CPP.docx"

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

const EXPECTED_SUPPORT_BY_DOCUMENT = {
  "petla_for_CPP.docx":
    Object.fromEntries(
      PRIVATE_RAG_TASK_SUBTYPES.map(
        (taskSubtype) => [
          taskSubtype,
          true,
        ]
      )
    ),

  "zmienne_CPP_semantic.docx":
    Object.fromEntries(
      PRIVATE_RAG_TASK_SUBTYPES.map(
        (taskSubtype) => [
          taskSubtype,
          true,
        ]
      )
    ),
}


function getServerSupabaseKey() {
  const key =
    process.env.SUPABASE_SECRET_KEY ||
    process.env
      .SUPABASE_SERVICE_ROLE_KEY

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
) 

{
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

function getChunkPreview(content) {
  return String(content || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 180)
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

    const expectedSupport =
  EXPECTED_SUPPORT_BY_DOCUMENT[
    document.original_file_name
  ]

if (!expectedSupport) {
  throw new Error(
    `Brak wyniku referencyjnego dla dokumentu: ${document.original_file_name}.`
  )
}

  console.log(
    "Uruchamiam ocenę pokrycia siedmiu typów zadań..."
  )

  console.log(
    `Dokument referencyjny: ${document.original_file_name}`
  )

  const result =
    await assessPrivateRagTaskTypeCoverage({
      supabaseAdmin,
      ownerId:
        document.owner_id,

      subjectId:
        document.subject_id,

      lessonTopicId:
        document.lesson_topic_id,

      matchCountPerTask: 5,
    })

  assert.equal(
    result.status,
    "assessed",
    "Ocena nie zakończyła się statusem assessed."
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

  const evidenceChunkById =
    new Map(
      result.evidenceChunks.map(
        (chunk) => [
          chunk.chunkId,
          chunk,
        ]
      )
    )

  console.log(
    `Temat: ${result.lessonTopic.displayTitle}`
  )

  console.log(
    `Dokumenty źródłowe: ${result.sourceDocuments.length}`
  )

  console.log(
    `Unikalne chunki dowodowe: ${result.evidenceChunks.length}`
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
  assessment.isSupported,
  expectedSupport[taskSubtype],
  `Nieprawidłowa ocena pokrycia typu ${taskSubtype} dla dokumentu ${document.original_file_name}.`
)

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
            ? assessment.constraints
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
          const chunk =
            evidenceChunkById.get(
              chunkId
            )

          assert.ok(
            chunk,
            `Nie znaleziono treści chunka ${chunkId}.`
          )

          console.log(
            [
              `- ${chunk.originalFileName}`,
              `chunk ${chunk.chunkIndex}`,
              `[${chunkId}]`,
              getChunkPreview(
                chunk.content
              ),
            ].join(" | ")
          )
        }
      )
    }
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
    "Wynik wymaga jeszcze kontroli merytorycznej nauczyciela."
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
