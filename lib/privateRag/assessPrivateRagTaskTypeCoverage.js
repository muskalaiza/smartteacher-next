import OpenAI from "openai"

import {
  buildPrivateRagTaskTypeCoverageSchema,
} from "./buildPrivateRagTaskTypeCoverageSchema.js"

export const COVERAGE_EVALUATION_MODEL =
  "gpt-4o-mini"

  export const PRIVATE_RAG_COVERAGE_VERSION =
  "1"
  
const TASK_REQUIREMENTS =
  Object.freeze({
    closed_single:
      "fakt lub reguła dające jedną poprawną odpowiedź i wiarygodne dystraktory",

    closed_tf:
      "fakt lub reguła pozwalające ocenić twierdzenie i uzasadnić wynik",

    match_fill:
  "co najmniej dwa jawne terminy, elementy lub fragmenty konstrukcji, z których można utworzyć dwie luki; dystraktory mogą powstać z innych jednoznacznie niepasujących elementów źródła",

match_pair:
  "co najmniej trzy jawne elementy mające definicje, role, zastosowania lub inne jednoznaczne relacje, z których można utworzyć trzy pary",

    error_find:
      "reguła lub wzorzec pozwalające utworzyć jeden kontrolowany błąd, poprawkę i uzasadnienie",

    open_code:
      "składnia i reguły wystarczające do krótkiego zadania oraz poprawnego kodu odpowiedzi",

   open_explain:
  "kod, schemat, algorytm albo opisany mechanizm, który można poddać analizie, oraz informacje wystarczające do wzorcowej odpowiedzi",
  })

export const PRIVATE_RAG_TASK_SUBTYPES =
  Object.freeze(
    Object.keys(
      TASK_REQUIREMENTS
    )
  )

function assertCondition(
  condition,
  message
) {
  if (!condition) {
    throw new Error(message)
  }
}

function getRequiredApiKey(apiKey) {
  const resolvedApiKey =
    apiKey ||
    process.env.OPENAI_API_KEY

  assertCondition(
    resolvedApiKey,
    "Brak wymaganej zmiennej środowiskowej OPENAI_API_KEY."
  )

  return resolvedApiKey
}

function assertStringArray(
  value,
  label
) {
  assertCondition(
    Array.isArray(value) &&
      value.every(
        (item) =>
          typeof item ===
            "string" &&
          item.trim()
      ),

    `${label} nie jest poprawną tablicą tekstów.`
  )
}

function assertSourceContext(
  sourceContext
) {
  assertCondition(
    sourceContext &&
      typeof sourceContext ===
        "object" &&
      !Array.isArray(
        sourceContext
      ),

    "assessPrivateRagTaskTypeCoverage wymaga kontekstu źródłowego."
  )

  assertCondition(
    sourceContext.status ===
      "ready",

    "assessPrivateRagTaskTypeCoverage wymaga sourceContext ze statusem ready."
  )

  assertCondition(
    sourceContext.sourceType ===
      "teacher_private",

    "Nieobsługiwany typ kontekstu źródłowego."
  )

  const lessonTopicTitle =
    sourceContext.lessonTopic
      ?.displayTitle

  assertCondition(
    typeof lessonTopicTitle ===
      "string" &&
      lessonTopicTitle.trim(),

    "Kontekst źródłowy nie zawiera nazwy tematu lekcji."
  )

  assertCondition(
    Array.isArray(
      sourceContext.sources
    ) &&
      sourceContext.sources
        .length > 0,

    "Kontekst źródłowy nie zawiera źródeł."
  )

  assertCondition(
    Number.isInteger(
      sourceContext.sourceCount
    ) &&
      sourceContext.sourceCount ===
        sourceContext.sources
          .length,

    "sourceCount nie odpowiada liczbie źródeł."
  )

  const allowedChunkIds = []
  const uniqueChunkIds =
    new Set()

  sourceContext.sources.forEach(
    (source, index) => {
      assertCondition(
        source &&
          typeof source ===
            "object" &&
          !Array.isArray(source),

        `Nieprawidłowe źródło na pozycji ${index + 1}.`
      )

      assertCondition(
        typeof source.chunkId ===
          "string" &&
          source.chunkId.trim(),

        `Źródło ${index + 1} nie ma poprawnego chunkId.`
      )

      assertCondition(
        !uniqueChunkIds.has(
          source.chunkId
        ),

        `Powielony chunkId w kontekście: ${source.chunkId}.`
      )

      assertCondition(
        typeof source.content ===
          "string" &&
          source.content.trim(),

        `Źródło ${index + 1} ma pustą treść.`
      )

      uniqueChunkIds.add(
        source.chunkId
      )

      allowedChunkIds.push(
        source.chunkId
      )
    }
  )

  return {
    lessonTopicTitle:
      lessonTopicTitle.trim(),

    allowedChunkIds,
  }
}

