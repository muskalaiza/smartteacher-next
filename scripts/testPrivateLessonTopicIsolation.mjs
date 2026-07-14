import assert from "node:assert/strict"
import { randomUUID } from "node:crypto"
import process from "node:process"

import {
  createClient,
} from "@supabase/supabase-js"

import {
  searchPrivateLessonTopicChunks,
} from "../lib/privateRag/searchPrivateLessonTopicChunks.js"

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

async function getReferenceContext(
  supabaseAdmin
) {
  const {
    data: documentRows,
    error: documentError,
  } = await supabaseAdmin
    .from("teacher_documents")
    .select(
      [
        "id",
        "owner_id",
        "subject_id",
        "lesson_topic_id",
        "original_file_name",
        "status",
        "updated_at",
      ].join(", ")
    )
    .eq("status", "embedded")
    .not("lesson_topic_id", "is", null)
    .order("updated_at", {
      ascending: false,
    })
    .limit(1)

  if (documentError) {
    throw new Error(
      `Nie udało się pobrać dokumentu referencyjnego: ${documentError.message}`
    )
  }

  const document = documentRows?.[0]

  if (!document) {
    throw new Error(
      "Brak dokumentu embedded przypisanego do tematu lekcji."
    )
  }

  const {
    data: lessonTopic,
    error: lessonTopicError,
  } = await supabaseAdmin
    .from("lesson_topics")
    .select(
      "id, display_title, lesson_key"
    )
    .eq(
      "id",
      document.lesson_topic_id
    )
    .maybeSingle()

  if (lessonTopicError) {
    throw new Error(
      `Nie udało się pobrać tematu referencyjnego: ${lessonTopicError.message}`
    )
  }

  if (!lessonTopic) {
    throw new Error(
      "Nie znaleziono tematu referencyjnego."
    )
  }

  return {
    document,
    lessonTopic,
  }
}

async function getTopicWithoutSources({
  supabaseAdmin,
  ownerId,
  subjectId,
}) {
  const {
    data: catalogs,
    error: catalogsError,
  } = await supabaseAdmin
    .from("lesson_catalogs")
    .select("id")
    .eq("owner_id", ownerId)
    .eq("subject_id", subjectId)
    .eq(
      "source_type",
      "teacher_private"
    )
    .eq("is_active", true)

  if (catalogsError) {
    throw new Error(
      `Nie udało się pobrać katalogów nauczyciela: ${catalogsError.message}`
    )
  }

  const catalogIds = (
    catalogs || []
  ).map(
    (catalog) => catalog.id
  )

  if (catalogIds.length === 0) {
    throw new Error(
      "Brak aktywnego prywatnego katalogu lekcji."
    )
  }

  const {
    data: topics,
    error: topicsError,
  } = await supabaseAdmin
    .from("lesson_topics")
    .select(
      "id, display_title, lesson_key"
    )
    .in("catalog_id", catalogIds)
    .eq("is_active", true)
    .order("order_index", {
      ascending: true,
    })

  if (topicsError) {
    throw new Error(
      `Nie udało się pobrać tematów lekcji: ${topicsError.message}`
    )
  }

  const {
    data: documents,
    error: documentsError,
  } = await supabaseAdmin
    .from("teacher_documents")
    .select("lesson_topic_id")
    .eq("owner_id", ownerId)
    .eq("subject_id", subjectId)
    .eq(
      "source_type",
      "teacher_private"
    )
    .eq("status", "embedded")
    .not(
      "lesson_topic_id",
      "is",
      null
    )

  if (documentsError) {
    throw new Error(
      `Nie udało się pobrać przypisań dokumentów: ${documentsError.message}`
    )
  }

  const topicsWithSources =
    new Set(
      (documents || []).map(
        (document) =>
          document.lesson_topic_id
      )
    )

  const topicWithoutSources =
    (topics || []).find(
      (topic) =>
        !topicsWithSources.has(
          topic.id
        )
    )

  if (!topicWithoutSources) {
    throw new Error(
      "Nie znaleziono tematu bez dokumentów embedded."
    )
  }

  return topicWithoutSources
}

async function assertReturnedDocumentsScope({
  supabaseAdmin,
  result,
  expectedOwnerId,
  expectedSubjectId,
  expectedLessonTopicId,
}) {
  const documentIds =
    result.sourceDocuments.map(
      (document) => document.id
    )

  assert.ok(
    documentIds.length > 0,
    "Brak dokumentów źródłowych do kontroli zakresu."
  )

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
        "lesson_topic_id",
        "status",
      ].join(", ")
    )
    .in("id", documentIds)

  if (error) {
    throw new Error(
      `Nie udało się zweryfikować dokumentów źródłowych: ${error.message}`
    )
  }

  assert.equal(
    data?.length,
    documentIds.length,
    "Nie odczytano wszystkich dokumentów źródłowych."
  )

  data.forEach(
    (document, index) => {
      assert.equal(
        document.owner_id,
        expectedOwnerId,
        `Dokument ${index + 1} należy do innego właściciela.`
      )

      assert.equal(
        document.subject_id,
        expectedSubjectId,
        `Dokument ${index + 1} należy do innego przedmiotu.`
      )

      assert.equal(
        document.lesson_topic_id,
        expectedLessonTopicId,
        `Dokument ${index + 1} należy do innego tematu lekcji.`
      )

      assert.equal(
        document.status,
        "embedded",
        `Dokument ${index + 1} nie ma statusu embedded.`
      )
    }
  )
}

