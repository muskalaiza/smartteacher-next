import {
  getAuthenticatedRouteContext,
  getErrorMessage,
  isUuid,
  jsonResponse,
} from "@/lib/api/serverApiHelpers"

import { ingestTeacherDocumentBlocks } from "@/lib/privateRag/ingestTeacherDocumentBlocks"
import { ingestTeacherDocumentChunks } from "@/lib/privateRag/ingestTeacherDocumentChunks"
import { ingestTeacherDocumentEmbeddings } from "@/lib/privateRag/ingestTeacherDocumentEmbeddings"
import { assignTeacherDocumentLessonTopic } from "@/lib/privateRag/assignTeacherDocumentLessonTopic"

export const runtime = "nodejs"

export async function POST(request) {
  try {
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

/*
autoryzacja
→ odczyt request.json()
→ pobranie documentId
→ walidacja UUID
→ extraction
→ przypisanie tematu
→ chunking
→ embeddingi
→ odpowiedź

*/