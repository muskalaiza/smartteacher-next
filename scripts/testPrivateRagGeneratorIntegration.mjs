import assert from "node:assert/strict"
import process from "node:process"

import {
  createClient,
} from "@supabase/supabase-js"

import {
  assessPrivateRagTaskTypeCoverage,
} from "../lib/privateRag/assessPrivateRagTaskTypeCoverage.js"

import {
  buildPrivateRagContext,
} from "../lib/privateRag/buildPrivateRagContext.js"

import {
  searchPrivateLessonTopicChunks,
} from "../lib/privateRag/searchPrivateLessonTopicChunks.js"

import {
  buildSafeTaskPlan,
} from "../lib/generation/buildSafeTaskPlan.js"

import {
  generateMaterialFromContext,
} from "../lib/generation/generateMaterialFromContext.js"

const TEST_DOCUMENT_NAME =
  process.env
    .PRIVATE_RAG_GENERATOR_DOCUMENT_NAME
    ?.trim() ||
  "petla_for_CPP.docx"

const MATERIAL_TYPE =
  "kartkówka"

const TASK_COUNT = 5

const PROFILES = [
  "Standard",
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
      .eq(
        "status",
        "embedded"
      )
      .not(
        "lesson_topic_id",
        "is",
        null
      )
      .order(
        "created_at",
        {
          ascending: false,
        }
      )
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

function assertGeneratedMaterial({
  generatedMaterial,
  taskPlan,
}) {
  assert.ok(
    generatedMaterial &&
      typeof generatedMaterial ===
        "object" &&
      !Array.isArray(
        generatedMaterial
      ),

    "Generator nie zwrócił obiektu materiału."
  )

  assert.equal(
    generatedMaterial.intro,
    ""
  )

  assert.deepEqual(
    generatedMaterial.tip,
    []
  )

  assert.deepEqual(
    generatedMaterial.glossary,
    []
  )

  assert.ok(
    Array.isArray(
      generatedMaterial.tasks
    ),

    "Wygenerowany materiał nie zawiera tablicy tasks."
  )

  assert.equal(
    generatedMaterial.tasks.length,
    taskPlan.length,
    "Liczba wygenerowanych zadań nie odpowiada taskPlan."
  )

  generatedMaterial.tasks.forEach(
    (task, index) => {
      const planEntry =
        taskPlan[index]

      assert.equal(
        task.number,
        planEntry.number,
        `Nieprawidłowy numer zadania na pozycji ${index + 1}.`
      )

      assert.equal(
        task.taskSubtype,
        planEntry.taskSubtype,
        `Nieprawidłowy typ zadania na pozycji ${index + 1}.`
      )

      assert.ok(
        typeof task.question ===
          "string" &&
          task.question.trim(),

        `Zadanie ${task.number} nie ma prawidłowej treści question.`
      )

      assert.equal(
        task.adhdSupport,
        null,
        `Zadanie ${task.number} nie powinno zawierać wsparcia ADHD dla profilu Standard.`
      )
    }
  )
}

async function main() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error(
      "Brak OPENAI_API_KEY. Uruchom test z opcją --env-file=.env.local."
    )
  }

  console.log(
    "Uruchamiam integrację Private RAG → Generator..."
  )

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
      .PRIVATE_RAG_GENERATOR_QUERY
      ?.trim() ||
    `Wyjaśnij najważniejsze informacje, definicje, zasady, składnię, przykłady i typowe błędy dotyczące tematu: ${lessonTopic.display_title}.`

  console.log(
    `Dokument: ${document.original_file_name}`
  )

  console.log(
    `Temat: ${lessonTopic.display_title}`
  )

  console.log(
    `Materiał: ${MATERIAL_TYPE}, ${TASK_COUNT} zadań, profil Standard`
  )

  /*
    1. Retrieval prywatnych źródeł
  */
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
    `Retrieval zakończył się statusem: ${retrievalResult.status}.`
  )

  /*
    2. Audytowalny sourceContext
  */
  const sourceContext =
    buildPrivateRagContext({
      retrievalResult,
    })

  assert.equal(
    sourceContext.status,
    "ready",
    "sourceContext nie otrzymał statusu ready."
  )

  assert.ok(
    typeof sourceContext.ragContext ===
      "string" &&
      sourceContext.ragContext.trim(),

    "sourceContext nie zawiera tekstowego ragContext."
  )

  console.log(
    `Zaakceptowane źródła: ${sourceContext.sourceCount}`
  )

  /*
    3. Jedna ocena pokrycia siedmiu typów
  */
  const coverageResult =
    await assessPrivateRagTaskTypeCoverage({
      sourceContext,
    })

  assert.equal(
    coverageResult.status,
    "assessed",
    "Coverage nie zakończyło się statusem assessed."
  )

  /*
    4. Bezpieczny taskPlan
  */
  const taskPlanResult =
    buildSafeTaskPlan({
      assessments:
        coverageResult.assessments,

      materialType:
        MATERIAL_TYPE,

      taskCount:
        TASK_COUNT,
    })

  assert.equal(
    taskPlanResult.status,
    "ready",

    [
      "Nie można uruchomić Generatora, ponieważ bezpieczny taskPlan nie powstał.",
      `Nieobsługiwane typy: ${
        taskPlanResult
          .unsupportedTaskSubtypes
          .join(", ") ||
        "brak danych"
      }.`,
    ].join(" ")
  )

  const { taskPlan } =
    taskPlanResult

  console.log(
    `Bezpieczny taskPlan: ${taskPlan
      .map(
        (entry) =>
          `${entry.number}. ${entry.taskSubtype}`
      )
      .join(" | ")}`
  )

  /*
    5. Structured Outputs + model + parser
  */
  const generatedMaterial =
    await generateMaterialFromContext({
      topic:
        lessonTopic.display_title,

      type:
        MATERIAL_TYPE,

      profiles:
        PROFILES,

      taskPlan,

      ragContext:
        sourceContext.ragContext,
    })

  /*
    6. Kontrola technicznego kontraktu
  */
  assertGeneratedMaterial({
    generatedMaterial,
    taskPlan,
  })

  console.log(
    "\nWYGENEROWANE ZADANIA:"
  )

  generatedMaterial.tasks.forEach(
    (task) => {
      console.log(
        `${task.number}. [${task.taskSubtype}] ${task.question}`
      )
    }
  )

  console.log(
    "\nTEST INTEGRACJI PRIVATE RAG → GENERATOR: OK"
  )

  console.log(
    "Treść zadań wymaga teraz kontroli merytorycznej nauczyciela."
  )
}

try {
  await main()
} catch (error) {
  console.error(
    "\nTEST INTEGRACJI PRIVATE RAG → GENERATOR: BŁĄD"
  )

  console.error(
    error instanceof Error
      ? error.message
      : String(error)
  )

  process.exitCode = 1
}

/*
Uruchomienie:
node --env-file=.env.local scripts\testPrivateRagGeneratorIntegration.mjs
To wykonanie zawiera dwa wywołania modelu:
1. ocena coverage siedmiu typów,
2. wygenerowanie pięciu zadań.
*/