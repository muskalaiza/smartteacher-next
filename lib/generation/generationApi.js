import {
  getCurrentAccessToken,
  isUuid,
  readJsonResponse,
} from "@/lib/api/clientApiHelpers";

export async function requestMaterialGeneration({
  supabase,
  lessonTopicId,
  materialType,
  taskCount,
  profiles,
}) {
  if (!isUuid(lessonTopicId)) {
    throw new Error(
      "Najpierw wybierz temat lekcji."
    );
  }

  if (materialType !== "kartkówka") {
    throw new Error(
      "Pierwsza wersja Generatora obsługuje obecnie kartkówkę."
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
          lessonTopicId,
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

  if (!response.ok) {
    throw new Error(
      responseData?.details ||
        responseData?.error ||
        `Generowanie zakończyło się błędem HTTP ${response.status}.`
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