async function assertContextRejected({
  label,
  operation,
}) {
  let caughtError = null

  try {
    await operation()
  } catch (error) {
    caughtError = error
  }

  assert.ok(
    caughtError instanceof Error,
    `${label}: oczekiwano odrzucenia żądania.`
  )

  assert.match(
    caughtError.message,
    /nie należy do prywatnego katalogu aktualnego nauczyciela i przedmiotu/i,
    `${label}: zwrócono nieoczekiwany komunikat błędu.`
  )

  return caughtError.message
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
    document,
    lessonTopic,
  } = await getReferenceContext(
    supabaseAdmin
  )

  const query =
    `Wyjaśnij najważniejsze informacje dotyczące tematu: ${lessonTopic.display_title}.`

  console.log(
    "Uruchamiam test izolacji Private RAG..."
  )

  console.log(
    `Dokument referencyjny: ${document.original_file_name}`
  )

  console.log(
    `Temat referencyjny: ${lessonTopic.display_title}`
  )

  /*
    1. Poprawny kontekst.
  */
  const validResult =
    await searchPrivateLessonTopicChunks({
      supabaseAdmin,
      ownerId: document.owner_id,
      subjectId:
        document.subject_id,
      lessonTopicId:
        document.lesson_topic_id,
      query,
      matchCount:
        TEST_MATCH_COUNT,
    })

  assert.equal(
    validResult.status,
    "retrieved",
    "Poprawny kontekst nie zwrócił statusu retrieved."
  )

  assert.ok(
    validResult.retrieval
      ?.resultCount > 0,
    "Poprawny kontekst nie zwrócił chunków."
  )

  await assertReturnedDocumentsScope({
    supabaseAdmin,
    result: validResult,
    expectedOwnerId:
      document.owner_id,
    expectedSubjectId:
      document.subject_id,
    expectedLessonTopicId:
      document.lesson_topic_id,
  })

  console.log(
    "\n1. Poprawny właściciel, przedmiot i temat: OK"
  )

  console.log(
    `Dokumenty źródłowe: ${validResult.sourceDocumentCount}`
  )

  console.log(
    `Zwrócone chunki: ${validResult.retrieval.resultCount}`
  )

  /*
    2. Nieprawidłowy właściciel.
    Używamy poprawnego UUID, który nie odpowiada
    właścicielowi katalogu.
  */
  const wrongOwnerMessage =
    await assertContextRejected({
      label:
        "Nieprawidłowy ownerId",

      operation: () =>
        searchPrivateLessonTopicChunks({
          supabaseAdmin,
          ownerId: randomUUID(),
          subjectId:
            document.subject_id,
          lessonTopicId:
            document.lesson_topic_id,
          query,
          matchCount:
            TEST_MATCH_COUNT,
        }),
    })

  console.log(
    "\n2. Nieprawidłowy ownerId: ODRZUCONY"
  )

  console.log(
    `Komunikat: ${wrongOwnerMessage}`
  )

  /*
    3. Nieprawidłowy przedmiot.
  */
  const wrongSubjectMessage =
    await assertContextRejected({
      label:
        "Nieprawidłowy subjectId",

      operation: () =>
        searchPrivateLessonTopicChunks({
          supabaseAdmin,
          ownerId:
            document.owner_id,
          subjectId: randomUUID(),
          lessonTopicId:
            document.lesson_topic_id,
          query,
          matchCount:
            TEST_MATCH_COUNT,
        }),
    })

  console.log(
    "\n3. Nieprawidłowy subjectId: ODRZUCONY"
  )

  console.log(
    `Komunikat: ${wrongSubjectMessage}`
  )

  /*
    4. Inny prawidłowy temat tego samego
    nauczyciela i przedmiotu, ale bez źródeł.
  */
  const topicWithoutSources =
    await getTopicWithoutSources({
      supabaseAdmin,
      ownerId:
        document.owner_id,
      subjectId:
        document.subject_id,
    })

  const noSourcesResult =
    await searchPrivateLessonTopicChunks({
      supabaseAdmin,
      ownerId:
        document.owner_id,
      subjectId:
        document.subject_id,
      lessonTopicId:
        topicWithoutSources.id,
      query:
        `Wyjaśnij temat: ${topicWithoutSources.display_title}.`,
      matchCount:
        TEST_MATCH_COUNT,
    })

  assert.equal(
    noSourcesResult.status,
    "no_sources",
    "Inny temat bez źródeł nie zwrócił statusu no_sources."
  )

  assert.equal(
    noSourcesResult.sourceDocumentCount,
    0,
    "Inny temat otrzymał dokumenty źródłowe."
  )

  assert.deepEqual(
    noSourcesResult.sourceDocuments,
    [],
    "Lista źródeł innego tematu nie jest pusta."
  )

  assert.equal(
    noSourcesResult.retrieval,
    null,
    "Dla innego tematu bez źródeł uruchomiono retrieval."
  )

  console.log(
    "\n4. Inny lesson_topic_id bez źródeł: IZOLOWANY"
  )

  console.log(
    `Temat: ${topicWithoutSources.display_title}`
  )

  console.log(
    "Dokumenty źródłowe: 0"
  )

  console.log(
    "Semantic retrieval: pominięty"
  )

  console.log(
    "\nTEST IZOLACJI PRIVATE RAG: OK"
  )
}

try {
  await main()
} catch (error) {
  console.error(
    "\nTEST IZOLACJI PRIVATE RAG: BŁĄD"
  )

  console.error(
    error instanceof Error
      ? error.message
      : String(error)
  )

  process.exitCode = 1
}

/*
Uruchomienie testu
node --env-file=.env.local scripts\testPrivateLessonTopicIsolation.mjs
*/