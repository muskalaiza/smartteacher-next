import OpenAI from "openai"

import {
  searchPrivateLessonTopicChunks,
} from "./searchPrivateLessonTopicChunks.js"

export const PRIVATE_RAG_TASK_SUBTYPES = [
  "closed_single",
  "closed_tf",
  "match_fill",
  "match_pair",
  "error_find",
  "open_code",
  "open_explain",
]

export const COVERAGE_EVALUATION_MODEL =
  "gpt-4o-mini"


const TASK_REQUIREMENTS = {
  closed_single:
    "Jednoznaczny fakt, definicja albo reguła pozwalająca ustalić jedną poprawną odpowiedź oraz odrzucić realistyczne odpowiedzi błędne.",

  closed_tf:
    "Jednoznaczny fakt lub reguła wraz z informacją pozwalającą uzasadnić, dlaczego twierdzenie jest prawdziwe albo fałszywe.",

  match_fill:
    "Co najmniej dwa różne elementy, terminy albo fragmenty konstrukcji możliwe do umieszczenia w dwóch lukach oraz materiał pozwalający odróżnić poprawne uzupełnienia od dystraktorów.",

  match_pair:
    "Co najmniej trzy jednoznaczne i różne relacje możliwe do przedstawienia jako trzy pary, na przykład pojęcie–definicja, element–rola albo konstrukcja–zastosowanie.",

  error_find:
    "Reguła, ograniczenie albo poprawny wzorzec pozwalający utworzyć dokładnie jeden kontrolowany błąd oraz jednoznacznie wskazać poprawkę i uzasadnienie.",

  open_code:
    "Składnia, struktura i znaczenie mechanizmu wystarczające do utworzenia krótkiego, kompletnego zadania programistycznego oraz poprawnego przykładowego kodu odpowiedzi.",

  open_explain:
    "Kod, schemat, algorytm albo jasno opisany mechanizm, który można przeanalizować, oraz wiedza wystarczająca do przygotowania wzorcowej odpowiedzi opisowej.",
}

const EVIDENCE_QUERIES = {
  closed_single:
    "Znajdź fakty, definicje i reguły pozwalające utworzyć pytanie jednokrotnego wyboru z jedną jednoznacznie poprawną odpowiedzią.",

  closed_tf:
    "Znajdź jednoznaczne fakty, zasady i ograniczenia pozwalające oceniać twierdzenia jako prawdziwe albo fałszywe i uzasadnić odpowiedź.",

  match_fill:
    "Znajdź co najmniej dwa terminy, elementy składni albo fragmenty konstrukcji, które można wykorzystać w zadaniu z dwiema lukami.",

  match_pair:
    "Znajdź co najmniej trzy jednoznaczne relacje lub pary, na przykład pojęcie i definicja, element i rola albo konstrukcja i zastosowanie.",

  error_find:
    "Znajdź typowe błędy, zakazy, ograniczenia, poprawne wzorce lub reguły pozwalające utworzyć kod z dokładnie jednym błędem i jednoznaczną poprawką.",

  open_code:
    "Znajdź składnię, strukturę, przykłady i reguły wystarczające do napisania krótkiego poprawnego kodu dotyczącego tego tematu.",

  open_explain:
    "Znajdź kod, schemat lub mechanizm nadający się do analizy oraz informacje potrzebne do wyjaśnienia jego działania.",
}

function getRequiredApiKey(apiKey) {
  const resolvedApiKey =
    apiKey || process.env.OPENAI_API_KEY

  if (!resolvedApiKey) {
    throw new Error(
      "Brak wymaganej zmiennej środowiskowej OPENAI_API_KEY."
    )
  }

  return resolvedApiKey
}

function createAssessmentSchema(
  allowedChunkIds
) {
  const assessmentProperties =
    Object.fromEntries(
      PRIVATE_RAG_TASK_SUBTYPES.map(
        (taskSubtype) => [
          taskSubtype,
          {
            type: "object",
            properties: {
             isSupported: {
  type: "boolean",
},

              evidenceChunkIds: {
                type: "array",
                items: {
                  type: "string",
                  enum: allowedChunkIds,
                },
              },

              evidenceSummary: {
                type: "string",
              },

              missingEvidence: {
                type: "array",
                items: {
                  type: "string",
                },
              },

              constraints: {
                type: "array",
                items: {
                  type: "string",
                },
              },
            },

            required: [
  "isSupported",
  "evidenceChunkIds",
  "evidenceSummary",
  "missingEvidence",
  "constraints",
],

            additionalProperties: false,
          },
        ]
      )
    )

  return {
    type: "object",

    properties: {
      assessments: {
        type: "object",
        properties:
          assessmentProperties,

        required:
          PRIVATE_RAG_TASK_SUBTYPES,

        additionalProperties: false,
      },
    },

    required: ["assessments"],
    additionalProperties: false,
  }
}

