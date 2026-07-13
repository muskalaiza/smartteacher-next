import {
  matchTeacherDocumentLessonTopic,
} from "./matchTeacherDocumentLessonTopic.js"

function assertRequiredArguments({
  supabaseAdmin,
  documentId,
  ownerId,
}) {
  if (
    !supabaseAdmin ||
    typeof supabaseAdmin.from !== "function"
  ) {
    throw new Error(
      "Brak poprawnego serwerowego klienta Supabase."
    )
  }

  if (!documentId) {
    throw new Error(
      "Brak identyfikatora dokumentu."
    )
  }

  if (!ownerId) {
    throw new Error(
      "Brak identyfikatora właściciela dokumentu."
    )
  }
}

async function getTeacherDocument({
  supabaseAdmin,
  documentId,
  ownerId,
}) {
  const { data, error } = await supabaseAdmin
    .from("teacher_documents")
    .select(
      [
        "id",
        "owner_id",
        "subject_id",
        "original_file_name",
        "lesson_topic_id",
        "status",
      ].join(", ")
    )
    .eq("id", documentId)
    .eq("owner_id", ownerId)
    .maybeSingle()

  if (error) {
    throw new Error(
      `Nie udało się pobrać dokumentu: ${error.message}`
    )
  }

  if (!data) {
    throw new Error(
      "Nie znaleziono dokumentu należącego do aktualnego nauczyciela."
    )
  }

  if (!data.subject_id) {
    throw new Error(
      "Dokument nie ma przypisanego przedmiotu."
    )
  }

  return data
}

async function getDocumentBlocks({
  supabaseAdmin,
  documentId,
  ownerId,
}) {
  const { data, error } = await supabaseAdmin
    .from("document_blocks")
    .select(
      [
        "block_index",
        "block_type",
        "heading_path",
        "content",
      ].join(", ")
    )
    .eq("document_id", documentId)
    .eq("owner_id", ownerId)
    .eq("is_excluded", false)
    .order("block_index", {
      ascending: true,
    })

  if (error) {
    throw new Error(
      `Nie udało się pobrać bloków dokumentu: ${error.message}`
    )
  }

  if (!Array.isArray(data) || data.length === 0) {
    throw new Error(
      "Dokument nie ma bloków potrzebnych do rozpoznania tematu."
    )
  }

  return data
}

async function getTeacherLessonTopics({
  supabaseAdmin,
  ownerId,
  subjectId,
}) {
  const {
    data: catalogs,
    error: catalogsError,
  } = await supabaseAdmin
    .from("lesson_catalogs")
    .select("id")
    .eq("owner_id", ownerId)
    .eq("subject_id", subjectId)
    .eq("source_type", "teacher_private")
    .eq("is_active", true)

  if (catalogsError) {
    throw new Error(
      `Nie udało się pobrać prywatnych katalogów lekcji: ${catalogsError.message}`
    )
  }

  const catalogIds = (catalogs || []).map(
    (catalog) => catalog.id
  )

  if (catalogIds.length === 0) {
    return []
  }

  const { data, error } = await supabaseAdmin
    .from("lesson_topics")
    .select(
      [
        "id",
        "catalog_id",
        "section_id",
        "lesson_key",
        "subtopic_key",
        "display_title",
        "order_index",
      ].join(", ")
    )
    .in("catalog_id", catalogIds)
    .eq("is_active", true)
    .order("order_index", {
      ascending: true,
    })

  if (error) {
    throw new Error(
      `Nie udało się pobrać tematów lekcji: ${error.message}`
    )
  }

  return data || []
}

