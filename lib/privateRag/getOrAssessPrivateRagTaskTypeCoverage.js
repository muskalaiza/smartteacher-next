import {
  assessPrivateRagTaskTypeCoverage,
  COVERAGE_EVALUATION_MODEL,
  PRIVATE_RAG_COVERAGE_VERSION,
  PRIVATE_RAG_TASK_SUBTYPES,
} from "./assessPrivateRagTaskTypeCoverage.js"

import {
  buildPrivateRagCoverageCacheIdentity,
} from "./buildPrivateRagCoverageCacheIdentity.js"

import {
  getPrivateRagTaskTypeCoverageCache,
} from "./getPrivateRagTaskTypeCoverageCache.js"

import {
  savePrivateRagTaskTypeCoverageCache,
} from "./savePrivateRagTaskTypeCoverageCache.js"

function assertCondition(
  condition,
  message
) {
  if (!condition) {
    throw new Error(message)
  }
}

function assertCachedAssessments(
  assessments
) {
  assertCondition(
    assessments &&
      typeof assessments ===
        "object" &&
      !Array.isArray(
        assessments
      ),

    "Cache coverage nie zawiera prawidłowych assessments."
  )

  const returnedTaskSubtypes =
    Object.keys(
      assessments
    ).sort()

  const expectedTaskSubtypes = [
    ...PRIVATE_RAG_TASK_SUBTYPES,
  ].sort()

  assertCondition(
    JSON.stringify(
      returnedTaskSubtypes
    ) ===
      JSON.stringify(
        expectedTaskSubtypes
      ),

    "Cache coverage nie zawiera dokładnie siedmiu typów zadań."
  )

  PRIVATE_RAG_TASK_SUBTYPES.forEach(
    (taskSubtype) => {
      const assessment =
        assessments[
          taskSubtype
        ]

      assertCondition(
        assessment &&
          typeof assessment ===
            "object" &&
          !Array.isArray(
            assessment
          ),

        `Cache zawiera nieprawidłową ocenę typu ${taskSubtype}.`
      )

      assertCondition(
        typeof assessment.isSupported ===
          "boolean",

        `Cache coverage nie zawiera poprawnego isSupported dla ${taskSubtype}.`
      )

      ;[
        "evidenceChunkIds",
        "missingEvidence",
        "constraints",
      ].forEach(
        (field) => {
          assertCondition(
            Array.isArray(
              assessment[field]
            ),

            `Cache coverage nie zawiera poprawnego pola ${taskSubtype}.${field}.`
          )
        }
      )

      assertCondition(
        typeof assessment
          .evidenceSummary ===
          "string" &&
          assessment
            .evidenceSummary
            .trim(),

        `Cache coverage zawiera pusty evidenceSummary dla ${taskSubtype}.`
      )
    }
  )
}

function assertCacheIdentityMatches({
  cacheEntry,
  cacheIdentity,
}) {
  assertCondition(
    cacheEntry.source_count ===
      cacheIdentity.sourceCount,

    "Liczba źródeł w cache nie odpowiada aktualnemu sourceContext."
  )

  assertCondition(
    cacheEntry.retrieval_query ===
      cacheIdentity.retrievalQuery,

    "Zapytanie zapisane w cache nie odpowiada aktualnemu zapytaniu."
  )

  assertCondition(
    JSON.stringify(
      cacheEntry.source_refs
    ) ===
      JSON.stringify(
        cacheIdentity.sourceRefs
      ),

    "Referencje źródeł zapisane w cache nie odpowiadają aktualnym źródłom."
  )
}

function cloneAssessments(
  assessments
) {
  return Object.fromEntries(
    Object.entries(
      assessments
    ).map(
      ([
        taskSubtype,
        assessment,
      ]) => [
        taskSubtype,

        {
          ...assessment,

          evidenceChunkIds: [
            ...assessment
              .evidenceChunkIds,
          ],

          missingEvidence: [
            ...assessment
              .missingEvidence,
          ],

          constraints: [
            ...assessment
              .constraints,
          ],
        },
      ]
    )
  )
}

