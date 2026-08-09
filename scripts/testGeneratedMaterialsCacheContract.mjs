import assert from "node:assert/strict"

import {
  claimGeneratedMaterial,
  markGeneratedMaterialFailed,
  markGeneratedMaterialReady,
} from "../lib/generation/generatedMaterialsCache.js"

const GENERATED_MATERIAL_ID =
  "00000000-0000-4000-8000-000000000001"

const RESERVATION_STARTED_AT =
  "2026-08-05T00:00:00.000Z"

const COMPLETED_AT =
  "2026-08-05T00:00:02.000Z"

const MATERIAL = {
  intro: "",
  tip: [],
  glossary: [],
  tasks: [],
}

const RESERVED_RESULT = [
  {
    claim_state: "reserved",
    generated_material_id:
      GENERATED_MATERIAL_ID,
    material_status: "generating",
    claim_content_json: null,
    claim_access_count: 1,
    claim_started_at:
      RESERVATION_STARTED_AT,
  },
]

const READY_RESULT = [
  {
    generated_material_id:
      GENERATED_MATERIAL_ID,
    material_status: "ready",
    result_content_json:
      MATERIAL,
    result_access_count: 1,
    result_started_at:
      RESERVATION_STARTED_AT,
    result_completed_at:
      COMPLETED_AT,
  },
]

const FAILED_RESULT = [
  {
    generated_material_id:
      GENERATED_MATERIAL_ID,
    material_status: "failed",
    result_error_message:
      "Kontrolowany błąd testowy.",
    result_completed_at:
      COMPLETED_AT,
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

function createSupabaseAdmin(
  responses = {}
) {
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

        return responses[
          functionName
        ] || {
          data: RESERVED_RESULT,
          error: null,
        }
      },
    },
  }
}

for (const claimState of [
  "subscription_required",
  "limit_exhausted",
]) {
  const blockedResult = [
    {
      claim_state: claimState,
      generated_material_id: null,
      material_status: null,
      claim_content_json: null,
      claim_access_count: 0,
      claim_started_at: null,
    },
  ]

  const {
    client,
    calls,
  } = createSupabaseAdmin({
    claim_generated_material: {
      data: blockedResult,
      error: null,
    },
  })

  const claim =
    await claimGeneratedMaterial({
      supabaseAdmin: client,
      claimData: buildClaimData(),
    })

  assert.equal(
    claim.state,
    claimState
  )

  assert.equal(
    claim.generatedMaterialId,
    null,
    `${claimState}: stan blokady nie powinien zawierać identyfikatora materiału.`
  )

  assert.equal(
    calls.length,
    1,
    `${claimState}: adapter powinien wykonać dokładnie jedno RPC.`
  )
}

{
  const {
    client,
    calls,
  } = createSupabaseAdmin({
    finalize_generated_material_success: {
      data: READY_RESULT,
      error: null,
    },
  })

  const ready =
    await markGeneratedMaterialReady({
      supabaseAdmin: client,
      ownerId:
        "00000000-0000-4000-8000-000000000002",
      generatedMaterialId:
        GENERATED_MATERIAL_ID,
      reservationStartedAt:
        RESERVATION_STARTED_AT,
      material:
        MATERIAL,
      usage: {
        promptTokens: 100,
        completionTokens: 25,
        totalTokens: 125,
      },
    })

  assert.equal(
    calls.length,
    1,
    "Gotowy materiał powinien wykonać dokładnie jedno RPC."
  )

  assert.equal(
    calls[0].functionName,
    "finalize_generated_material_success"
  )

  assert.deepEqual(
    calls[0].parameters
      .p_content_json,
    MATERIAL
  )

  assert.equal(
    calls[0].parameters
      .p_total_tokens,
    125
  )

  assert.equal(
    ready.status,
    "ready"
  )

  assert.deepEqual(
    ready.material,
    MATERIAL
  )
}

{
  const {
    client,
    calls,
  } = createSupabaseAdmin({
    finalize_generated_material_failure: {
      data: FAILED_RESULT,
      error: null,
    },
  })

  const failed =
    await markGeneratedMaterialFailed({
      supabaseAdmin: client,
      ownerId:
        "00000000-0000-4000-8000-000000000002",
      generatedMaterialId:
        GENERATED_MATERIAL_ID,
      reservationStartedAt:
        RESERVATION_STARTED_AT,
      errorMessage:
        "Kontrolowany błąd testowy.",
    })

  assert.equal(
    calls.length,
    1,
    "Błąd materiału powinien wykonać dokładnie jedno RPC."
  )

  assert.equal(
    calls[0].functionName,
    "finalize_generated_material_failure"
  )

  assert.equal(
    calls[0].parameters
      .p_error_message,
    "Kontrolowany błąd testowy."
  )

  assert.equal(
    failed.status,
    "failed"
  )
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
