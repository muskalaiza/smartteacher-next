import {
  getAuthenticatedRouteContext,
  getErrorMessage,
  isUuid,
  jsonResponse,
} from "@/lib/api/serverApiHelpers"

import {
  searchPrivateLessonTopicChunks,
} from "@/lib/privateRag/searchPrivateLessonTopicChunks"

import {
  buildPrivateRagContext,
} from "@/lib/privateRag/buildPrivateRagContext"

import {
  getOrAssessPrivateRagTaskTypeCoverage,
} from "@/lib/privateRag/getOrAssessPrivateRagTaskTypeCoverage"

import {
  buildSafeTaskPlan,
} from "@/lib/generation/buildSafeTaskPlan"

import {
  generateMaterialFromContext,
} from "@/lib/generation/generateMaterialFromContext"

export const runtime = "nodejs"

const ALLOWED_PROFILES = new Set([
  "Standard",
  "ASD",
  "ADHD",
  "Dysleksja",
  "Obcojęzyczny",
])

const ALLOWED_REQUEST_FIELDS = new Set([
  "lessonTopicId",
  "materialType",
  "taskCount",
  "profiles",
])

function validateProfiles(profiles) {
  if (
    !Array.isArray(profiles) ||
    profiles.length === 0 ||
    profiles.length > ALLOWED_PROFILES.size
  ) {
    return false
  }

  if (
    new Set(profiles).size !==
    profiles.length
  ) {
    return false
  }

  return profiles.every(
    (profile) =>
      typeof profile === "string" &&
      ALLOWED_PROFILES.has(profile)
  )
}

async function getOwnedLessonTopic({
  supabaseAdmin,
  ownerId,
  lessonTopicId,
}) {
  const {
    data: lessonTopic,
    error: lessonTopicError,
  } = await supabaseAdmin
    .from("lesson_topics")
    .select(
      [
        "id",
        "catalog_id",
        "display_title",
        "lesson_key",
      ].join(", ")
    )
    .eq(
      "id",
      lessonTopicId
    )
    .maybeSingle()

  if (lessonTopicError) {
    throw new Error(
      `Nie udało się pobrać tematu lekcji: ${lessonTopicError.message}`
    )
  }

  if (!lessonTopic) {
    return null
  }

  const {
    data: lessonCatalog,
    error: lessonCatalogError,
  } = await supabaseAdmin
    .from("lesson_catalogs")
    .select(
      [
        "id",
        "owner_id",
        "subject_id",
        "source_type",
      ].join(", ")
    )
    .eq(
      "id",
      lessonTopic.catalog_id
    )
    .eq(
      "owner_id",
      ownerId
    )
    .eq(
      "source_type",
      "teacher_private"
    )
    .maybeSingle()

  if (lessonCatalogError) {
    throw new Error(
      `Nie udało się zweryfikować katalogu lekcji: ${lessonCatalogError.message}`
    )
  }

  if (!lessonCatalog) {
    return null
  }

  return {
    lessonTopic,
    lessonCatalog,
  }
}