async function updateDocumentLessonTopic({
  supabaseAdmin,
  document,
  matchedTopic,
}) {
  /*
    Aktualizujemy wyłącznie dokument bez przypisanego tematu.
    Nie nadpisujemy istniejącej decyzji.
  */
  const { data, error } = await supabaseAdmin
    .from("teacher_documents")
    .update({
      lesson_topic_id: matchedTopic.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", document.id)
    .eq("owner_id", document.owner_id)
    .eq("subject_id", document.subject_id)
    .is("lesson_topic_id", null)
    .select(
      "id, lesson_topic_id"
    )
    .maybeSingle()

  if (error) {
    throw new Error(
      `Nie udało się przypisać dokumentu do tematu lekcji: ${error.message}`
    )
  }

  if (data?.lesson_topic_id === matchedTopic.id) {
    return {
      lessonTopicId:
        data.lesson_topic_id,
      reusedExistingAssignment: false,
    }
  }

  /*
    Rekord mógł zostać przypisany równolegle.
    Odczytujemy aktualny stan i sprawdzamy,
    czy jest zgodny z rozpoznanym tematem.
  */
  const {
    data: currentDocument,
    error: currentError,
  } = await supabaseAdmin
    .from("teacher_documents")
    .select("lesson_topic_id")
    .eq("id", document.id)
    .eq("owner_id", document.owner_id)
    .maybeSingle()

  if (currentError) {
    throw new Error(
      `Nie udało się sprawdzić aktualnego przypisania dokumentu: ${currentError.message}`
    )
  }

  if (
    currentDocument?.lesson_topic_id ===
    matchedTopic.id
  ) {
    return {
      lessonTopicId:
        currentDocument.lesson_topic_id,
      reusedExistingAssignment: true,
    }
  }

  throw new Error(
    "Dokument został wcześniej przypisany do innego tematu lekcji."
  )
}

export async function assignTeacherDocumentLessonTopic({
  supabaseAdmin,
  documentId,
  ownerId,
}) {
  assertRequiredArguments({
    supabaseAdmin,
    documentId,
    ownerId,
  })

  const document = await getTeacherDocument({
    supabaseAdmin,
    documentId,
    ownerId,
  })

  const blocks = await getDocumentBlocks({
    supabaseAdmin,
    documentId: document.id,
    ownerId: document.owner_id,
  })

  const topics = await getTeacherLessonTopics({
    supabaseAdmin,
    ownerId: document.owner_id,
    subjectId: document.subject_id,
  })

  if (topics.length === 0) {
    return {
      documentId: document.id,
      status: "unmatched",
      assignmentCreated: false,
      reusedExistingAssignment: false,
      reason: "no_private_lesson_topics",
      candidateTitle: null,
      candidateSource: null,
      lessonTopicId:
        document.lesson_topic_id || null,
      lessonTopicTitle: null,
      lessonKey: null,
    }
  }

  const matchResult =
    matchTeacherDocumentLessonTopic({
      blocks,
      sourceFilename:
        document.original_file_name,
      topics,
    })

  if (matchResult.status !== "matched") {
    return {
      documentId: document.id,
      status: matchResult.status,
      assignmentCreated: false,
      reusedExistingAssignment: false,
      reason:
        matchResult.status === "ambiguous"
          ? "multiple_matching_topics"
          : "matching_topic_not_found",
      candidateTitle:
        matchResult.candidateTitle,
      candidateSource:
        matchResult.candidateSource,
      lessonTopicId:
        document.lesson_topic_id || null,
      lessonTopicTitle: null,
      lessonKey: null,
      candidates:
        matchResult.candidates.map(
          (topic) => ({
            id: topic.id,
            displayTitle:
              topic.display_title,
            lessonKey:
              topic.lesson_key,
          })
        ),
    }
  }

  const matchedTopic =
    matchResult.topic

  if (
    document.lesson_topic_id &&
    document.lesson_topic_id !==
      matchedTopic.id
  ) {
    return {
      documentId: document.id,
      status: "conflict",
      assignmentCreated: false,
      reusedExistingAssignment: false,
      reason:
        "existing_assignment_differs",
      candidateTitle:
        matchResult.candidateTitle,
      candidateSource:
        matchResult.candidateSource,
      lessonTopicId:
        document.lesson_topic_id,
      lessonTopicTitle:
        matchedTopic.display_title,
      lessonKey:
        matchedTopic.lesson_key,
      matchedLessonTopicId:
        matchedTopic.id,
    }
  }

  if (
    document.lesson_topic_id ===
    matchedTopic.id
  ) {
    return {
      documentId: document.id,
      status: "matched",
      assignmentCreated: false,
      reusedExistingAssignment: true,
      reason: null,
      candidateTitle:
        matchResult.candidateTitle,
      candidateSource:
        matchResult.candidateSource,
      matchType:
        matchResult.matchType,
      lessonTopicId:
        matchedTopic.id,
      lessonTopicTitle:
        matchedTopic.display_title,
      lessonKey:
        matchedTopic.lesson_key,
    }
  }

  const updateResult =
    await updateDocumentLessonTopic({
      supabaseAdmin,
      document,
      matchedTopic,
    })

  return {
    documentId: document.id,
    status: "matched",
    assignmentCreated:
      !updateResult.reusedExistingAssignment,
    reusedExistingAssignment:
      updateResult.reusedExistingAssignment,
    reason: null,
    candidateTitle:
      matchResult.candidateTitle,
    candidateSource:
      matchResult.candidateSource,
    matchType:
      matchResult.matchType,
    lessonTopicId:
      updateResult.lessonTopicId,
    lessonTopicTitle:
      matchedTopic.display_title,
    lessonKey:
      matchedTopic.lesson_key,
  }
}
