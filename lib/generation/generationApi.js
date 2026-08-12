import {
  isMaterialGenerationEnabled,
} from "@/lib/generation/materialContracts";

import {
  getCurrentAccessToken,
  isUuid,
  readJsonResponse,
} from "@/lib/api/clientApiHelpers";

export const GENERATION_API_ERROR_CODES =
  Object.freeze({
    SUBSCRIPTION_REQUIRED:
      "subscription_required",
    GENERATION_LIMIT_EXHAUSTED:
      "generation_limit_exhausted",
    FREE_PLAN_RESTRICTION:
      "free_plan_restriction",
  });

export class GenerationApiError extends Error {
  constructor(
    message,
    {
      code = "",
      status = null,
    } = {}
  ) {
    super(message);

    this.name = "GenerationApiError";
    this.code =
      typeof code === "string"
        ? code
        : "";
    this.status =
      Number.isInteger(status)
        ? status
        : null;
  }
}

export async function requestMaterialGeneration({
  supabase,
  lessonTopicId,
  lessonSectionId,
  materialType,
  taskCount,
  profiles,
  acceptPartialSources = false,
}) {
  if (!isMaterialGenerationEnabled(materialType)) {
    throw new Error(
      "Generator nie obsługuje wybranego typu materiału."
    );
  }

  const isTest =
    materialType.trim().toLowerCase() ===
      "sprawdzian";

  if (
    isTest
      ? !isUuid(lessonSectionId) ||
        Boolean(lessonTopicId)
      : !isUuid(lessonTopicId) ||
        Boolean(lessonSectionId)
  ) {
    throw new Error(
      isTest
        ? "Najpierw wybierz dział."
        : "Najpierw wybierz temat lekcji."
    );
  }

  if (
    typeof acceptPartialSources !==
      "boolean" ||
    (!isTest && acceptPartialSources)
  ) {
    throw new Error(
      "Nieprawidłowe potwierdzenie częściowych źródeł."
    );
  }

  const normalizedTaskCount =
    Number(taskCount);

  if (
    ![5, 6, 7].includes(
      normalizedTaskCount
    )
  ) {
    throw new Error(
      "Liczba zadań musi wynosić 5, 6 albo 7."
    );
  }

  if (
    !Array.isArray(profiles) ||
    profiles.length === 0
  ) {
    throw new Error(
      "Wybierz co najmniej jeden profil ucznia."
    );
  }

  const accessToken =
    await getCurrentAccessToken(
      supabase
    );

  let response;

  try {
    response = await fetch(
      "/api/generate",
      {
        method: "POST",

        headers: {
          Accept:
            "application/json",

          Authorization:
            `Bearer ${accessToken}`,

          "Content-Type":
            "application/json",
        },

        body: JSON.stringify({
          ...(isTest
            ? {
                lessonSectionId,
                acceptPartialSources,
              }
            : {
                lessonTopicId,
              }),
          materialType,
          taskCount:
            normalizedTaskCount,
          profiles,
        }),

        cache: "no-store",
      }
    );
  } catch {
    throw new Error(
      "Nie udało się połączyć z usługą generowania materiału."
    );
  }

  const responseData =
    await readJsonResponse(
      response
    );

  if (
    response.status === 409 &&
    responseData?.status ===
      "partial_sources" &&
    Array.isArray(
      responseData.missingTopics
    )
  ) {
    return responseData;
  }

  if (!response.ok) {
    throw new GenerationApiError(
      responseData?.details ||
        responseData?.error ||
        `Generowanie zakończyło się błędem HTTP ${response.status}.`,
      {
        code:
          responseData?.status,
        status:
          response.status,
      }
    );
  }

  if (
    responseData?.success !== true ||
    responseData?.status !==
      "generated" ||
    !responseData?.material
  ) {
    throw new Error(
      "Endpoint Generatora zwrócił nieprawidłową odpowiedź."
    );
  }

  return responseData;
}
