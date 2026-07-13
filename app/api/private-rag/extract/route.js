import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

import { ingestTeacherDocumentBlocks } from "@/lib/privateRag/ingestTeacherDocumentBlocks"
import { ingestTeacherDocumentChunks } from "@/lib/privateRag/ingestTeacherDocumentChunks"
import { ingestTeacherDocumentEmbeddings } from "@/lib/privateRag/ingestTeacherDocumentEmbeddings"
import { assignTeacherDocumentLessonTopic } from "@/lib/privateRag/assignTeacherDocumentLessonTopic"

export const runtime = "nodejs"

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store",
}

function jsonResponse(body, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: NO_STORE_HEADERS,
  })
}

function getRequiredEnvironmentVariable(name) {
  const value = process.env[name]

  if (!value) {
    throw new Error(
      `Brak wymaganej zmiennej środowiskowej: ${name}.`
    )
  }

  return value
}

function getServerSupabaseKey() {
  /*
    Preferowany jest nowy Supabase Secret Key.

    SUPABASE_SERVICE_ROLE_KEY pozostaje obsługiwany
    jako wariant zgodny ze starszą konfiguracją projektu.
  */
  const key =
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!key) {
    throw new Error(
      "Brak SUPABASE_SECRET_KEY albo SUPABASE_SERVICE_ROLE_KEY."
    )
  }

  return key
}

function createAuthClient() {
  return createClient(
    getRequiredEnvironmentVariable(
      "NEXT_PUBLIC_SUPABASE_URL"
    ),
    getRequiredEnvironmentVariable(
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"
    ),
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    }
  )
}

function createAdminClient() {
  return createClient(
    getRequiredEnvironmentVariable(
      "NEXT_PUBLIC_SUPABASE_URL"
    ),
    getServerSupabaseKey(),
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    }
  )
}

function getBearerToken(request) {
  const authorizationHeader =
    request.headers.get("authorization") || ""

  const match = authorizationHeader.match(
    /^Bearer\s+(.+)$/i
  )

  return match?.[1]?.trim() || null
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value
  )
}

function getErrorMessage(error) {
  if (error instanceof Error && error.message) {
    return error.message
  }

  return String(error || "Nieznany błąd endpointu.")
}

export async function POST(request) {
  try {
    const accessToken = getBearerToken(request)

    if (!accessToken) {
      return jsonResponse(
        {
          error:
            "Brak poprawnego tokenu autoryzacyjnego.",
        },
        401
      )
    }

    /*
      Ten klient służy wyłącznie do zweryfikowania
      tokenu przesłanego przez zalogowanego nauczyciela.
    */
    const authClient = createAuthClient()

    const {
      data: { user },
      error: userError,
    } = await authClient.auth.getUser(accessToken)

    if (userError || !user) {
      return jsonResponse(
        {
          error:
            "Sesja użytkownika jest nieprawidłowa albo wygasła.",
        },
        401
      )
    }

    let requestBody

    try {
      requestBody = await request.json()
    } catch {
      return jsonResponse(
        {
          error:
            "Żądanie musi zawierać poprawny obiekt JSON.",
        },
        400
      )
    }

    const documentId =
      typeof requestBody?.documentId === "string"
        ? requestBody.documentId.trim()
        : ""

    if (!isUuid(documentId)) {
      return jsonResponse(
        {
          error:
            "Brak poprawnego identyfikatora dokumentu.",
        },
        400
      )
    }

    /*
      Klient administracyjny omija RLS, dlatego ownerId
      nie pochodzi z body żądania, tylko ze zweryfikowanego
      tokenu Supabase Auth.
    */
    const supabaseAdmin = createAdminClient()


const extractionResult =
  await ingestTeacherDocumentBlocks({
    supabaseAdmin,
    documentId,
    ownerId: user.id,
  })

  const lessonTopicAssignmentResult =
  await assignTeacherDocumentLessonTopic({
    supabaseAdmin,
    documentId,
    ownerId: user.id,
  })

const chunkingResult =
  await ingestTeacherDocumentChunks({
    supabaseAdmin,
    documentId,
    ownerId: user.id,
  })

const embeddingResult =
  await ingestTeacherDocumentEmbeddings({
    supabaseAdmin,
    documentId,
    ownerId: user.id,
  })

return jsonResponse({
  success: true,
  ingestion: {
    ...extractionResult,
    ...chunkingResult,
    ...embeddingResult,

    /*
      Zachowujemy jawne wartości z każdego etapu,
      aby komunikat UI i diagnostyka nie zależały
      od kolejności spreadów obiektów.
    */
    blockCount:
      extractionResult.blockCount,

    sourceBlockCount:
      chunkingResult.sourceBlockCount,

    chunkCount:
      chunkingResult.chunkCount,

    embeddingCount:
      embeddingResult.embeddingCount,

      lessonTopicAssignment: {
  status:
    lessonTopicAssignmentResult.status,

  assignmentCreated:
    lessonTopicAssignmentResult.assignmentCreated,

  reusedExistingAssignment:
    lessonTopicAssignmentResult.reusedExistingAssignment,

  reason:
    lessonTopicAssignmentResult.reason || null,
  candidateTitle:
    lessonTopicAssignmentResult.candidateTitle || null,

  candidateSource:
    lessonTopicAssignmentResult.candidateSource || null,

  matchType:
    lessonTopicAssignmentResult.matchType || null,

  lessonTopicId:
    lessonTopicAssignmentResult.lessonTopicId || null,

  lessonTopicTitle:
    lessonTopicAssignmentResult.lessonTopicTitle || null,

  lessonKey:
    lessonTopicAssignmentResult.lessonKey || null,
candidates:
    lessonTopicAssignmentResult.candidates || [],
},

    reusedExistingBlocks:
      extractionResult.reusedExistingBlocks,

    reusedExistingChunks:
      chunkingResult.reusedExistingChunks,

    generatedEmbeddingCount:
      embeddingResult.generatedEmbeddingCount,

    reusedEmbeddingCount:
      embeddingResult.reusedEmbeddingCount,

    /*
      Końcowym statusem całego obecnego pipeline jest embedded.
    */
    status:
      embeddingResult.status,
  },
})

  } catch (error) {
    const errorMessage = getErrorMessage(error)

    console.error(
      "Private RAG DOCX extraction failed:",
      errorMessage
    )

    const responseBody = {
      error:
        "Nie udało się przetworzyć dokumentu DOCX.",
    }

    /*
      Szczegóły techniczne są pomocne lokalnie,
      ale nie powinny ujawniać struktury bazy na produkcji.
    */
    if (process.env.NODE_ENV !== "production") {
      responseBody.details = errorMessage
    }

    return jsonResponse(responseBody, 500)
  }
}