export async function POST(request) {
  try {
    /*
      1. Weryfikacja sesji użytkownika.

      user.id pochodzi wyłącznie ze zweryfikowanego
      tokenu Supabase Auth.
    */
    const authContext =
      await getAuthenticatedRouteContext(
        request
      )

    if (!authContext.ok) {
      return jsonResponse(
        {
          error:
            authContext.error,
        },
        authContext.status
      )
    }

    const {
      user,
      supabaseAdmin,
    } = authContext

    /*
      2. Odczyt i kontrola JSON przesłanego
      przez formularz Generatora.
    */
    let requestBody

    try {
      requestBody =
        await request.json()
    } catch {
      return jsonResponse(
        {
          error:
            "Żądanie musi zawierać poprawny obiekt JSON.",
        },
        400
      )
    }

    if (
      !requestBody ||
      typeof requestBody !== "object" ||
      Array.isArray(requestBody)
    ) {
      return jsonResponse(
        {
          error:
            "Nieprawidłowe dane żądania.",
        },
        400
      )
    }

    const hasUnknownFields =
      Object.keys(
        requestBody
      ).some(
        (field) =>
          !ALLOWED_REQUEST_FIELDS.has(
            field
          )
      )

    if (hasUnknownFields) {
      return jsonResponse(
        {
          error:
            "Żądanie zawiera nieznane pola.",
        },
        400
      )
    }

    /*
      3. Walidacja tematu lekcji.
    */
    const lessonTopicId =
      typeof requestBody
        .lessonTopicId === "string"
        ? requestBody
            .lessonTopicId
            .trim()
        : ""

    if (!isUuid(lessonTopicId)) {
      return jsonResponse(
        {
          error:
            "Brak poprawnego identyfikatora tematu lekcji.",
        },
        400
      )
    }

    /*
      4. Pierwszy pionowy przepływ obsługuje
      wyłącznie kartkówkę z jednego tematu.
    */
    const materialType =
      typeof requestBody
        .materialType === "string"
        ? requestBody
            .materialType
            .trim()
            .toLowerCase()
        : ""

    if (
      materialType !==
        "kartkówka"
    ) {
      return jsonResponse(
        {
          error:
            "Pierwsza wersja Generatora obsługuje obecnie kartkówkę.",
        },
        400
      )
    }

    /*
      5. Walidacja liczby zadań.
    */
    const taskCount =
      Number(
        requestBody.taskCount
      )

    if (
      ![5, 6, 7].includes(
        taskCount
      )
    ) {
      return jsonResponse(
        {
          error:
            "Liczba zadań musi wynosić 5, 6 albo 7.",
        },
        400
      )
    }

    /*
      6. Walidacja profili uczniów.
    */
    const profiles =
      requestBody.profiles

    if (
      !validateProfiles(
        profiles
      )
    ) {
      return jsonResponse(
        {
          error:
            "Nieprawidłowy wybór profili ucznia.",
        },
        400
      )
    }

    /*
      7. Sprawdzenie, czy temat pochodzi
      z prywatnego katalogu zalogowanego nauczyciela.

      lessonTopicId pochodzi z body,
      ale ownerId zawsze ze zweryfikowanego tokenu.
    */
    const ownedContext =
      await getOwnedLessonTopic({
        supabaseAdmin,
        ownerId:
          user.id,
        lessonTopicId,
      })

    if (!ownedContext) {
      return jsonResponse(
        {
          error:
            "Nie znaleziono prywatnego tematu lekcji.",
        },
        404
      )
    }

    const {
      lessonTopic,
      lessonCatalog,
    } = ownedContext

    const query =
      `Wyjaśnij najważniejsze informacje, definicje, zasady, składnię, przykłady i typowe błędy dotyczące tematu: ${lessonTopic.display_title}.`

    /*
      8. Semantic retrieval prywatnych źródeł
      dla właściciela, przedmiotu i tematu.
    */
    const retrievalResult =
      await searchPrivateLessonTopicChunks({
        supabaseAdmin,

        ownerId:
          user.id,

        subjectId:
          lessonCatalog
            .subject_id,

        lessonTopicId:
          lessonTopic.id,

        query,
      })

    if (
      retrievalResult.status ===
        "no_sources"
    ) {
      return jsonResponse(
        {
          status:
            "no_sources",

          error:
            "Brak opracowanego materiału dla wybranego tematu lekcji.",
        },
        422
      )
    }

    if (
      retrievalResult.status ===
        "insufficient_similarity"
    ) {
      return jsonResponse(
        {
          status:
            "insufficient_similarity",

          error:
            "Nie znaleziono wystarczająco dopasowanych fragmentów materiału.",
        },
        422
      )
    }

    if (
      retrievalResult.status !==
        "retrieved"
    ) {
      throw new Error(
        `Nieobsługiwany status retrieval: ${retrievalResult.status}.`
      )
    }

    /*
      9. Zbudowanie gotowego sourceContext.
    */
    const sourceContext =
      buildPrivateRagContext({
        retrievalResult,
      })

    if (
      sourceContext.status !==
        "ready"
    ) {
      throw new Error(
        `Nie udało się przygotować kontekstu źródłowego: ${sourceContext.status}.`
      )
    }

    /*
      10. Odczyt coverage z cache
      albo jedno nowe wywołanie modelu.
    */
    const coverageResult =
      await getOrAssessPrivateRagTaskTypeCoverage({
        supabaseAdmin,
        sourceContext,
      })

    /*
      11. Utworzenie bezpiecznego taskPlan
      wyłącznie z obsługiwanych typów zadań.
    */
    const taskPlanResult =
      buildSafeTaskPlan({
        assessments:
          coverageResult
            .assessments,

        materialType,

        taskCount,
      })

    if (
      taskPlanResult.status ===
        "insufficient_coverage"
    ) {
      return jsonResponse(
        {
          status:
            "insufficient_coverage",

          error:
            "Źródła nie pozwalają przygotować wybranej liczby zadań.",

          unsupportedTaskSubtypes:
            taskPlanResult
              .unsupportedTaskSubtypes,
        },
        422
      )
    }

    /*
      12. Structured Outputs,
      model Generatora i parser.
    */
    const generatedMaterial =
      await generateMaterialFromContext({
        topic:
          lessonTopic
            .display_title,

        type:
          materialType,

        profiles,

        taskPlan:
          taskPlanResult
            .taskPlan,

        ragContext:
          sourceContext
            .ragContext,
      })

    /*
      13. Odpowiedź dla klienta UI.
    */
    return jsonResponse({
      success: true,
      status: "generated",

      lessonTopic: {
        id:
          lessonTopic.id,

        displayTitle:
          lessonTopic
            .display_title,

        lessonKey:
          lessonTopic
            .lesson_key,
      },

      materialType,
      taskCount,
      profiles,

      taskPlan:
        taskPlanResult
          .taskPlan,

      material:
        generatedMaterial,

      coverage: {
        cacheStatus:
          coverageResult
            .cacheStatus,

        sourceCount:
          sourceContext
            .sourceCount,

        newCoverageTokens:
          coverageResult
            .usage
            ?.totalTokens ??
          null,
      },
    })
  } catch (error) {
    const errorMessage =
      getErrorMessage(error)

    console.error(
      "Material generation failed:",
      errorMessage
    )

    const responseBody = {
      error:
        "Nie udało się wygenerować materiału.",
    }

    /*
      Szczegóły techniczne są widoczne lokalnie,
      ale nie na produkcji.
    */
    if (
      process.env.NODE_ENV !==
        "production"
    ) {
      responseBody.details =
        errorMessage
    }

    return jsonResponse(
      responseBody,
      500
    )
  }
}

/*
autoryzacja
→ odczyt request.json()
→ kontrola dozwolonych pól
→ walidacja lessonTopicId
→ walidacja typu materiału
→ walidacja liczby zadań
→ walidacja profili
→ kontrola właściciela tematu
→ retrieval
→ coverage/cache
→ taskPlan
→ generowanie
*/