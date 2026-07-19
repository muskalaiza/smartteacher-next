import {
  getCurrentAccessToken,
  isUuid,
  readJsonResponse,
} from "@/lib/api/clientApiHelpers";


export async function extractTeacherDocumentBlocks({
  supabase,
  documentId,
}) {
  if (!isUuid(documentId)) {
    throw new Error(
      "Brak poprawnego identyfikatora dokumentu DOCX."
    );
  }

  const accessToken = await getCurrentAccessToken(supabase);

  let response;

  try {
    response = await fetch("/api/private-rag/extract", {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        documentId,
      }),
      cache: "no-store",
    });
  } catch {
    throw new Error(
      "Nie udało się połączyć z usługą przetwarzania dokumentu."
    );
  }

  const responseData = await readJsonResponse(response);

  if (!response.ok) {
    throw new Error(
      responseData?.details ||
        responseData?.error ||
        `Przetwarzanie dokumentu zakończyło się błędem HTTP ${response.status}.`
    );
  }

  if (
    responseData?.success !== true ||
    !responseData?.ingestion
  ) {
    throw new Error(
      "Endpoint przetwarzania zwrócił nieprawidłową odpowiedź."
    );
  }

  return responseData.ingestion;
}