function createEvaluationPrompt({
  lessonTopicTitle,
  evidenceChunks,
}) {
  const requirements =
    PRIVATE_RAG_TASK_SUBTYPES.map(
      (taskSubtype) =>
        `- ${taskSubtype}: ${TASK_REQUIREMENTS[taskSubtype]}`
    ).join("\n")

  const sourceContext =
    evidenceChunks
      .map((chunk) => {
        const retrievedFor =
          chunk.retrievedFor.join(", ")

        const heading =
          chunk.headingPath.length > 0
            ? chunk.headingPath.join(" > ")
            : "(bez nagłówka)"

        return [
          `CHUNK_ID: ${chunk.chunkId}`,
          `DOKUMENT: ${chunk.originalFileName}`,
          `POBRANY_DLA: ${retrievedFor}`,
          `NAGŁÓWEK: ${heading}`,
          `TREŚĆ:`,
          chunk.content,
        ].join("\n")
      })
      .join(
        "\n\n----------------------------------------\n\n"
      )

  return `
Oceń wyłącznie, czy przekazane źródła zawierają wystarczające dane do utworzenia poprawnych zadań dydaktycznych.

TEMAT LEKCJI:
${lessonTopicTitle}

Nie generuj zadań.
Nie twórz pytań, kodu z błędem, dystraktorów ani odpowiedzi.
Nie używaj wiedzy ogólnej ani informacji spoza przekazanych chunków.
Nie zakładaj, że coś jest prawdziwe, jeżeli nie wynika ze źródeł.

Dopuszczalne jest uznanie typu error_find za obsługiwany na podstawie jednoznacznej reguły lub poprawnego wzorca, nawet gdy dokument nie zawiera gotowego błędnego przykładu. Błąd musiałby jednak być prostym, kontrolowanym naruszeniem tej reguły.

KRYTERIUM DECYZJI:

isSupported = true:
Źródła pozwalają utworzyć co najmniej jedno poprawne zadanie danego typu oraz jednoznaczny klucz odpowiedzi, bez korzystania z wiedzy spoza źródeł.

isSupported = false:
Na podstawie źródeł nie można utworzyć nawet jednego poprawnego zadania danego typu wraz z jednoznacznym kluczem odpowiedzi.

Nie wymagaj, aby dokument zawierał gotowe pytanie, gotowe dystraktory, gotowe twierdzenie Prawda/Fałsz, gotowe luki ani gotowe pary.

Dozwolone są kontrolowane przekształcenia treści jawnie obecnej w źródłach, między innymi:
- sformułowanie pytania na podstawie faktu lub reguły,
- utworzenie twierdzenia prawdziwego albo fałszywego, jeśli jego ocenę można jednoznacznie uzasadnić źródłem,
- zamiana jawnych terminów lub elementów składni na luki,
- zestawienie jawnych relacji w pary,
- wykorzystanie innych elementów ze źródła jako dystraktorów, jeżeli ich niepoprawność dla danego pytania jest jednoznaczna,
- utworzenie jednego błędu przez proste naruszenie reguły jawnie opisanej w źródle.

Dla każdego typu:
- wskaż wyłącznie rzeczywiste CHUNK_ID z przekazanego kontekstu,
- evidenceSummary ma krótko opisywać znaleziony dowód,
- gdy isSupported = true, evidenceChunkIds nie może być puste, a missingEvidence musi być pustą tablicą,
- gdy isSupported = true, constraints może opisywać ograniczony zakres możliwych zadań albo pozostać pustą tablicą,
- gdy isSupported = false, missingEvidence musi dokładnie wskazywać brakujące dane, a constraints musi być pustą tablicą,
- nie oceniaj struktury JSON zadania — oceniaj wyłącznie wystarczalność wiedzy źródłowej.

MINIMALNE WYMAGANIA:

${requirements}

ŹRÓDŁA:

${sourceContext}
`.trim()
}