function buildCompactCoverageContext(
  sources
) {
  return sources
    .map((source) => {
      const heading =
        Array.isArray(
          source.headingPath
        ) &&
        source.headingPath
          .length > 0
          ? source.headingPath
              .join(" > ")
          : "(bez nagłówka)"

      return [
        `CHUNK_ID: ${source.chunkId}`,
        `NAGŁÓWEK: ${heading}`,
        "TREŚĆ:",
        source.content,
      ].join("\n")
    })
    .join(
      "\n\n---\n\n"
    )
}

function createEvaluationPrompt({
  lessonTopicTitle,
  coverageContext,
}) {
  const requirements =
    PRIVATE_RAG_TASK_SUBTYPES
      .map(
        (taskSubtype) =>
          `${taskSubtype}: ${TASK_REQUIREMENTS[taskSubtype]}`
      )
      .join("\n")

  return `
Oceń każdy typ dokładnie raz, wyłącznie na podstawie źródeł. Nie generuj zadań i nie używaj wiedzy zewnętrznej.

isSupported=true tylko wtedy, gdy źródła pozwalają utworzyć co najmniej jedno poprawne zadanie danego typu i jednoznaczny klucz odpowiedzi. Dozwolone są kontrolowane przekształcenia jawnych informacji: pytanie, twierdzenie P/F, luki, pary, dystraktory albo jeden błąd naruszający opisaną regułę.

Dla true: co najmniej jeden rzeczywisty CHUNK_ID, krótki evidenceSummary i puste missingEvidence; constraints tylko dla ograniczeń zakresu. Dla false: niepuste missingEvidence i puste constraints.
Nie wymagaj gotowych pytań, twierdzeń P/F, luk, par, dystraktorów ani błędnego kodu. Oceń, czy można je jednoznacznie utworzyć przez kontrolowane przekształcenie informacji jawnie obecnych w źródłach. Dystraktory muszą być jednoznacznie niepoprawne na podstawie tych samych źródeł.
TEMAT: ${lessonTopicTitle}

WYMAGANIA:
${requirements}

ŹRÓDŁA:
${coverageContext}
`.trim()
}

function validateAssessment({
  assessment,
  index,
  allowedTaskSubtypes,
  allowedChunkIds,
  returnedTaskSubtypes,
}) {
  assertCondition(
    assessment &&
      typeof assessment ===
        "object" &&
      !Array.isArray(
        assessment
      ),

    `Nieprawidłowa ocena na pozycji ${index + 1}.`
  )

  const {
    taskSubtype,
  } = assessment

  assertCondition(
    allowedTaskSubtypes.has(
      taskSubtype
    ),

    `Nieobsługiwany typ zadania: ${
      taskSubtype ||
      "[brak]"
    }.`
  )

  assertCondition(
    !returnedTaskSubtypes.has(
      taskSubtype
    ),

    `Powielona ocena typu ${taskSubtype}.`
  )

  returnedTaskSubtypes.add(
    taskSubtype
  )

  assertCondition(
    typeof assessment.isSupported ===
      "boolean",

    `Typ ${taskSubtype} nie ma poprawnego pola isSupported.`
  )

  assertStringArray(
    assessment.evidenceChunkIds,
    `${taskSubtype}.evidenceChunkIds`
  )

  assertStringArray(
    assessment.missingEvidence,
    `${taskSubtype}.missingEvidence`
  )

  assertStringArray(
    assessment.constraints,
    `${taskSubtype}.constraints`
  )

  assertCondition(
    typeof assessment
      .evidenceSummary ===
      "string" &&
      assessment
        .evidenceSummary
        .trim(),

    `Typ ${taskSubtype} ma pusty evidenceSummary.`
  )

  assertCondition(
    new Set(
      assessment
        .evidenceChunkIds
    ).size ===
      assessment
        .evidenceChunkIds
        .length,

    `Typ ${taskSubtype} zawiera powtórzone chunkId.`
  )

  assessment
    .evidenceChunkIds
    .forEach(
      (chunkId) => {
        assertCondition(
          allowedChunkIds.has(
            chunkId
          ),

          `Typ ${taskSubtype} wskazuje nieistniejący chunkId: ${chunkId}.`
        )
      }
    )

  if (
    assessment.isSupported
  ) {
    assertCondition(
      assessment
        .evidenceChunkIds
        .length > 0 &&
        assessment
          .missingEvidence
          .length === 0,

      `Ocena isSupported=true dla ${taskSubtype} ma niespójne dowody lub braki.`
    )

    return
  }

  assertCondition(
    assessment
      .missingEvidence
      .length > 0 &&
      assessment
        .constraints
        .length === 0,

    `Ocena isSupported=false dla ${taskSubtype} jest niespójna.`
  )
}

