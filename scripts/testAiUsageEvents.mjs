import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"

import {
  recordAiUsageEvent,
  recordAiUsageEventSafely,
} from "../lib/aiUsage/recordAiUsageEvent.js"

const OWNER_ID =
  "00000000-0000-4000-8000-000000000001"

const GENERATED_MATERIAL_ID =
  "00000000-0000-4000-8000-000000000002"

const SOURCE_DOCUMENT_ID =
  "00000000-0000-4000-8000-000000000003"

function createSupabaseAdmin({
  insertError = null,
} = {}) {
  const calls = []

  return {
    calls,

    client: {
      from(tableName) {
        assert.equal(
          tableName,
          "ai_usage_events",
          "Adapter powinien zapisywać wyłącznie do ai_usage_events."
        )

        return {
          async insert(payload) {
            calls.push({
              tableName,
              payload,
            })

            return {
              error: insertError,
            }
          },
        }
      },
    },
  }
}

{
  const {
    client,
    calls,
  } = createSupabaseAdmin()

  const result =
    await recordAiUsageEvent({
      supabaseAdmin: client,
      ownerId: OWNER_ID,
      operation:
        "material_generation",
      generatedMaterialId:
        GENERATED_MATERIAL_ID,
      model: "gpt-test",
      status: "succeeded",
      usage: {
        usageKnown: true,
        inputTokens: 120,
        cachedInputTokens: 20,
        outputTokens: 30,
        totalTokens: 150,
      },
    })

  assert.deepEqual(
    result,
    {
      recorded: true,
    },
    "Poprawny zapis powinien zwrócić recorded=true."
  )

  assert.equal(
    calls.length,
    1,
    "Jedna próba powinna utworzyć dokładnie jeden rekord."
  )

  assert.deepEqual(
    calls[0].payload,
    {
      owner_id: OWNER_ID,
      generated_material_id:
        GENERATED_MATERIAL_ID,
      source_document_id: null,
      operation:
        "material_generation",
      model: "gpt-test",
      status: "succeeded",
      usage_known: true,
      input_tokens: 120,
      cached_input_tokens: 20,
      output_tokens: 30,
      total_tokens: 150,
    },
    "Adapter zmienił kontrakt rekordu Generatora."
  )
}

{
  const {
    client,
    calls,
  } = createSupabaseAdmin()

  await recordAiUsageEvent({
    supabaseAdmin: client,
    ownerId: OWNER_ID,
    operation:
      "document_embedding",
    sourceDocumentId:
      SOURCE_DOCUMENT_ID,
    model:
      "text-embedding-test",
    status: "succeeded",
    usage: {
      usageKnown: true,
      inputTokens: 18,
      cachedInputTokens: null,
      outputTokens: null,
      totalTokens: 18,
    },
  })

  assert.equal(
    calls.length,
    1,
    "Jedno wywołanie embeddingów powinno utworzyć jeden rekord."
  )

  assert.equal(
    calls[0].payload
      .source_document_id,
    SOURCE_DOCUMENT_ID
  )

  assert.equal(
    calls[0].payload
      .generated_material_id,
    null
  )

  assert.equal(
    calls[0].payload
      .output_tokens,
    null,
    "Embeddingi nie powinny otrzymywać fikcyjnych output_tokens=0."
  )
}

{
  const {
    client,
    calls,
  } = createSupabaseAdmin()

  await recordAiUsageEvent({
    supabaseAdmin: client,
    ownerId: OWNER_ID,
    operation:
      "material_generation",
    generatedMaterialId:
      GENERATED_MATERIAL_ID,
    model: "gpt-test",
    status: "failed",
    usage: null,
  })

  assert.equal(
    calls.length,
    1
  )

  assert.deepEqual(
    {
      usageKnown:
        calls[0].payload
          .usage_known,
      inputTokens:
        calls[0].payload
          .input_tokens,
      cachedInputTokens:
        calls[0].payload
          .cached_input_tokens,
      outputTokens:
        calls[0].payload
          .output_tokens,
      totalTokens:
        calls[0].payload
          .total_tokens,
    },
    {
      usageKnown: false,
      inputTokens: null,
      cachedInputTokens: null,
      outputTokens: null,
      totalTokens: null,
    },
    "Brak usage nie może zostać zamieniony na fikcyjne zera."
  )
}

{
  const {
    client,
    calls,
  } = createSupabaseAdmin()

  await assert.rejects(
    recordAiUsageEvent({
      supabaseAdmin: client,
      ownerId: OWNER_ID,
      operation:
        "material_generation",
      generatedMaterialId: null,
      model: "gpt-test",
      status: "succeeded",
      usage: null,
    }),
    /generatedMaterialId musi być niepustym tekstem\./
  )

  assert.equal(
    calls.length,
    0,
    "Niespójny rekord nie może dotrzeć do Supabase."
  )
}

{
  const insertError = {
    message:
      "Tabela testowo niedostępna.",
  }

  const {
    client,
  } = createSupabaseAdmin({
    insertError,
  })

  const originalConsoleError =
    console.error

  const loggedErrors = []

  console.error = (...args) => {
    loggedErrors.push(args)
  }

  try {
    const result =
      await recordAiUsageEventSafely({
        supabaseAdmin: client,
        ownerId: OWNER_ID,
        operation:
          "document_embedding",
        sourceDocumentId:
          SOURCE_DOCUMENT_ID,
        model:
          "text-embedding-test",
        status: "failed",
        usage: null,
      })

    assert.deepEqual(
      result,
      {
        recorded: false,
      },
      "Bezpieczny adapter nie powinien propagować błędu telemetrii."
    )
  } finally {
    console.error =
      originalConsoleError
  }

  assert.equal(
    loggedErrors.length,
    1,
    "Błąd telemetrii powinien pozostać widoczny w logach serwera."
  )
}

const migrationSql =
  await readFile(
    new URL(
      "../supabase/sql/2026-08-06_ai_usage_events.sql",
      import.meta.url
    ),
    "utf8"
  )

assert.match(
  migrationSql,
  /create table public\.ai_usage_events/i,
  "Migracja nie tworzy ai_usage_events."
)

assert.match(
  migrationSql,
  /alter table public\.ai_usage_events\s+enable row level security/i,
  "Migracja nie włącza RLS."
)

assert.match(
  migrationSql,
  /revoke all\s+on table public\.ai_usage_events\s+from public, anon, authenticated, service_role/i,
  "Migracja nie odbiera domyślnych uprawnień."
)

assert.match(
  migrationSql,
  /grant select, insert\s+on table public\.ai_usage_events\s+to service_role/i,
  "service_role nie otrzymuje minimalnego kontraktu SELECT + INSERT."
)

assert.doesNotMatch(
  migrationSql,
  /create policy[\s\S]*?on public\.ai_usage_events/i,
  "Tabela serwerowa nie powinna mieć polityk frontendowych."
)

console.log(
  "AI usage events contract tests OK"
)

/*
Uruchomienie testu:
node --conditions=react-server scripts/testAiUsageEvents.mjs
*/
