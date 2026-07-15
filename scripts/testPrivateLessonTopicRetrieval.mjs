import assert from "node:assert/strict"
import process from "node:process"

import {
  createClient,
} from "@supabase/supabase-js"

import {
  searchPrivateLessonTopicChunks,
} from "../lib/privateRag/searchPrivateLessonTopicChunks.js"

const MAX_RETRIEVED_CHUNKS = 3
const MINIMUM_SIMILARITY = 0.55

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

async function getReferenceDocument(
  supabaseAdmin
) {
  const { data, error } = await supabaseAdmin
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

  if (error) {
    throw new Error(
      `Nie udało się pobrać dokumentu referencyjnego: ${error.message}`
    )
  }

  const document = data?.[0]

  if (!document) {
    throw new Error(
      "Brak dokumentu embedded przypisanego do tematu lekcji."
    )
  }

  return document
}

async function getLessonTopic({
  supabaseAdmin,
  lessonTopicId,
}) {
  const { data, error } = await supabaseAdmin
    .from("lesson_topics")
    .select(
      "id, display_title, lesson_key"
    )
    .eq("id", lessonTopicId)
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

function getContentPreview(content) {
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

  const referenceDocument =
    await getReferenceDocument(
      supabaseAdmin
    )

  const lessonTopic =
    await getLessonTopic({
      supabaseAdmin,
      lessonTopicId:
        referenceDocument.lesson_topic_id,
    })

  const query =
    process.env.PRIVATE_RAG_TOPIC_TEST_QUERY?.trim() ||
    `Wyjaśnij najważniejsze informacje dotyczące tematu: ${lessonTopic.display_title}.`

  console.log(
    "Uruchamiam retrieval według lesson_topic_id..."
  )

  console.log(
    `Temat: ${lessonTopic.display_title}`
  )

  console.log(
    `Zapytanie: ${query}`
  )

  const result =
    await searchPrivateLessonTopicChunks({
      supabaseAdmin,
      ownerId:
        referenceDocument.owner_id,
      subjectId:
        referenceDocument.subject_id,
      lessonTopicId:
        referenceDocument.lesson_topic_id,
      query,
    })

  assert.equal(
    result.status,
    "retrieved",
    "Retrieval nie zakończył się statusem retrieved."
  )

  assert.equal(
    result.lessonTopic.id,
    referenceDocument.lesson_topic_id,
    "Retrieval użył innego tematu lekcji."
  )

  assert.ok(
    result.sourceDocumentCount > 0,
    "Temat nie ma dokumentów źródłowych."
  )

  assert.ok(
    result.retrieval &&
      typeof result.retrieval ===
        "object",
    "Brak wyniku semantic retrieval."
  )

  assert.ok(
  result.retrieval.resultCount > 0,
  "Semantic retrieval nie zwrócił zaakceptowanych chunków."
)

 assert.ok(
  result.retrieval.resultCount <=
    MAX_RETRIEVED_CHUNKS,
  "Bramka zwróciła więcej niż 3 chunki."
)

assert.equal(
  result.retrieval.matches.length,
  result.retrieval.resultCount,
  "resultCount nie odpowiada liczbie zaakceptowanych chunków."
)

  const allowedDocumentIds =
    new Set(
      result.sourceDocuments.map(
        (document) => document.id
      )
    )

  result.retrieval.matches.forEach(
    (match, index) => {
      assert.ok(
        allowedDocumentIds.has(
          match.document_id
        ),
        `Wynik ${index + 1} pochodzi z dokumentu nieprzypisanego do wybranego tematu.`
      )

       assert.ok(
  match.similarity >=
    MINIMUM_SIMILARITY,
  `Wynik ${index + 1} ma similarity poniżej 0.55.`
)

      if (index > 0) {
        assert.ok(
          result.retrieval.matches[
            index - 1
          ].similarity >=
            match.similarity,
          "Wyniki nie są posortowane malejąco."
        )
      }
    }
  )

  console.log(
    "\nDOKUMENTY ŹRÓDŁOWE:"
  )

  result.sourceDocuments.forEach(
    (document) => {
      console.log(
        `- ${document.originalFileName}`
      )
    }
  )

  console.log(
    "\nWYNIKI RETRIEVAL:"
  )

  result.retrieval.matches.forEach(
    (match, index) => {
      console.log(
        [
          `\n${index + 1}. Chunk ${match.chunk_index}`,
          `Similarity: ${match.similarity.toFixed(6)}`,
          `Treść: ${getContentPreview(match.content)}`,
        ].join("\n")
      )
    }
  )

console.log(
  "\nUruchamiam test niewystarczającego similarity..."
)

const insufficientResult =
  await searchPrivateLessonTopicChunks({
    supabaseAdmin,
    ownerId:
      referenceDocument.owner_id,
    subjectId:
      referenceDocument.subject_id,
    lessonTopicId:
      referenceDocument.lesson_topic_id,
    query:
      "Jak przebiega fotosynteza u roślin?",
  })
  assert.equal(
    insufficientResult.status,
    "insufficient_similarity",
    "Oczekiwano statusu insufficient_similarity."
  )
  assert.equal(
    insufficientResult.reason,
    "no_matches_above_minimum_similarity",
    "Zwrócono nieprawidłową przyczynę odrzucenia wyników."
  )
   assert.ok(
    insufficientResult.sourceDocumentCount > 0,
    "Test insufficient_similarity wymaga istniejących źródeł."
  )

  assert.ok(
    insufficientResult.retrieval &&
      typeof insufficientResult.retrieval ===
        "object",
    "Semantic retrieval powinien zostać wykonany."
  )

  assert.equal(
    insufficientResult.retrieval.resultCount,
    0,
    "Po zastosowaniu bramki nie powinien pozostać żaden chunk."
  )

  assert.deepEqual(
    insufficientResult.retrieval.matches,
    [],
    "Lista zaakceptowanych chunków powinna być pusta."
  )

  console.log(
    "Status insufficient_similarity: OK"
  )

    console.log(
    "\nTEST BRAMKI JAKOŚCI RETRIEVAL: OK"
  )

}

try {
  await main()
} catch (error) {
  console.error(
    "\nTEST RETRIEVALU WEDŁUG TEMATU LEKCJI: BŁĄD"
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
node --env-file=.env.local scripts\testPrivateLessonTopicRetrieval.mjs
*/