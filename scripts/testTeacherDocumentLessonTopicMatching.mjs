import assert from "node:assert/strict"
import process from "node:process"

import {
  createClient,
} from "@supabase/supabase-js"

import {
  matchTeacherDocumentLessonTopic,
} from "../lib/privateRag/matchTeacherDocumentLessonTopic.js"

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

async function getAssignedDocuments(
  supabaseAdmin
) {
  const { data, error } = await supabaseAdmin
    .from("teacher_documents")
    .select(
      "id, owner_id, subject_id, original_file_name, lesson_topic_id, status, updated_at"
    )
    .eq("status", "embedded")
    .not("lesson_topic_id", "is", null)
    .order("updated_at", {
      ascending: false,
    })
    .limit(2)

  if (error) {
    throw new Error(
      `Nie udało się pobrać dokumentów testowych: ${error.message}`
    )
  }

  if (!Array.isArray(data) || data.length < 2) {
    throw new Error(
      "Test wymaga co najmniej dwóch dokumentów embedded przypisanych do tematów."
    )
  }

  return data
}

async function getDocumentBlocks({
  supabaseAdmin,
  document,
}) {
  const { data, error } = await supabaseAdmin
    .from("document_blocks")
    .select(
      "block_index, block_type, heading_path, content"
    )
    .eq("document_id", document.id)
    .eq("owner_id", document.owner_id)
    .order("block_index", {
      ascending: true,
    })

  if (error) {
    throw new Error(
      `Nie udało się pobrać bloków dokumentu ${document.original_file_name}: ${error.message}`
    )
  }

  return data || []
}

async function getTeacherTopics({
  supabaseAdmin,
  document,
}) {
  const {
    data: catalogs,
    error: catalogsError,
  } = await supabaseAdmin
    .from("lesson_catalogs")
    .select("id")
    .eq("owner_id", document.owner_id)
    .eq("subject_id", document.subject_id)
    .eq("source_type", "teacher_private")
    .eq("is_active", true)

  if (catalogsError) {
    throw new Error(
      `Nie udało się pobrać katalogów nauczyciela: ${catalogsError.message}`
    )
  }

  const catalogIds = (catalogs || []).map(
    (catalog) => catalog.id
  )

  if (catalogIds.length === 0) {
    throw new Error(
      "Brak aktywnego prywatnego katalogu lekcji dla dokumentu testowego."
    )
  }

  const { data, error } = await supabaseAdmin
    .from("lesson_topics")
    .select(
      "id, catalog_id, display_title, lesson_key"
    )
    .in("catalog_id", catalogIds)
    .eq("is_active", true)

  if (error) {
    throw new Error(
      `Nie udało się pobrać tematów lekcji: ${error.message}`
    )
  }

  return data || []
}

async function main() {
  const supabaseAdmin = createAdminClient()

  const documents =
    await getAssignedDocuments(
      supabaseAdmin
    )

  console.log(
    "Uruchamiam test dopasowania DOCX do tematów lekcji..."
  )

  for (const document of documents) {
    const blocks = await getDocumentBlocks({
      supabaseAdmin,
      document,
    })

    const topics = await getTeacherTopics({
      supabaseAdmin,
      document,
    })

    const result =
      matchTeacherDocumentLessonTopic({
        blocks,
        sourceFilename:
          document.original_file_name,
        topics,
      })

    assert.equal(
      result.status,
      "matched",
      `Nie rozpoznano jednoznacznie tematu dokumentu ${document.original_file_name}.`
    )

    assert.equal(
      result.topic.id,
      document.lesson_topic_id,
      `Dokument ${document.original_file_name} został dopasowany do innego tematu.`
    )

    console.log(
      [
        `\nDokument: ${document.original_file_name}`,
        `Kandydat: ${result.candidateTitle}`,
        `Źródło kandydata: ${result.candidateSource}`,
        `Typ dopasowania: ${result.matchType}`,
        `Temat: ${result.topic.display_title}`,
        "Dopasowanie: zgodne",
      ].join("\n")
    )
  }

  console.log(
    "\nTEST DOPASOWANIA DOCX DO TEMATÓW: OK"
  )
}

try {
  await main()
} catch (error) {
  console.error(
    "\nTEST DOPASOWANIA DOCX DO TEMATÓW: BŁĄD"
  )

  console.error(
    error instanceof Error
      ? error.message
      : String(error)
  )

  process.exitCode = 1
}
