import assert from "node:assert/strict"
import process from "node:process"

import {
  createClient,
} from "@supabase/supabase-js"

import {
  buildPrivateRagContext,
} from "../lib/privateRag/buildPrivateRagContext.js"

import {
  searchPrivateLessonTopicChunks,
} from "../lib/privateRag/searchPrivateLessonTopicChunks.js"

const MAX_SOURCE_COUNT = 3

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
    .eq("source_type", "teacher_private")
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
      [
        "id",
        "display_title",
        "lesson_key",
      ].join(", ")
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

function buildExpectedSourceText(source) {
  const heading =
    source.headingPath.length > 0
      ? source.headingPath.join(" > ")
      : "(bez nagłówka)"

  return [
    "==================================================",
    `ŹRÓDŁO ${source.rank}`,
    `PLIK: ${source.originalFileName}`,
    `DOCUMENT_ID: ${source.documentId}`,
    `CHUNK_ID: ${source.chunkId}`,
    `CHUNK_INDEX: ${source.chunkIndex}`,
    `BLOCK_INDICES: ${source.blockIndices.join(", ")}`,
    `HEADING_PATH: ${heading}`,
    `CONTENT_HASH: ${source.contentHash}`,
    `SIMILARITY: ${source.similarity}`,
    "",
    source.content,
  ].join("\n")
}

function assertRejectedStatus(status) {
  assert.throws(
    () =>
      buildPrivateRagContext({
        retrievalResult: {
          status,
        },
      }),
    /wymaga statusu retrieved/,
    `Status ${status} powinien zostać odrzucony.`
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
    process.env.PRIVATE_RAG_CONTEXT_TEST_QUERY?.trim() ||
    `Wyjaśnij najważniejsze informacje dotyczące tematu: ${lessonTopic.display_title}.`

  console.log(
    "Uruchamiam test kontraktu kontekstu źródłowego..."
  )

  console.log(
    `Temat: ${lessonTopic.display_title}`
  )

  console.log(
    `Zapytanie: ${query}`
  )

  const retrievalResult =
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
    retrievalResult.status,
    "retrieved",
    "Test wymaga zaakceptowanego wyniku retrieved."
  )

  const retrievalSnapshot =
    JSON.stringify(retrievalResult)

  const context =
    buildPrivateRagContext({
      retrievalResult,
    })

  assert.equal(
    JSON.stringify(retrievalResult),
    retrievalSnapshot,
    "buildPrivateRagContext zmodyfikował wejściowy wynik retrieval."
  )

  assert.equal(
    context.status,
    "ready",
    "Kontrakt nie otrzymał statusu ready."
  )

  assert.equal(
    context.sourceType,
    "teacher_private",
    "Zwrócono nieprawidłowy typ źródła."
  )

  assert.equal(
    context.ownerId,
    retrievalResult.ownerId,
    "Kontrakt zawiera innego właściciela."
  )

  assert.equal(
    context.subjectId,
    retrievalResult.subjectId,
    "Kontrakt zawiera inny przedmiot."
  )

  assert.deepEqual(
    context.lessonTopic,
    retrievalResult.lessonTopic,
    "Metadane tematu lekcji zostały zmienione."
  )

  assert.deepEqual(
    context.lessonCatalog,
    retrievalResult.lessonCatalog,
    "Metadane katalogu lekcji zostały zmienione."
  )

  assert.equal(
    context.query,
    retrievalResult.retrieval.query,
    "Kontrakt zawiera inne zapytanie retrieval."
  )

  assert.equal(
    context.sourceCount,
    retrievalResult.retrieval.resultCount,
    "Liczba źródeł nie odpowiada wynikowi retrieval."
  )

  assert.equal(
    context.sources.length,
    context.sourceCount,
    "sourceCount nie odpowiada tablicy sources."
  )

  assert.ok(
    context.sourceCount > 0,
    "Kontrakt nie zawiera źródeł."
  )

  assert.ok(
    context.sourceCount <=
      MAX_SOURCE_COUNT,
    "Kontrakt zawiera więcej niż 3 źródła."
  )

  const sourceDocumentsById =
    new Map(
      retrievalResult.sourceDocuments.map(
        (document) => [
          document.id,
          document,
        ]
      )
    )

  context.sources.forEach(
    (source, index) => {
      const match =
        retrievalResult.retrieval.matches[
          index
        ]

      const sourceDocument =
        sourceDocumentsById.get(
          match.document_id
        )

      assert.ok(
        sourceDocument,
        `Brak dokumentu dla źródła ${index + 1}.`
      )

      assert.equal(
        source.rank,
        index + 1,
        `Źródło ${index + 1} ma nieprawidłowy rank.`
      )

      assert.equal(
        source.documentId,
        match.document_id,
        `Źródło ${index + 1} ma inny documentId.`
      )

      assert.equal(
        source.originalFileName,
        sourceDocument.originalFileName,
        `Źródło ${index + 1} ma inną nazwę pliku.`
      )

      assert.equal(
        source.chunkId,
        match.chunk_id,
        `Źródło ${index + 1} ma inny chunkId.`
      )

      assert.equal(
        source.chunkIndex,
        match.chunk_index,
        `Źródło ${index + 1} ma inny chunkIndex.`
      )

      assert.deepEqual(
        source.blockIndices,
        match.block_indices,
        `Źródło ${index + 1} ma inne blockIndices.`
      )

      assert.deepEqual(
        source.headingPath,
        match.heading_path,
        `Źródło ${index + 1} ma inny headingPath.`
      )

      assert.equal(
        source.contentHash,
        match.content_hash,
        `Źródło ${index + 1} ma inny contentHash.`
      )

      assert.equal(
        source.similarity,
        match.similarity,
        `Źródło ${index + 1} ma inne similarity.`
      )

      assert.equal(
        source.content,
        match.content,
        `Treść źródła ${index + 1} została zmieniona.`
      )
    }
  )

  const expectedRagContext =
    context.sources
      .map(buildExpectedSourceText)
      .join("\n\n")

  assert.equal(
    context.ragContext,
    expectedRagContext,
    "Tekstowy ragContext nie odpowiada kontraktowi źródeł."
  )

  assertRejectedStatus(
    "no_sources"
  )

  assertRejectedStatus(
    "insufficient_similarity"
  )

  console.log(
    `Liczba źródeł: ${context.sourceCount}`
  )

  context.sources.forEach(
    (source) => {
      console.log(
        [
          `Źródło ${source.rank}: ${source.originalFileName}`,
          `Chunk: ${source.chunkIndex}`,
          `Similarity: ${source.similarity.toFixed(6)}`,
          `Bloki: ${source.blockIndices.join(", ")}`,
        ].join(" | ")
      )
    }
  )

  console.log(
    "Status no_sources: prawidłowo odrzucony"
  )

  console.log(
    "Status insufficient_similarity: prawidłowo odrzucony"
  )

  console.log(
    "\nTEST KONTRAKTU KONTEKSTU ŹRÓDŁOWEGO: OK"
  )
}

try {
  await main()
} catch (error) {
  console.error(
    "\nTEST KONTRAKTU KONTEKSTU ŹRÓDŁOWEGO: BŁĄD"
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
node --env-file=.env.local scripts\testPrivateRagSourceContext.mjs
*/