function assertStringArray(
  value,
  label
) {
  if (
    !Array.isArray(value) ||
    value.some(
      (item) =>
        typeof item !== "string" ||
        !item.trim()
    )
  ) {
    throw new Error(
      `${label} nie jest poprawną tablicą niepustych tekstów.`
    )
  }
}

function validateAssessmentResult({
  assessments,
  allowedChunkIds,
}) {
  if (
    !assessments ||
    typeof assessments !== "object" ||
    Array.isArray(assessments)
  ) {
    throw new Error(
      "Model nie zwrócił obiektu assessments."
    )
  }

  const returnedTaskSubtypes =
    Object.keys(assessments).sort()

  const expectedTaskSubtypes = [
    ...PRIVATE_RAG_TASK_SUBTYPES,
  ].sort()

  if (
    JSON.stringify(returnedTaskSubtypes) !==
    JSON.stringify(expectedTaskSubtypes)
  ) {
    throw new Error(
      "Model nie ocenił dokładnie siedmiu wymaganych typów zadań."
    )
  }

  const allowedChunkIdSet =
    new Set(allowedChunkIds)

  PRIVATE_RAG_TASK_SUBTYPES.forEach(
    (taskSubtype) => {
      const assessment =
        assessments[taskSubtype]

      if (
        !assessment ||
        typeof assessment !== "object" ||
        Array.isArray(assessment)
      ) {
        throw new Error(
          `Brak poprawnej oceny typu ${taskSubtype}.`
        )
      }

      if (
  typeof assessment.isSupported !==
    "boolean"
) {
  throw new Error(
    `Typ ${taskSubtype} nie ma poprawnego pola isSupported.`
  )
}

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

      if (
        typeof assessment.evidenceSummary !==
          "string" ||
        !assessment.evidenceSummary.trim()
      ) {
        throw new Error(
          `Typ ${taskSubtype} ma pusty evidenceSummary.`
        )
      }

      const uniqueEvidenceChunkIds =
        new Set(
          assessment.evidenceChunkIds
        )

      if (
        uniqueEvidenceChunkIds.size !==
        assessment.evidenceChunkIds.length
      ) {
        throw new Error(
          `Typ ${taskSubtype} zawiera powtórzone chunk_id.`
        )
      }

      assessment.evidenceChunkIds.forEach(
        (chunkId) => {
          if (
            !allowedChunkIdSet.has(chunkId)
          ) {
            throw new Error(
              `Typ ${taskSubtype} wskazuje nieistniejący chunk_id: ${chunkId}.`
            )
          }
        }
      )

    if (
  assessment.isSupported &&
  (
    assessment.evidenceChunkIds
      .length === 0 ||
    assessment.missingEvidence
      .length !== 0
  )
) {
  throw new Error(
    `Ocena isSupported=true dla ${taskSubtype} ma niespójne dowody lub braki.`
  )
}

if (
  !assessment.isSupported &&
  (
    assessment.missingEvidence
      .length === 0 ||
    assessment.constraints
      .length !== 0
  )
) {
  throw new Error(
    `Ocena isSupported=false dla ${taskSubtype} jest niespójna.`
  )
}
    }
  )
}

