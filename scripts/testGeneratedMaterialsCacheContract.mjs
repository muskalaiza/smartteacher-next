import assert from "node:assert/strict"

import {
  claimGeneratedMaterial,
} from "../lib/generation/generatedMaterialsCache.js"

const RESERVED_RESULT = [
  {
    claim_state: "reserved",
    generated_material_id:
      "00000000-0000-4000-8000-000000000001",
    material_status: "generating",
    claim_content_json: null,
    claim_access_count: 1,
    claim_started_at:
      "2026-08-05T00:00:00.000Z",
  },
]

function buildClaimData(
  overrides = {}
) {
  return {
    ownerId:
      "00000000-0000-4000-8000-000000000002",
    subjectId:
      "00000000-0000-4000-8000-000000000003",
    lessonTopicId:
      "00000000-0000-4000-8000-000000000004",
    sourceDocumentId:
      "00000000-0000-4000-8000-000000000005",
    subjectNameSnapshot:
      "Przedmiot testowy",
    topicTitleSnapshot:
      "Zakres testowy",
    sourceFileNameSnapshot:
      "material-testowy.docx",
    materialType:
      "kartkówka",
    taskCount: 5,
    profiles: ["Standard"],
    taskPlan: Array.from(
      { length: 5 },
      (_, index) => ({
        number: index + 1,
      })
    ),
    sourceFingerprint:
      "a".repeat(64),
    sourceManifestVersion:
      "document_chunks_v1",
    generationFingerprint:
      "b".repeat(64),
    generatorVersion:
      "generator_v1",
    contentSchemaVersion:
      "kartkowka_v1",
    model:
      "test-model",
    ...overrides,
  }
}

function createSupabaseAdmin() {
  const calls = []

  return {
    calls,
    client: {
      async rpc(
        functionName,
        parameters
      ) {
        calls.push({
          functionName,
          parameters,
        })

        return {
          data: RESERVED_RESULT,
          error: null,
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

  await claimGeneratedMaterial({
    supabaseAdmin: client,
    claimData: buildClaimData({
      materialType: "sprawdzian",
      lessonTopicId: null,
      sourceDocumentId: null,
    }),
  })

  assert.equal(
    calls.length,
    1,
    "Sprawdzian powinien wywołać RPC cache."
  )

  assert.equal(
    calls[0].parameters
      .p_lesson_topic_id,
    null,
    "Sprawdzian powinien przekazać NULL jako lesson_topic_id."
  )

  assert.equal(
    calls[0].parameters
      .p_source_document_id,
    null,
    "Sprawdzian powinien przekazać NULL jako source_document_id."
  )
}

for (const materialType of [
  "karta pracy",
  "kartkówka",
]) {
  const {
    client,
    calls,
  } = createSupabaseAdmin()

  await assert.rejects(
    claimGeneratedMaterial({
      supabaseAdmin: client,
      claimData: buildClaimData({
        materialType,
        lessonTopicId: null,
      }),
    }),
    /lessonTopicId musi być niepustym tekstem\./,
    `${materialType}: brak lessonTopicId powinien zatrzymać rezerwację.`
  )

  assert.equal(
    calls.length,
    0,
    `${materialType}: błędne dane nie powinny wywołać RPC.`
  )
}

for (const materialType of [
  "karta pracy",
  "kartkówka",
]) {
  const {
    client,
    calls,
  } = createSupabaseAdmin()

  await assert.rejects(
    claimGeneratedMaterial({
      supabaseAdmin: client,
      claimData: buildClaimData({
        materialType,
        sourceDocumentId: null,
      }),
    }),
    /sourceDocumentId musi być niepustym tekstem\./,
    `${materialType}: brak sourceDocumentId powinien zatrzymać rezerwację.`
  )

  assert.equal(
    calls.length,
    0,
    `${materialType}: błędne dane nie powinny wywołać RPC.`
  )
}

{
  const {
    client,
    calls,
  } = createSupabaseAdmin()

  await assert.rejects(
    claimGeneratedMaterial({
      supabaseAdmin: client,
      claimData: buildClaimData({
        materialType: "sprawdzian",
      }),
    }),
    /Sprawdzian nie może wskazywać pojedynczego tematu ani dokumentu\./,
    "Sprawdzian nie powinien zapisywać identyfikatorów pojedynczego źródła."
  )

  assert.equal(
    calls.length,
    0,
    "Niespójny kontrakt Sprawdzianu nie powinien wywołać RPC."
  )
}

console.log(
  "Generated materials cache contract tests OK"
)

/*
Uruchomienie testu:
node --conditions=react-server scripts/testGeneratedMaterialsCacheContract.mjs
*/
