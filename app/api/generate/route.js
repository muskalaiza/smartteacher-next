import {
  getAuthenticatedRouteContext,
  getErrorMessage,
  isUuid,
  jsonResponse,
} from "@/lib/api/serverApiHelpers"

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
  "materialType",
  "taskCount",
  "profiles",
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
    lessonTopic,
    lessonCatalog,
    subject,
  }
}

function buildGeneratedResponse({
  lessonTopic,
  generationManifest,
  generationFingerprint,
  sourceResult,
  material,
  usage,
  cacheStatus,
  generatedMaterialId,
  accessCount,
}) {
  return {
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

    source: {
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
    },

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
      3. Walidacja tematu lekcji.
    */
    const lessonTopicId =
      typeof requestBody
        .lessonTopicId ===
        "string"
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
      4. Walidacja aktywnego typu materiału.
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
            "Generator obsługuje obecnie kartę pracy i kartkówkę.",
        },
        400
      )
    }

    const contentSchemaVersion =
      getMaterialContentSchemaVersion(materialType)

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
      7. Kontrola prywatnego tematu,
      katalogu i przedmiotu.
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
      subject,
    } = ownedContext

    /*
      8. Pełny, zweryfikowany dokument.
    */
    const sourceResult =
      await getLessonTopicSourceContext({
        supabaseAdmin,

        ownerId:
          user.id,

        subjectId:
          lessonCatalog
            .subject_id,

        lessonTopicId:
          lessonTopic.id,
      })

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
          lessonTopic.id,

        topicTitle:
          lessonTopic
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
            generationManifest
              .lessonTopicId,

          sourceDocumentId:
            sourceResult
              .documentId,

          subjectNameSnapshot:
            subject
              .name,

          topicTitleSnapshot:
            generationManifest
              .topicTitle,

          sourceFileNameSnapshot:
            sourceResult
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
      12B. Inne żądanie generuje
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
      12C. Cache MISS:
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

          model:
            generationManifest
              .model,
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

HIT
→ gotowy content_json
→ 0 nowych tokenów

MISS
→ jedno wywołanie Generatora
→ Structured Outputs
→ parser
→ zapis ready albo failed
*/