export async function assessPrivateRagTaskTypeCoverage({
  supabaseAdmin,
  ownerId,
  subjectId,
  lessonTopicId,
  matchCountPerTask = 5,
  apiKey,
}) {
  const evidenceChunkMap = new Map()
  const retrievalByTask = {}

  let lessonTopic = null
  let sourceDocuments = []

  for (
    const taskSubtype of
    PRIVATE_RAG_TASK_SUBTYPES
  ) {
    const retrievalResult =
      await searchPrivateLessonTopicChunks({
        supabaseAdmin,
        ownerId,
        subjectId,
        lessonTopicId,
        query:
          EVIDENCE_QUERIES[taskSubtype],
        matchCount:
          matchCountPerTask,
        apiKey,
      })

    if (
      retrievalResult.status ===
        "no_sources"
    ) {
      return {
        status: "no_sources",
        reason: retrievalResult.reason,
        lessonTopic:
          retrievalResult.lessonTopic,
        sourceDocuments: [],
        retrievalByTask: {},
        evidenceChunks: [],
        assessments: null,
      }
    }

    if (
      retrievalResult.status !==
        "retrieved" ||
      !retrievalResult.retrieval
    ) {
      throw new Error(
        `Nie udało się pobrać źródeł dla typu ${taskSubtype}.`
      )
    }

    lessonTopic =
      retrievalResult.lessonTopic

    sourceDocuments =
      retrievalResult.sourceDocuments

    retrievalByTask[taskSubtype] = {
      query:
        retrievalResult.retrieval.query,

      resultCount:
        retrievalResult.retrieval
          .resultCount,

      topSimilarity:
        retrievalResult.retrieval
          .matches[0]?.similarity ??
        null,

      chunkIds:
        retrievalResult.retrieval
          .matches.map(
            (match) => match.chunk_id
          ),
    }

    const documentNameById =
      new Map(
        retrievalResult.sourceDocuments.map(
          (document) => [
            document.id,
            document.originalFileName,
          ]
        )
      )

    retrievalResult.retrieval.matches.forEach(
      (match) => {
        const existingChunk =
          evidenceChunkMap.get(
            match.chunk_id
          )

        if (existingChunk) {
          if (
            !existingChunk.retrievedFor
              .includes(taskSubtype)
          ) {
            existingChunk.retrievedFor.push(
              taskSubtype
            )
          }

          return
        }

        evidenceChunkMap.set(
          match.chunk_id,
          {
            chunkId: match.chunk_id,
            documentId:
              match.document_id,

            originalFileName:
              documentNameById.get(
                match.document_id
              ) ||
              "(nieznany dokument)",

            chunkIndex:
              match.chunk_index,

            headingPath:
              match.heading_path,

            content:
              match.content,

            contentHash:
              match.content_hash,

            retrievedFor: [
              taskSubtype,
            ],
          }
        )
      }
    )
  }

  const evidenceChunks = [
    ...evidenceChunkMap.values(),
  ]

  if (evidenceChunks.length === 0) {
    throw new Error(
      "Nie zebrano żadnych chunków do oceny pokrycia typów zadań."
    )
  }

  const allowedChunkIds =
    evidenceChunks.map(
      (chunk) => chunk.chunkId
    )

  const openai = new OpenAI({
    apiKey:
      getRequiredApiKey(apiKey),
    timeout: 120_000,
    maxRetries: 1,
  })

  const response =
    await openai.chat.completions.create({
      model:
        COVERAGE_EVALUATION_MODEL,

      response_format: {
        type: "json_schema",

        json_schema: {
          name:
            "private_rag_task_type_coverage",

          strict: true,

          schema:
            createAssessmentSchema(
              allowedChunkIds
            ),
        },
      },

      messages: [
        {
          role: "system",
          content:
            "Jesteś rygorystycznym audytorem źródeł dydaktycznych. Oceniasz wyłącznie dane jawnie obecne w przekazanych źródłach. Nie generujesz zadań i nie korzystasz z wiedzy zewnętrznej.",
        },

        {
          role: "user",
          content:
            createEvaluationPrompt({
              lessonTopicTitle:
                lessonTopic.displayTitle,

              evidenceChunks,
            }),
        },
      ],

      temperature: 0,
    })

  const choice =
    response.choices?.[0]

  const message =
    choice?.message

  if (!choice || !message) {
    throw new Error(
      "Model nie zwrócił kompletnej oceny pokrycia źródeł."
    )
  }

  if (choice.finish_reason !== "stop") {
    throw new Error(
      `Ocena źródeł nie została prawidłowo zakończona. Powód: ${
        choice.finish_reason ||
        "[brak]"
      }.`
    )
  }

  if (message.refusal) {
    throw new Error(
      `Model odmówił oceny źródeł: ${message.refusal}`
    )
  }

  if (!message.content) {
    throw new Error(
      "Model nie zwrócił treści oceny źródeł."
    )
  }

  let parsedResult

  try {
    parsedResult =
      JSON.parse(message.content)
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

    lessonTopic,

    sourceDocuments,

    retrievalByTask,

    evidenceChunks,

    assessments:
      parsedResult.assessments,

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
uruchomienie testu
node --env-file=.env.local scripts\testPrivateRagTaskTypeCoverage.mjs

*/