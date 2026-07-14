import {
  searchPrivateDocumentChunks,
} from "./searchPrivateDocumentChunks.js"

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function getNormalizedUuid(value, label) {
  const normalizedValue =
    typeof value === "string"
      ? value.trim()
      : ""

  if (!UUID_PATTERN.test(normalizedValue)) {
    throw new Error(
      `${label} musi być poprawnym identyfikatorem UUID.`
    )
  }

  return normalizedValue
}

function getNormalizedQuery(query) {
  const normalizedQuery =
    typeof query === "string"
      ? query.trim()
      : ""

  if (!normalizedQuery) {
    throw new Error(
      "Semantic retrieval wymaga tekstowego zapytania."
    )
  }

  return normalizedQuery
}

function getNormalizedMatchCount(matchCount) {
  if (
    !Number.isInteger(matchCount) ||
    matchCount < 1 ||
    matchCount > 20
  ) {
    throw new Error(
      "matchCount musi być liczbą całkowitą od 1 do 20."
    )
  }

  return matchCount
}

function assertSupabaseAdmin(supabaseAdmin) {
  if (
    !supabaseAdmin ||
    typeof supabaseAdmin.from !== "function" ||
    typeof supabaseAdmin.rpc !== "function"
  ) {
    throw new Error(
      "Brak poprawnego serwerowego klienta Supabase."
    )
  }
}

async function getLessonTopicContext({
  supabaseAdmin,
  ownerId,
  subjectId,
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
        "section_id",
        "lesson_key",
        "display_title",
        "is_active",
      ].join(", ")
    )
    .eq("id", lessonTopicId)
    .eq("is_active", true)
    .maybeSingle()

  if (lessonTopicError) {
    throw new Error(
      `Nie udało się pobrać tematu lekcji: ${lessonTopicError.message}`
    )
  }

  if (!lessonTopic) {
    throw new Error(
      "Nie znaleziono aktywnego tematu lekcji."
    )
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
        "grade_level_id",
        "curriculum_level",
        "language",
        "is_active",
      ].join(", ")
    )
    .eq("id", lessonTopic.catalog_id)
    .eq("owner_id", ownerId)
    .eq("subject_id", subjectId)
    .eq("source_type", "teacher_private")
    .eq("is_active", true)
    .maybeSingle()

  if (lessonCatalogError) {
    throw new Error(
      `Nie udało się zweryfikować katalogu lekcji: ${lessonCatalogError.message}`
    )
  }

  if (!lessonCatalog) {
    throw new Error(
      "Temat lekcji nie należy do prywatnego katalogu aktualnego nauczyciela i przedmiotu."
    )
  }

  return {
    lessonTopic,
    lessonCatalog,
  }
}

async function getEmbeddedTopicDocuments({
  supabaseAdmin,
  ownerId,
  subjectId,
  lessonTopicId,
}) {
  const { data, error } = await supabaseAdmin
    .from("teacher_documents")
    .select(
      [
        "id",
        "original_file_name",
        "status",
        "created_at",
      ].join(", ")
    )
    .eq("owner_id", ownerId)
    .eq("subject_id", subjectId)
    .eq("lesson_topic_id", lessonTopicId)
    .eq("source_type", "teacher_private")
    .eq("status", "embedded")
    .order("created_at", {
      ascending: true,
    })

  if (error) {
    throw new Error(
      `Nie udało się pobrać dokumentów przypisanych do tematu: ${error.message}`
    )
  }

  return data || []
}

export async function searchPrivateLessonTopicChunks({
  supabaseAdmin,
  ownerId,
  subjectId,
  lessonTopicId,
  query,
  matchCount = 5,
  apiKey,
}) {
  assertSupabaseAdmin(supabaseAdmin)

  const normalizedOwnerId =
    getNormalizedUuid(
      ownerId,
      "ownerId"
    )

  const normalizedSubjectId =
    getNormalizedUuid(
      subjectId,
      "subjectId"
    )

  const normalizedLessonTopicId =
    getNormalizedUuid(
      lessonTopicId,
      "lessonTopicId"
    )

  const normalizedQuery =
    getNormalizedQuery(query)

  const normalizedMatchCount =
    getNormalizedMatchCount(matchCount)

  const {
    lessonTopic,
    lessonCatalog,
  } = await getLessonTopicContext({
    supabaseAdmin,
    ownerId: normalizedOwnerId,
    subjectId: normalizedSubjectId,
    lessonTopicId:
      normalizedLessonTopicId,
  })

  const sourceDocuments =
    await getEmbeddedTopicDocuments({
      supabaseAdmin,
      ownerId: normalizedOwnerId,
      subjectId: normalizedSubjectId,
      lessonTopicId:
        normalizedLessonTopicId,
    })

  /*
    Nie tworzymy embeddingu zapytania,
    jeżeli temat nie ma żadnych źródeł.
    Unikamy niepotrzebnego wywołania API.
  */
  if (sourceDocuments.length === 0) {
    return {
      status: "no_sources",
      reason:
        "no_embedded_documents_for_lesson_topic",

      ownerId:
        normalizedOwnerId,

      subjectId:
        normalizedSubjectId,

      lessonTopic: {
        id: lessonTopic.id,
        displayTitle:
          lessonTopic.display_title,
        lessonKey:
          lessonTopic.lesson_key,
      },

      lessonCatalog: {
        id: lessonCatalog.id,
        gradeLevelId:
          lessonCatalog.grade_level_id,
        curriculumLevel:
          lessonCatalog.curriculum_level,
        language:
          lessonCatalog.language,
      },

      sourceDocumentCount: 0,
      sourceDocuments: [],
      retrieval: null,
    }
  }

  const documentIds =
    sourceDocuments.map(
      (document) => document.id
    )

  const retrieval =
    await searchPrivateDocumentChunks({
      supabaseAdmin,
      ownerId: normalizedOwnerId,
      documentIds,
      query: normalizedQuery,
      matchCount:
        normalizedMatchCount,
      apiKey,
    })

  return {
    status: "retrieved",
    reason: null,

    ownerId:
      normalizedOwnerId,

    subjectId:
      normalizedSubjectId,

    lessonTopic: {
      id: lessonTopic.id,
      displayTitle:
        lessonTopic.display_title,
      lessonKey:
        lessonTopic.lesson_key,
    },

    lessonCatalog: {
      id: lessonCatalog.id,
      gradeLevelId:
        lessonCatalog.grade_level_id,
      curriculumLevel:
        lessonCatalog.curriculum_level,
      language:
        lessonCatalog.language,
    },

    sourceDocumentCount:
      sourceDocuments.length,

    sourceDocuments:
      sourceDocuments.map(
        (document) => ({
          id: document.id,
          originalFileName:
            document.original_file_name,
          status: document.status,
        })
      ),

    retrieval,
  }
}
