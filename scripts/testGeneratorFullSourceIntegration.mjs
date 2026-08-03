import assert from "node:assert/strict"
import {
  randomUUID,
} from "node:crypto"
import process from "node:process"

import {
  createClient,
} from "@supabase/supabase-js"

import {
  buildGenerationIdentity,
} from "../lib/generation/buildGenerationIdentity.js"

import {
  buildTaskPlan,
} from "../lib/generation/buildTaskPlan.js"

import {
  claimGeneratedMaterial,
  markGeneratedMaterialFailed,
  markGeneratedMaterialReady,
} from "../lib/generation/generatedMaterialsCache.js"

import {
  generateMaterialFromContext,
} from "../lib/generation/generateMaterialFromContext.js"

import {
  getLessonTopicSourceContext,
} from "../lib/generation/getLessonTopicSourceContext.js"

import {
  getMaterialContentSchemaVersion,
  isMaterialGenerationEnabled,
  normalizeMaterialType,
} from "../lib/generation/materialContracts.js"

const DOCX_MIME_TYPE =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document"

const MATERIAL_TYPE =
  normalizeMaterialType(
    process.env
      .GENERATOR_TEST_MATERIAL_TYPE ||
      "karta pracy"
  )

if (!isMaterialGenerationEnabled(MATERIAL_TYPE)) {
  throw new Error(
    `Nieobsługiwany GENERATOR_TEST_MATERIAL_TYPE: ${MATERIAL_TYPE || "[brak]"}.`
  )
}

const TASK_COUNT = Number(
  process.env.GENERATOR_TEST_TASK_COUNT || 5
)

if (![5, 6, 7].includes(TASK_COUNT)) {
  throw new Error(
    "GENERATOR_TEST_TASK_COUNT musi wynosić 5, 6 albo 7."
  )
}

const PROFILES =
  process.env.GENERATOR_TEST_PROFILES
    ?.split(",")
    .map((profile) => profile.trim())
    .filter(Boolean) ||
  [
    "Standard",
    "Dysleksja",
    "ADHD",
    "ASD",
    "Obcojęzyczny",
  ]

const GENERATOR_MODEL =
  process.env
    .GENERATOR_TEST_MODEL
    ?.trim() ||
  "gpt-4o-mini"

const CONTENT_SCHEMA_VERSION =
  getMaterialContentSchemaVersion(
    MATERIAL_TYPE
  )

function getRequiredEnvironmentVariable(
  name
) {
  const value =
    process.env[name]

  if (!value) {
    throw new Error(
      `Brak wymaganej zmiennej środowiskowej: ${name}.`
    )
  }

  return value
}

function getServerSupabaseKey() {
  const key =
    process.env
      .SUPABASE_SECRET_KEY ||
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
) {
  let query =
    supabaseAdmin
      .from("teacher_documents")
      .select(
        [
          "id",
          "owner_id",
          "subject_id",
          "lesson_topic_id",
          "original_file_name",
          "status",
          "ready_at",
        ].join(", ")
      )
      .eq(
        "mime_type",
        DOCX_MIME_TYPE
      )
      .in(
        "status",
        [
          "chunked",
          "embedded",
          "ready",
        ]
      )
      .not(
        "lesson_topic_id",
        "is",
        null
      )
      .not(
        "source_fingerprint",
        "is",
        null
      )
      .not(
        "source_manifest_version",
        "is",
        null
      )

  const requestedDocumentName =
    process.env
      .GENERATOR_TEST_DOCUMENT_NAME
      ?.trim()

  if (requestedDocumentName) {
    query = query.eq(
      "original_file_name",
      requestedDocumentName
    )
  }

  const {
    data,
    error,
  } =
    await query
      .order(
        "ready_at",
        {
          ascending: false,
          nullsFirst: false,
        }
      )
      .limit(1)

  if (error) {
    throw new Error(
      `Nie udało się pobrać dokumentu testowego: ${error.message}`
    )
  }

  const document =
    data?.[0]

  if (!document) {
    throw new Error(
      requestedDocumentName
        ? `Nie znaleziono gotowego dokumentu DOCX: ${requestedDocumentName}.`
        : "Nie znaleziono gotowego dokumentu DOCX przypisanego do tematu lekcji."
    )
  }

  return document
}