function validateAssessmentResult({
  assessments,
  allowedChunkIds,
}) {
  assertCondition(
    Array.isArray(
      assessments
    ) &&
      assessments.length ===
        PRIVATE_RAG_TASK_SUBTYPES
          .length,

    "Model nie zwrócił dokładnie siedmiu ocen."
  )

  const allowedTaskSubtypeSet =
    new Set(
      PRIVATE_RAG_TASK_SUBTYPES
    )

  const allowedChunkIdSet =
    new Set(
      allowedChunkIds
    )

  const returnedTaskSubtypeSet =
    new Set()

  assessments.forEach(
    (assessment, index) => {
      validateAssessment({
        assessment,
        index,

        allowedTaskSubtypes:
          allowedTaskSubtypeSet,

        allowedChunkIds:
          allowedChunkIdSet,

        returnedTaskSubtypes:
          returnedTaskSubtypeSet,
      })
    }
  )

  assertCondition(
    returnedTaskSubtypeSet.size ===
      PRIVATE_RAG_TASK_SUBTYPES
        .length,

    "Model nie ocenił wszystkich siedmiu typów zadań."
  )
}

function normalizeAssessments(
  assessments
) {
  return Object.fromEntries(
    assessments.map(
      ({
        taskSubtype,
        ...assessment
      }) => [
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

function cloneSources(sources) {
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

export async function assessPrivateRagTaskTypeCoverage({
  sourceContext,
  apiKey,
}) {
  const {
    lessonTopicTitle,
    allowedChunkIds,
  } = assertSourceContext(
    sourceContext
  )

  const coverageContext =
    buildCompactCoverageContext(
      sourceContext.sources
    )

  const openai =
    new OpenAI({
      apiKey:
        getRequiredApiKey(
          apiKey
        ),

      timeout: 120_000,
      maxRetries: 1,
    })

  const response =
    await openai.chat.completions
      .create({
        model:
          COVERAGE_EVALUATION_MODEL,

        response_format: {
          type: "json_schema",

          json_schema: {
            name:
              "private_rag_task_type_coverage",

            strict: true,

            schema:
              buildPrivateRagTaskTypeCoverageSchema({
                allowedChunkIds,

                taskSubtypes:
                  PRIVATE_RAG_TASK_SUBTYPES,
              }),
          },
        },

        messages: [
          {
            role: "system",

            content:
              "Jesteś audytorem źródeł dydaktycznych.",
          },

          {
            role: "user",

            content:
              createEvaluationPrompt({
                lessonTopicTitle,
                coverageContext,
              }),
          },
        ],

        temperature: 0,
      })

  const choice =
    response.choices?.[0]

  const message =
    choice?.message

  assertCondition(
    choice && message,

    "Model nie zwrócił kompletnej oceny pokrycia źródeł."
  )

  assertCondition(
    choice.finish_reason ===
      "stop",

    `Ocena źródeł nie została prawidłowo zakończona. Powód: ${
      choice.finish_reason ||
      "[brak]"
    }.`
  )

  assertCondition(
    !message.refusal,

    `Model odmówił oceny źródeł: ${message.refusal}`
  )

  assertCondition(
    message.content,

    "Model nie zwrócił treści oceny źródeł."
  )

  let parsedResult

  try {
    parsedResult =
      JSON.parse(
        message.content
      )
  } catch {
    throw new Error(
      "Model zwrócił nieprawidłowy JSON oceny źródeł."
    )
  }

  validateAssessmentResult({
    assessments:
      parsedResult.assessments,

    allowedChunkIds,
  })

  return {
    status: "assessed",
    reason: null,

    evaluationModel:
      COVERAGE_EVALUATION_MODEL,

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
      normalizeAssessments(
        parsedResult.assessments
      ),

    usage: {
      promptTokens:
        response.usage
          ?.prompt_tokens ??
        null,

      completionTokens:
        response.usage
          ?.completion_tokens ??
        null,

      totalTokens:
        response.usage
          ?.total_tokens ??
        null,
    },
  }
}

/*
Uruchomienie testu:
node --env-file=.env.local scripts\testPrivateRagTaskTypeCoverage.mjs
*/