function cloneSources(
  sources
) {
  return sources.map(
    (source) => ({
      ...source,

      blockIndices: [
        ...source.blockIndices,
      ],

      headingPath: [
        ...source.headingPath,
      ],
    })
  )
}

function buildCachedCoverageResult({
  sourceContext,
  cacheEntry,
  cacheIdentity,
}) {
  assertCacheIdentityMatches({
    cacheEntry,
    cacheIdentity,
  })

  assertCachedAssessments(
    cacheEntry.assessments
  )

  return {
    status: "assessed",
    reason: null,

    cacheStatus: "hit",

    coverageVersion:
      cacheEntry.coverage_version,

    evaluationModel:
      cacheEntry.evaluation_model,

    sourceType:
      sourceContext.sourceType,

    ownerId:
      sourceContext.ownerId,

    subjectId:
      sourceContext.subjectId,

    lessonTopic: {
      ...sourceContext.lessonTopic,
    },

    lessonCatalog: {
      ...sourceContext.lessonCatalog,
    },

    query:
      sourceContext.query,

    sourceCount:
      sourceContext.sourceCount,

    sources:
      cloneSources(
        sourceContext.sources
      ),

    assessments:
      cloneAssessments(
        cacheEntry.assessments
      ),

    /*
      Przy cache HIT nie wykonano
      bieżącego wywołania modelu.
    */
    usage: {
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
    },

    cache: {
      entryId:
        cacheEntry.id,

      sourceFingerprint:
        cacheIdentity
          .sourceFingerprint,

      storedUsage: {
        promptTokens:
          cacheEntry.prompt_tokens,

        completionTokens:
          cacheEntry
            .completion_tokens,

        totalTokens:
          cacheEntry.total_tokens,
      },

      createdAt:
        cacheEntry.created_at,

      updatedAt:
        cacheEntry.updated_at,
    },
  }
}

export async function getOrAssessPrivateRagTaskTypeCoverage({
  supabaseAdmin,
  sourceContext,
  apiKey,
}) {
  const cacheIdentity =
    buildPrivateRagCoverageCacheIdentity({
      sourceContext,
    })

  const cachedResult =
    await getPrivateRagTaskTypeCoverageCache({
      supabaseAdmin,

      ownerId:
        sourceContext.ownerId,

      subjectId:
        sourceContext.subjectId,

      lessonTopicId:
        sourceContext.lessonTopic.id,

      cacheIdentity,

      coverageVersion:
        PRIVATE_RAG_COVERAGE_VERSION,

      evaluationModel:
        COVERAGE_EVALUATION_MODEL,
    })

  if (
    cachedResult.status ===
      "hit"
  ) {
    return buildCachedCoverageResult({
      sourceContext,

      cacheEntry:
        cachedResult.cacheEntry,

      cacheIdentity,
    })
  }

  const coverageResult =
    await assessPrivateRagTaskTypeCoverage({
      sourceContext,
      apiKey,
    })

  const savedResult =
    await savePrivateRagTaskTypeCoverageCache({
      supabaseAdmin,

      ownerId:
        sourceContext.ownerId,

      subjectId:
        sourceContext.subjectId,

      lessonTopicId:
        sourceContext.lessonTopic.id,

      cacheIdentity,

      coverageVersion:
        PRIVATE_RAG_COVERAGE_VERSION,

      coverageResult,
    })

  return {
    ...coverageResult,

    cacheStatus: "miss",

    coverageVersion:
      PRIVATE_RAG_COVERAGE_VERSION,

    cache: {
      entryId:
        savedResult.cacheEntry.id,

      sourceFingerprint:
        cacheIdentity
          .sourceFingerprint,

      storedUsage: null,

      createdAt:
        savedResult
          .cacheEntry
          .created_at,

      updatedAt:
        savedResult
          .cacheEntry
          .updated_at,
    },
  }
}