async function getReferenceMetadata({
  supabaseAdmin,
  document,
}) {
  const [
    topicResult,
    subjectResult,
  ] = await Promise.all([
    supabaseAdmin
      .from("lesson_topics")
      .select(
        "id, display_title, lesson_key"
      )
      .eq(
        "id",
        document.lesson_topic_id
      )
      .maybeSingle(),

    supabaseAdmin
      .from("subjects")
      .select(
        "id, name"
      )
      .eq(
        "id",
        document.subject_id
      )
      .maybeSingle(),
  ])

  if (topicResult.error) {
    throw new Error(
      `Nie udało się pobrać tematu testowego: ${topicResult.error.message}`
    )
  }

  if (!topicResult.data) {
    throw new Error(
      "Nie znaleziono tematu testowego."
    )
  }

  if (subjectResult.error) {
    throw new Error(
      `Nie udało się pobrać przedmiotu testowego: ${subjectResult.error.message}`
    )
  }

  if (!subjectResult.data) {
    throw new Error(
      "Nie znaleziono przedmiotu testowego."
    )
  }

  return {
    lessonTopic:
      topicResult.data,

    subject:
      subjectResult.data,
  }
}

function assertGeneratedMaterial({
  generatedMaterial,
  materialType,
  profiles,
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

  const isWorksheet =
    materialType === "karta pracy"

  if (isWorksheet) {
    assert.ok(
      typeof generatedMaterial.intro ===
        "string" &&
        generatedMaterial.intro.trim(),
      "Karta pracy nie zawiera intro."
    )

    assert.ok(
      Array.isArray(
        generatedMaterial.tip
      ) &&
        generatedMaterial.tip.length >= 1 &&
        generatedMaterial.tip.length <= 2,
      "Karta pracy nie zawiera prawidłowej mini-ściągawki."
    )
  } else {
    assert.equal(
      generatedMaterial.intro,
      ""
    )

    assert.deepEqual(
      generatedMaterial.tip,
      []
    )
  }

  const shouldGenerateGlossary =
    isWorksheet &&
    profiles.includes(
      "Obcojęzyczny"
    )

  if (shouldGenerateGlossary) {
    assert.ok(
      Array.isArray(
        generatedMaterial.glossary
      ) &&
        generatedMaterial.glossary.length >= 1 &&
        generatedMaterial.glossary.length <= 5,
      "Karta pracy dla profilu Obcojęzycznego nie zawiera prawidłowego słowniczka."
    )
  } else {
    assert.deepEqual(
      generatedMaterial.glossary,
      []
    )
  }

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

  const shouldGenerateAdhdSupport =
    profiles.includes("ADHD")

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

      if (shouldGenerateAdhdSupport) {
        assert.ok(
          task.adhdSupport &&
            typeof task.adhdSupport ===
              "object" &&
            Array.isArray(
              task.adhdSupport.steps
            ) &&
            task.adhdSupport.steps.length === 2,
          `Zadanie ${task.number} nie zawiera prawidłowego wsparcia ADHD.`
        )
      } else {
        assert.equal(
          task.adhdSupport,
          null,
          `Zadanie ${task.number} nie powinno zawierać wsparcia ADHD.`
        )
      }
    }
  )
}

