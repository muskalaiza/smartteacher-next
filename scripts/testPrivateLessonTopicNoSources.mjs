import assert from "node:assert/strict"
import process from "node:process"

import {
  createClient,
} from "@supabase/supabase-js"

import {
  searchPrivateLessonTopicChunks,
} from "../lib/privateRag/searchPrivateLessonTopicChunks.js"

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
  const { data, error } = await supabaseAdmin
    .from("teacher_documents")
    .select(
      "owner_id, subject_id"
    )
    .eq("status", "embedded")
    .not("lesson_topic_id", "is", null)
    .limit(1)

  if (error) {
    throw new Error(
      `Nie udało się pobrać kontekstu nauczyciela: ${error.message}`
    )
  }

  const context = data?.[0]

  if (!context) {
    throw new Error(
      "Brak dokumentu referencyjnego."
    )
  }

  return context
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
    .eq("source_type", "teacher_private")
    .eq("is_active", true)

  if (catalogsError) {
    throw new Error(
      `Nie udało się pobrać katalogów: ${catalogsError.message}`
    )
  }

  const catalogIds = (catalogs || []).map(
    (catalog) => catalog.id
  )

  if (catalogIds.length === 0) {
    throw new Error(
      "Brak prywatnego katalogu lekcji."
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
      `Nie udało się pobrać tematów: ${topicsError.message}`
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
    .eq("source_type", "teacher_private")
    .eq("status", "embedded")
    .not("lesson_topic_id", "is", null)

  if (documentsError) {
    throw new Error(
      `Nie udało się pobrać dokumentów: ${documentsError.message}`
    )
  }

  const topicsWithSources = new Set(
    (documents || []).map(
      (document) =>
        document.lesson_topic_id
    )
  )

  const topicWithoutSources =
    (topics || []).find(
      (topic) =>
        !topicsWithSources.has(topic.id)
    )

  if (!topicWithoutSources) {
    throw new Error(
      "Nie znaleziono tematu bez dokumentów embedded."
    )
  }

  return topicWithoutSources
}

async function main() {
  const supabaseAdmin =
    createAdminClient()

  const {
    owner_id: ownerId,
    subject_id: subjectId,
  } = await getReferenceContext(
    supabaseAdmin
  )

  const topic =
    await getTopicWithoutSources({
      supabaseAdmin,
      ownerId,
      subjectId,
    })

  console.log(
    "Uruchamiam test tematu bez źródeł..."
  )

  console.log(
    `Temat: ${topic.display_title}`
  )

  const result =
    await searchPrivateLessonTopicChunks({
      supabaseAdmin,
      ownerId,
      subjectId,
      lessonTopicId: topic.id,
      query:
        `Wyjaśnij temat: ${topic.display_title}.`,
      })

  assert.equal(
    result.status,
    "no_sources",
    "Oczekiwano statusu no_sources."
  )

  assert.equal(
    result.reason,
    "no_embedded_documents_for_lesson_topic",
    "Zwrócono inną przyczynę braku źródeł."
  )

  assert.equal(
    result.sourceDocumentCount,
    0,
    "Temat nie powinien mieć dokumentów źródłowych."
  )

  assert.deepEqual(
    result.sourceDocuments,
    [],
    "Lista dokumentów powinna być pusta."
  )

  assert.equal(
    result.retrieval,
    null,
    "Semantic retrieval nie powinien zostać uruchomiony."
  )

  console.log(
    "Status: no_sources"
  )

  console.log(
    "Wywołanie semantic retrieval: pominięte"
  )

  console.log(
    "\nTEST TEMATU BEZ ŹRÓDEŁ: OK"
  )
}

try {
  await main()
} catch (error) {
  console.error(
    "\nTEST TEMATU BEZ ŹRÓDEŁ: BŁĄD"
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
node --env-file=.env.local scripts\testPrivateLessonTopicNoSources.mjs

*/
