import {
  getAuthenticatedRouteContext,
  getErrorMessage,
  isUuid,
  jsonResponse,
} from "@/lib/api/serverApiHelpers"

import {
  recordAiUsageEventSafely,
} from "@/lib/aiUsage/recordAiUsageEvent"

import {
  ensureFreePlanEntitlement,
} from "@/lib/billing/freePlanServer"

import {
  buildGenerationIdentity,
} from "@/lib/generation/buildGenerationIdentity"

import {
  buildTaskPlan,
} from "@/lib/generation/buildTaskPlan"

import {
  claimGeneratedMaterial,
  markGeneratedMaterialFailed,
  markGeneratedMaterialReady,
} from "@/lib/generation/generatedMaterialsCache"

import {
  generateMaterialFromContext,
} from "@/lib/generation/generateMaterialFromContext"

import {
  getLessonSectionSourceContext,
  LessonSectionSourceNotFoundError,
} from "@/lib/generation/getLessonSectionSourceContext"

import {
  getLessonTopicSourceContext,
  LessonTopicSourceNotFoundError,
} from "@/lib/generation/getLessonTopicSourceContext"

import {
  getMaterialContentSchemaVersion,
  isMaterialGenerationEnabled,
} from "@/lib/generation/materialContracts"

export const runtime = "nodejs"

const GENERATOR_MODEL =
  "gpt-4o-mini"

const GENERATOR_VERSION =
  "generator_v1"

const ALLOWED_PROFILES = new Set([
  "Standard",
  "ASD",
  "ADHD",
  "Dysleksja",
  "Obcojęzyczny",
])

const ALLOWED_REQUEST_FIELDS = new Set([
  "lessonTopicId",
  "lessonSectionId",
  "materialType",
  "taskCount",
  "profiles",
  "acceptPartialSources",
])

function validateProfiles(
  profiles
) {
  if (
    !Array.isArray(profiles) ||
    profiles.length === 0 ||
    profiles.length >
      ALLOWED_PROFILES.size
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
      typeof profile ===
        "string" &&
      ALLOWED_PROFILES.has(
        profile
      )
  )
}

async function getOwnedLessonCatalogContext({
  supabaseAdmin,
  ownerId,
  lessonCatalogId,
}) {
  const {
    data: lessonCatalog,
    error: lessonCatalogError,
  } =
    await supabaseAdmin
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
        lessonCatalogId
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

  const {
    data: subject,
    error: subjectError,
  } =
    await supabaseAdmin
      .from("subjects")
      .select(
        [
          "id",
          "name",
        ].join(", ")
      )
      .eq(
        "id",
        lessonCatalog.subject_id
      )
      .maybeSingle()

  if (subjectError) {
    throw new Error(
      `Nie udało się pobrać przedmiotu: ${subjectError.message}`
    )
  }

  if (!subject) {
    throw new Error(
      "Katalog lekcji wskazuje na nieistniejący przedmiot."
    )
  }

  return {
    lessonCatalog,
    subject,
  }
}

async function getOwnedLessonTopic({
  supabaseAdmin,
  ownerId,
  lessonTopicId,
}) {
  const {
    data: lessonTopic,
    error: lessonTopicError,
  } =
    await supabaseAdmin
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

  const catalogContext =
    await getOwnedLessonCatalogContext({
      supabaseAdmin,
      ownerId,
      lessonCatalogId:
        lessonTopic.catalog_id,
    })

  if (!catalogContext) {
    return null
  }

  return {
    lessonTopic,
    ...catalogContext,
  }
}