async function deleteTestRecord({
  supabaseAdmin,
  ownerId,
  generatedMaterialId,
}) {
  if (!generatedMaterialId) {
    return
  }

  const {
    data,
    error,
  } =
    await supabaseAdmin
      .from("generated_materials")
      .delete()
      .eq(
        "id",
        generatedMaterialId
      )
      .eq(
        "owner_id",
        ownerId
      )
      .select("id")
      .maybeSingle()

  if (error) {
    throw new Error(
      `Nie udało się usunąć rekordu testowego generated_materials: ${error.message}`
    )
  }

  if (
    data?.id !==
      generatedMaterialId
  ) {
    throw new Error(
      "Nie potwierdzono usunięcia rekordu testowego generated_materials."
    )
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

  const document =
    await getReferenceDocument(
      supabaseAdmin
    )

  const {
    lessonTopic,
    subject,
  } =
    await getReferenceMetadata({
      supabaseAdmin,
      document,
    })

  const generatorVersion =
    `generator_integration_test_${randomUUID()}`

  let generatedMaterialId = null
  let reservationStartedAt = null

  console.log(
    "Uruchamiam integrację pełne źródło → Generator → atomowy cache..."
  )

  console.log(
    `Dokument: ${document.original_file_name}`
  )

  console.log(
    `Temat: ${lessonTopic.display_title}`
  )

  console.log(
    `Materiał: ${MATERIAL_TYPE}, ${TASK_COUNT} zadań, profile: ${PROFILES.join(", ")}`
  )

  try {
    const sourceResult =
      await getLessonTopicSourceContext({
        supabaseAdmin,

        ownerId:
          document.owner_id,

        subjectId:
          document.subject_id,

        lessonTopicId:
          document.lesson_topic_id,
      })

    assert.ok(
      sourceResult.chunkCount > 0,
      "Pełny kontekst nie zawiera chunków."
    )

    assert.equal(
      sourceResult.sourceContext,
      sourceResult.chunks
        .map(
          (chunk) =>
            chunk.content
        )
        .join("\n\n"),
      "sourceContext nie odpowiada pełnej treści dokumentu."
    )

    console.log(
      `Pełny sourceContext: ${sourceResult.chunkCount} chunków`
    )

    const taskPlan =
      buildTaskPlan({
        materialType:
          MATERIAL_TYPE,

        taskCount:
          TASK_COUNT,
      })

    assert.equal(
      taskPlan.length,
      TASK_COUNT
    )

    console.log(
      `TaskPlan: ${taskPlan
        .map(
          (entry) =>
            `${entry.number}. ${entry.taskSubtype}`
        )
        .join(" | ")}`
    )

    const identityInput = {
      sourceFingerprint:
        sourceResult
          .sourceFingerprint,

      lessonTopicId:
        lessonTopic.id,

      topicTitle:
        lessonTopic
          .display_title,

      materialType:
        MATERIAL_TYPE,

      taskCount:
        TASK_COUNT,

      profiles:
        PROFILES,

      taskPlan,
      generatorVersion,

      contentSchemaVersion:
        CONTENT_SCHEMA_VERSION,

      model:
        GENERATOR_MODEL,
    }

    const firstIdentity =
      buildGenerationIdentity(
        identityInput
      )

    const secondIdentity =
      buildGenerationIdentity(
        identityInput
      )

    assert.deepEqual(
      secondIdentity,
      firstIdentity,
      "Identyczne wejście nie daje deterministycznej tożsamości generowania."
    )

    const {
      generationFingerprint,
      generationManifest,
    } = firstIdentity

    const claimData = {
      ownerId:
        document.owner_id,

      subjectId:
        document.subject_id,

      lessonTopicId:
        lessonTopic.id,

      sourceDocumentId:
        sourceResult.documentId,

      subjectNameSnapshot:
        subject.name,

      topicTitleSnapshot:
        generationManifest
          .topicTitle,

      sourceFileNameSnapshot:
        sourceResult
          .sourceFilename,

      materialType:
        generationManifest
          .materialType,

      taskCount:
        generationManifest
          .taskCount,

      profiles:
        generationManifest
          .profiles,

      taskPlan:
        generationManifest
          .taskPlan,

      sourceFingerprint:
        generationManifest
          .sourceFingerprint,

      sourceManifestVersion:
        sourceResult
          .sourceManifestVersion,

      generationFingerprint,

      generatorVersion:
        generationManifest
          .generatorVersion,

      contentSchemaVersion:
        generationManifest
          .contentSchemaVersion,

      model:
        generationManifest.model,
    }

    const firstClaim =
      await claimGeneratedMaterial({
        supabaseAdmin,
        claimData,
      })

    assert.equal(
      firstClaim.state,
      "reserved",
      `Unikalny test powinien rozpocząć się od MISS/reserved, otrzymano: ${firstClaim.state}.`
    )

    generatedMaterialId =
      firstClaim
        .generatedMaterialId

    reservationStartedAt =
      firstClaim.startedAt

    console.log(
      "Pierwsze żądanie cache: MISS / reserved"
    )

    let generationResult

    try {
      generationResult =
        await generateMaterialFromContext({
          topicTitle:
            generationManifest
              .topicTitle,

          materialType:
            generationManifest
              .materialType,

          profiles:
            generationManifest
              .profiles,

          taskPlan:
            generationManifest
              .taskPlan,

          sourceContext:
            sourceResult
              .sourceContext,

          model:
            generationManifest
              .model,
        })
    } catch (generationError) {
      try {
        await markGeneratedMaterialFailed({
          supabaseAdmin,

          ownerId:
            document.owner_id,

          generatedMaterialId,
          reservationStartedAt,

          errorMessage:
            generationError instanceof Error
              ? generationError.message
              : String(
                  generationError
                ),
        })
      } catch (cacheFailureError) {
        console.error(
          "Nie udało się zapisać błędu Generatora w cache:",
          cacheFailureError instanceof Error
            ? cacheFailureError.message
            : String(
                cacheFailureError
              )
        )
      }

      throw generationError
    }

    assertGeneratedMaterial({
      generatedMaterial:
        generationResult.material,

      materialType:
        generationManifest
          .materialType,

      profiles:
        generationManifest
          .profiles,

      taskPlan:
        generationManifest
          .taskPlan,
    })

    assert.ok(
      generationResult.usage
        .totalTokens > 0,
      "Cache MISS powinien zużyć tokeny Generatora."
    )

    const readyRecord =
      await markGeneratedMaterialReady({
        supabaseAdmin,

        ownerId:
          document.owner_id,

        generatedMaterialId,
        reservationStartedAt,

        material:
          generationResult
            .material,

        usage:
          generationResult.usage,
      })

    assert.equal(
      readyRecord.status,
      "ready"
    )

    assert.deepEqual(
      readyRecord.material,
      generationResult.material
    )

    console.log(
      `Generator + parser: OK (${generationResult.usage.totalTokens} tokenów)`
    )

    const secondClaim =
      await claimGeneratedMaterial({
        supabaseAdmin,
        claimData,
      })

    assert.equal(
      secondClaim.state,
      "hit",
      `Drugie identyczne żądanie powinno zakończyć się HIT, otrzymano: ${secondClaim.state}.`
    )

    assert.equal(
      secondClaim.generatedMaterialId,
      generatedMaterialId,
      "Cache HIT zwrócił inny generatedMaterialId."
    )

    assert.equal(
      secondClaim.accessCount,
      readyRecord.accessCount + 1,
      "Cache HIT nie zwiększył access_count dokładnie o 1."
    )

    assert.deepEqual(
      secondClaim.material,
      generationResult.material,
      "content_json z cache HIT różni się od wyniku parsera."
    )

    console.log(
      "Drugie identyczne żądanie cache: HIT"
    )

    console.log(
      "Nowe tokeny przy HIT: 0"
    )

    console.log(
      "\nTEST INTEGRACJI PEŁNE ŹRÓDŁO → GENERATOR → CACHE: OK"
    )
  } finally {
    await deleteTestRecord({
      supabaseAdmin,

      ownerId:
        document.owner_id,

      generatedMaterialId,
    })

    if (generatedMaterialId) {
      console.log(
        "Rekord testowy generated_materials został usunięty."
      )
    }
  }
}

try {
  await main()
} catch (error) {
  console.error(
    "\nTEST INTEGRACJI PEŁNE ŹRÓDŁO → GENERATOR → CACHE: BŁĄD"
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
node --conditions=react-server --env-file=.env.local scripts\\testGeneratorFullSourceIntegration.mjs
*/
