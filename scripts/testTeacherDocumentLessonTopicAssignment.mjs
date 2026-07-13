import assert from "node:assert/strict"
import process from "node:process"

import {
  createClient,
} from "@supabase/supabase-js"

import {
  assignTeacherDocumentLessonTopic,
} from "../lib/privateRag/assignTeacherDocumentLessonTopic.js"

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

async function getReferenceDocuments(
  supabaseAdmin
) {
  const { data, error } = await supabaseAdmin
    .from("teacher_documents")
    .select(
      [
        "id",
        "owner_id",
        "original_file_name",
        "lesson_topic_id",
        "status",
        "updated_at",
      ].join(", ")
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
      "Test wymaga dwóch dokumentów embedded przypisanych do tematów."
    )
  }

  return data
}

async function main() {
  const supabaseAdmin =
    createAdminClient()

  const documents =
    await getReferenceDocuments(
      supabaseAdmin
    )

  console.log(
    "Uruchamiam test przypisania DOCX do tematów..."
  )

  for (const document of documents) {
    const result =
      await assignTeacherDocumentLessonTopic({
        supabaseAdmin,
        documentId: document.id,
        ownerId: document.owner_id,
      })

    assert.equal(
      result.status,
      "matched",
      `Dokument ${document.original_file_name} nie został jednoznacznie dopasowany.`
    )

    assert.equal(
      result.lessonTopicId,
      document.lesson_topic_id,
      `Dokument ${document.original_file_name} wskazuje inny lesson_topic_id.`
    )

    assert.equal(
      result.assignmentCreated,
      false,
      "Test nie powinien tworzyć nowego przypisania."
    )

    assert.equal(
      result.reusedExistingAssignment,
      true,
      "Powinno zostać rozpoznane istniejące przypisanie."
    )

    console.log(
      [
        `\nDokument: ${document.original_file_name}`,
        `Temat: ${result.lessonTopicTitle}`,
        `lesson_topic_id: ${result.lessonTopicId}`,
        `Kandydat: ${result.candidateTitle}`,
        `Typ dopasowania: ${result.matchType}`,
        "Istniejące przypisanie: zgodne",
      ].join("\n")
    )
  }

  console.log(
    "\nTEST PRZYPISANIA DOCX DO TEMATÓW: OK"
  )
}

try {
  await main()
} catch (error) {
  console.error(
    "\nTEST PRZYPISANIA DOCX DO TEMATÓW: BŁĄD"
  )

  console.error(
    error instanceof Error
      ? error.message
      : String(error)
  )

  process.exitCode = 1
}

/*
wywołanie testu:
node --env-file=.env.local scripts\testTeacherDocumentLessonTopicAssignment.mjs

*/