async function getOwnedLessonSection({
  supabaseAdmin,
  ownerId,
  lessonSectionId,
}) {
  const {
    data: lessonSection,
    error: lessonSectionError,
  } =
    await supabaseAdmin
      .from("lesson_sections")
      .select(
        [
          "id",
          "catalog_id",
          "display_name",
          "section_key",
        ].join(", ")
      )
      .eq(
        "id",
        lessonSectionId
      )
      .eq(
        "is_active",
        true
      )
      .maybeSingle()

  if (lessonSectionError) {
    throw new Error(
      `Nie udało się pobrać działu: ${lessonSectionError.message}`
    )
  }

  if (!lessonSection) {
    return null
  }

  const catalogContext =
    await getOwnedLessonCatalogContext({
      supabaseAdmin,
      ownerId,
      lessonCatalogId:
        lessonSection.catalog_id,
    })

  if (!catalogContext) {
    return null
  }

  return {
    lessonSection,
    ...catalogContext,
  }
}

function buildGeneratedResponse({
  lessonTopic,
  lessonSection,
  generationManifest,
  generationFingerprint,
  sourceResult,
  material,
  usage,
  cacheStatus,
  generatedMaterialId,
  accessCount,
}) {
  const lessonScope =
    lessonSection
      ? {
          lessonSection: {
            id:
              lessonSection.id,

            displayTitle:
              lessonSection
                .display_name,

            sectionKey:
              lessonSection
                .section_key,
          },
        }
      : {
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
        }

  const source =
    lessonSection
      ? {
          topicCount:
            sourceResult
              .topicCount,

          readyTopicCount:
            sourceResult
              .readyTopicCount,

          missingTopicCount:
            sourceResult
              .missingTopicCount,

          documentCount:
            sourceResult
              .documentCount,

          chunkCount:
            sourceResult
              .chunkCount,

          sourceFingerprint:
            sourceResult
              .sourceFingerprint,

          sourceManifestVersion:
            sourceResult
              .sourceManifestVersion,
        }
      : {
          documentId:
            sourceResult
              .documentId,

          fileName:
            sourceResult
              .sourceFilename,

          chunkCount:
            sourceResult
              .chunkCount,

          sourceFingerprint:
            sourceResult
              .sourceFingerprint,

          sourceManifestVersion:
            sourceResult
              .sourceManifestVersion,
        }

  return {
    success: true,
    status: "generated",

    ...lessonScope,

    materialType:
      generationManifest
        .materialType,

    taskCount:
      generationManifest
        .taskCount,

    profiles:
      generationManifest
        .profiles,

    taskPlan:
      generationManifest
        .taskPlan,

    material,

    cache: {
      status:
        cacheStatus,

      generatedMaterialId,

      accessCount,
    },

    source,

    generation: {
      generationFingerprint,

      generatorVersion:
        generationManifest
          .generatorVersion,

      contentSchemaVersion:
        generationManifest
          .contentSchemaVersion,

      model:
        generationManifest
          .model,

      usage,
    },
  }
}

