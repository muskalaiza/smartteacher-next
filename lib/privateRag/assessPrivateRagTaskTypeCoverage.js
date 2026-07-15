import OpenAI from "openai"

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

function assertSourceContext(
  sourceContext
) {
  if (
    !sourceContext ||
    typeof sourceContext !== "object" ||
    Array.isArray(sourceContext)
  ) {
    throw new Error(
      "assessPrivateRagTaskTypeCoverage wymaga kontekstu źródłowego."
    )
  }

  if (sourceContext.status !== "ready") {
    throw new Error(
      "assessPrivateRagTaskTypeCoverage wymaga sourceContext ze statusem ready."
    )
  }

  if (
    sourceContext.sourceType !==
      "teacher_private"
  ) {
    throw new Error(
      "Nieobsługiwany typ kontekstu źródłowego."
    )
  }

  const lessonTopicTitle =
    sourceContext.lessonTopic
      ?.displayTitle

  if (
    typeof lessonTopicTitle !==
      "string" ||
    !lessonTopicTitle.trim()
  ) {
    throw new Error(
      "Kontekst źródłowy nie zawiera nazwy tematu lekcji."
    )
  }

  if (
    !Array.isArray(
      sourceContext.sources
    ) ||
    sourceContext.sources.length === 0
  ) {
    throw new Error(
      "Kontekst źródłowy nie zawiera źródeł."
    )
  }

  if (
    !Number.isInteger(
      sourceContext.sourceCount
    ) ||
    sourceContext.sourceCount !==
      sourceContext.sources.length
  ) {
    throw new Error(
      "sourceCount nie odpowiada liczbie źródeł."
    )
  }

  if (
    typeof sourceContext.ragContext !==
      "string" ||
    !sourceContext.ragContext.trim()
  ) {
    throw new Error(
      "Kontekst źródłowy nie zawiera tekstowego ragContext."
    )
  }

  const allowedChunkIds = []
  const uniqueChunkIds = new Set()

  sourceContext.sources.forEach(
    (source, index) => {
      if (
        !source ||
        typeof source !== "object" ||
        Array.isArray(source)
      ) {
        throw new Error(
          `Nieprawidłowe źródło na pozycji ${index + 1}.`
        )
      }

      if (
        typeof source.chunkId !==
          "string" ||
        !source.chunkId.trim()
      ) {
        throw new Error(
          `Źródło ${index + 1} nie ma poprawnego chunkId.`
        )
      }

      if (
        uniqueChunkIds.has(
          source.chunkId
        )
      ) {
        throw new Error(
          `Powielony chunkId w kontekście: ${source.chunkId}.`
        )
      }

      if (
        typeof source.content !==
          "string" ||
        !source.content.trim()
      ) {
        throw new Error(
          `Źródło ${index + 1} ma pustą treść.`
        )
      }

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
  ragContext,
}) {
  const requirements =
    PRIVATE_RAG_TASK_SUBTYPES.map(
      (taskSubtype) =>
        `- ${taskSubtype}: ${TASK_REQUIREMENTS[taskSubtype]}`
    ).join("\n")

  return `
Oceń wyłącznie, czy wspólny kontekst źródłowy zawiera wystarczające dane do utworzenia poprawnych zadań dydaktycznych.

TEMAT LEKCJI:
${lessonTopicTitle}

Nie generuj zadań.
Nie twórz pytań, kodu z błędem, dystraktorów ani odpowiedzi.
Nie używaj wiedzy ogólnej ani informacji spoza przekazanego kontekstu.
Nie zakładaj, że coś jest prawdziwe, jeżeli nie wynika ze źródeł.
Oceń wszystkie siedem typów na podstawie tego samego wspólnego kontekstu.

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

WSPÓLNY KONTEKST ŹRÓDŁOWY:

${ragContext}
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
      `${label} nie jest poprawną tablicą tekstów.`
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
    Object.keys(
      assessments
    ).sort()

  const expectedTaskSubtypes = [
    ...PRIVATE_RAG_TASK_SUBTYPES,
  ].sort()

  if (
    JSON.stringify(
      returnedTaskSubtypes
    ) !==
    JSON.stringify(
      expectedTaskSubtypes
    )
  ) {
    throw new Error(
      "Model nie ocenił dokładnie siedmiu wymaganych typów zadań."
    )
  }

  const allowedChunkIdSet =
    new Set(
      allowedChunkIds
    )

  PRIVATE_RAG_TASK_SUBTYPES.forEach(
    (taskSubtype) => {
      const assessment =
        assessments[
          taskSubtype
        ]

      if (
        !assessment ||
        typeof assessment !==
          "object" ||
        Array.isArray(
          assessment
        )
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
        assessment.evidenceChunkIds
          .length
      ) {
        throw new Error(
          `Typ ${taskSubtype} zawiera powtórzone chunk_id.`
        )
      }

      assessment.evidenceChunkIds.forEach(
        (chunkId) => {
          if (
            !allowedChunkIdSet.has(
              chunkId
            )
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
          assessment
            .evidenceChunkIds
            .length === 0 ||
          assessment
            .missingEvidence
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
          assessment
            .missingEvidence
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
            "Jesteś rygorystycznym audytorem źródeł dydaktycznych. Oceniasz wyłącznie dane jawnie obecne w przekazanym kontekście źródłowym. Nie generujesz zadań i nie korzystasz z wiedzy zewnętrznej.",
        },

        {
          role: "user",

          content:
            createEvaluationPrompt({
              lessonTopicTitle,

              ragContext:
                sourceContext.ragContext,
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

  if (
    choice.finish_reason !==
      "stop"
  ) {
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
Uruchomienie testu:
node --env-file=.env.local scripts\testPrivateRagTaskTypeCoverage.mjs
*/