export async function POST(
  request
) {
  try {
    /*
      1. Weryfikacja sesji użytkownika.
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
      2. Odczyt i kontrola JSON.
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
      typeof requestBody !==
        "object" ||
      Array.isArray(
        requestBody
      )
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
      3. Walidacja aktywnego typu materiału.
    */
    const materialType =
      typeof requestBody
        .materialType ===
        "string"
        ? requestBody
            .materialType
            .trim()
            .toLowerCase()
        : ""

    if (!isMaterialGenerationEnabled(materialType)) {
      return jsonResponse(
        {
          error:
            "Generator nie obsługuje wybranego typu materiału.",
        },
        400
      )
    }

    const contentSchemaVersion =
      getMaterialContentSchemaVersion(materialType)

    const isTest =
      materialType ===
        "sprawdzian"

    /*
      4. Walidacja zakresu:
      temat dla karty pracy i kartkówki,
      dział dla sprawdzianu.
    */
    const lessonTopicId =
      typeof requestBody
        .lessonTopicId ===
        "string"
        ? requestBody
            .lessonTopicId
            .trim()
        : ""

    const lessonSectionId =
      typeof requestBody
        .lessonSectionId ===
        "string"
        ? requestBody
            .lessonSectionId
            .trim()
        : ""

    if (
      isTest
        ? !isUuid(
            lessonSectionId
          ) ||
          Boolean(
            lessonTopicId
          )
        : !isUuid(
            lessonTopicId
          ) ||
          Boolean(
            lessonSectionId
          )
    ) {
      return jsonResponse(
        {
          error:
            isTest
              ? "Sprawdzian wymaga poprawnego identyfikatora działu."
              : "Wybrany materiał wymaga poprawnego identyfikatora tematu lekcji.",
        },
        400
      )
    }

    const hasAcceptPartialSources =
      Object.prototype.hasOwnProperty.call(
        requestBody,
        "acceptPartialSources"
      )

    if (
      hasAcceptPartialSources &&
      typeof requestBody
        .acceptPartialSources !==
        "boolean"
    ) {
      return jsonResponse(
        {
          error:
            "acceptPartialSources musi być wartością logiczną.",
        },
        400
      )
    }

    if (
      !isTest &&
      hasAcceptPartialSources
    ) {
      return jsonResponse(
        {
          error:
            "Potwierdzenie częściowych źródeł może należeć wyłącznie do sprawdzianu.",
        },
        400
      )
    }

    const acceptPartialSources =
      requestBody
        .acceptPartialSources ===
        true

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
      6. Walidacja profili.
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
      7. Kontrola prywatnego zakresu,
      katalogu i przedmiotu.
    */
    const ownedContext =
      isTest
        ? await getOwnedLessonSection({
            supabaseAdmin,

            ownerId:
              user.id,

            lessonSectionId,
          })
        : await getOwnedLessonTopic({
            supabaseAdmin,

            ownerId:
              user.id,

            lessonTopicId,
          })

    if (!ownedContext) {
      return jsonResponse(
        {
          error:
            isTest
              ? "Nie znaleziono prywatnego działu."
              : "Nie znaleziono prywatnego tematu lekcji.",
        },
        404
      )
    }

    const {
      lessonTopic,
      lessonSection,
      lessonCatalog,
      subject,
    } = ownedContext

    /*
      8. Pełne, zweryfikowane źródła.
    */
    const sourceResult =
      isTest
        ? await getLessonSectionSourceContext({
            supabaseAdmin,

            ownerId:
              user.id,

            subjectId:
              lessonCatalog
                .subject_id,

            lessonCatalogId:
              lessonCatalog.id,

            lessonSectionId:
              lessonSection.id,
          })
        : await getLessonTopicSourceContext({
            supabaseAdmin,

            ownerId:
              user.id,

            subjectId:
              lessonCatalog
                .subject_id,

            lessonTopicId:
              lessonTopic.id,
          })

    if (
      isTest &&
      sourceResult
        .missingTopicCount > 0 &&
      !acceptPartialSources
    ) {
      return jsonResponse(
        {
          status:
            "partial_sources",

          error:
            "Nie wszystkie tematy wybranego działu mają gotowe materiały źródłowe.",

          lessonSection: {
            id:
              lessonSection.id,

            displayTitle:
              lessonSection
                .display_name,
          },

          topicCount:
            sourceResult
              .topicCount,

          readyTopicCount:
            sourceResult
              .readyTopicCount,

          missingTopics:
            sourceResult
              .missingTopics,
        },
        409
      )
    }

    /*
      9. Deterministyczny plan
      z templates.js.
    */
    const taskPlan =
      buildTaskPlan({
        materialType,
        taskCount,
      })

    /*
      10. Kanoniczna tożsamość
      generowania.
    */
    const {
      generationFingerprint,
      generationManifest,
    } =
      buildGenerationIdentity({
        sourceFingerprint:
          sourceResult
            .sourceFingerprint,

        lessonTopicId:
          isTest
            ? null
            : lessonTopic.id,

        lessonSectionId:
          isTest
            ? lessonSection.id
            : null,

        topicTitle:
          isTest
            ? lessonSection
                .display_name
            : lessonTopic
                .display_title,

        materialType,
        taskCount,
        profiles,
        taskPlan,

        generatorVersion:
          GENERATOR_VERSION,

        contentSchemaVersion,

        model:
          GENERATOR_MODEL,
      })

    /*
      11. Atomowa decyzja:
      HIT / MISS / in progress.
    */
    await ensureFreePlanEntitlement({
      supabaseAdmin,
      ownerId: user.id,
    })

    const cacheClaim =
      await claimGeneratedMaterial({
        supabaseAdmin,

        claimData: {
          ownerId:
            user.id,

          subjectId:
            lessonCatalog
              .subject_id,

          lessonTopicId:
            isTest
              ? null
              : generationManifest
                  .lessonTopicId,

          sourceDocumentId:
            isTest
              ? null
              : sourceResult
                  .documentId,

          subjectNameSnapshot:
            subject
              .name,

          topicTitleSnapshot:
            generationManifest
              .topicTitle,

          sourceFileNameSnapshot:
            isTest
              ? sourceResult
                  .sourceFileNameSnapshot
              : sourceResult
                  .sourceFilename,

          materialType:
            generationManifest
              .materialType,

          taskCount:
            generationManifest
              .taskCount,

          profiles:
            generationManifest
              .profiles,

          taskPlan:
            generationManifest
              .taskPlan,

          sourceFingerprint:
            generationManifest
              .sourceFingerprint,

          sourceManifestVersion:
            sourceResult
              .sourceManifestVersion,

          generationFingerprint,

          generatorVersion:
            generationManifest
              .generatorVersion,

          contentSchemaVersion:
            generationManifest
              .contentSchemaVersion,

          model:
            generationManifest
              .model,
        },
      })

    /*
      12A. Cache HIT:
      bez wywołania modelu.
    */
    if (
      cacheClaim.state ===
        "hit"
    ) {
      return jsonResponse(
        buildGeneratedResponse({
          lessonTopic,
          lessonSection,
          generationManifest,
          generationFingerprint,
          sourceResult,

          material:
            cacheClaim.material,

          usage: {
            promptTokens: 0,
            completionTokens: 0,
            totalTokens: 0,
          },

          cacheStatus:
            "hit",

          generatedMaterialId:
            cacheClaim
              .generatedMaterialId,

          accessCount:
            cacheClaim
              .accessCount,
        })
      )
    }

    /*
      12B. Brak aktywnego
      uprawnienia produktowego.
    */
    if (
      cacheClaim.state ===
        "subscription_required"
    ) {
      return jsonResponse(
        {
          status:
            "subscription_required",

          error:
            "Aktywna subskrypcja SmartTeacher jest wymagana do wygenerowania nowego materiału.",
        },
        402
      )
    }

    /*
      12C. Limit okresu został
      w całości wykorzystany.
    */
    if (
      cacheClaim.state ===
        "limit_exhausted"
    ) {
      return jsonResponse(
        {
          status:
            "generation_limit_exhausted",

          error:
            "Dostępny limit generowań został wykorzystany.",
        },
        429
      )
    }

    if (
      cacheClaim.state ===
        "free_material_not_allowed"
    ) {
      return jsonResponse(
        {
          status:
            "free_plan_restriction",

          error:
            "Plan Free obejmuje jedną kartę pracy i jedną kartkówkę. Sprawdzian jest dostępny w planie miesięcznym.",
        },
        403
      )
    }

    if (
      cacheClaim.state ===
        "free_material_type_exhausted"
    ) {
      return jsonResponse(
        {
          status:
            "free_plan_restriction",

          error:
            "Ten rodzaj materiału został już wykorzystany w Planie Free. Możesz przejść na plan miesięczny.",
        },
        429
      )
    }

    if (
      cacheClaim.state ===
        "free_topic_mismatch"
    ) {
      return jsonResponse(
        {
          status:
            "free_plan_restriction",

          error:
            "Oba darmowe materiały muszą dotyczyć tego samego tematu wybranego przy pierwszym udanym generowaniu.",
        },
        409
      )
    }

    /*
      12D. Inne żądanie generuje
      identyczny materiał.
    */
    if (
      cacheClaim.state ===
        "in_progress"
    ) {
      return jsonResponse(
        {
          status:
            "generation_in_progress",

          error:
            "Identyczny materiał jest już generowany. Spróbuj ponownie za chwilę.",

          generationFingerprint,
        },
        409
      )
    }

    if (
      cacheClaim.state !==
        "reserved"
    ) {
      throw new Error(
        `Nieobsługiwany stan cache: ${cacheClaim.state}.`
      )
    }

    /*
      12E. Cache MISS:
      dokładnie jedno wywołanie modelu.
    */
    try {
      const generationResult =
        await generateMaterialFromContext({
          topicTitle:
            generationManifest
              .topicTitle,

          materialType:
            generationManifest
              .materialType,

          profiles:
            generationManifest
              .profiles,

          taskPlan:
            generationManifest
              .taskPlan,

          sourceContext:
            sourceResult
              .sourceContext,

          sourceTopics:
            isTest
              ? sourceResult
                  .sourceTopics
              : undefined,

          model:
            generationManifest
              .model,

          onAiUsageEvent:
            ({
              model,
              status,
              usage,
            }) =>
              recordAiUsageEventSafely({
                supabaseAdmin,

                ownerId:
                  user.id,

                operation:
                  "material_generation",

                generatedMaterialId:
                  cacheClaim
                    .generatedMaterialId,

                model,
                status,
                usage,
              }),
        })

      const readyRecord =
        await markGeneratedMaterialReady({
          supabaseAdmin,

          ownerId:
            user.id,

          generatedMaterialId:
            cacheClaim
              .generatedMaterialId,

          reservationStartedAt:
            cacheClaim
              .startedAt,

          material:
            generationResult
              .material,

          usage:
            generationResult
              .usage,
        })

      return jsonResponse(
        buildGeneratedResponse({
          lessonTopic,
          lessonSection,
          generationManifest,
          generationFingerprint,
          sourceResult,

          material:
            readyRecord
              .material,

          usage:
            generationResult
              .usage,

          cacheStatus:
            "miss",

          generatedMaterialId:
            readyRecord
              .generatedMaterialId,

          accessCount:
            readyRecord
              .accessCount,
        })
      )
    } catch (
      generationError
    ) {
      try {
        await markGeneratedMaterialFailed({
          supabaseAdmin,

          ownerId:
            user.id,

          generatedMaterialId:
            cacheClaim
              .generatedMaterialId,

          reservationStartedAt:
            cacheClaim
              .startedAt,

          errorMessage:
            getErrorMessage(
              generationError
            ),
        })
      } catch (
        cacheFailureError
      ) {
        console.error(
          "Failed to persist Generator error:",
          getErrorMessage(
            cacheFailureError
          )
        )
      }

      throw generationError
    }
  } catch (error) {
    if (
      error instanceof
        LessonTopicSourceNotFoundError
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
      error instanceof
        LessonSectionSourceNotFoundError
    ) {
      return jsonResponse(
        {
          status:
            "no_sources",

          error:
            "Brak opracowanych materiałów dla wybranego działu.",
        },
        422
      )
    }

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
→ walidacja requestu
→ prywatny temat i przedmiot
→ pełny dokument źródłowy
→ taskPlan z templates.js
→ generation fingerprint
→ atomowy cache claim

brak aktywnego uprawnienia
→ 402 bez wywołania modelu

limit wykorzystany
→ 429 bez wywołania modelu

HIT
→ gotowy content_json
→ 0 nowych tokenów

MISS
→ jedno wywołanie Generatora
→ Structured Outputs
→ parser
→ zapis ready albo failed
*/
