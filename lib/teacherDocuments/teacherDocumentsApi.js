const TEACHER_DOCUMENTS_BUCKET = "teacher-documents";
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

function normalizeFileName(fileName) {
  return fileName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function getAllowedFileMetadata(file) {
  const lowerName = file.name.toLowerCase();

  if (lowerName.endsWith(".docx")) {
    return {
      kind: "DOCX",
      mimeType:
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    };
  }

  if (lowerName.endsWith(".csv")) {
    return {
      kind: "CSV",
      mimeType: "text/csv",
    };
  }

  return null;
}

export async function getCurrentTeacherUserId(supabase) {
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError) {
    throw new Error("Nie udało się pobrać danych aktualnego użytkownika.");
  }

  const userId = userData?.user?.id;

  if (!userId) {
    throw new Error("Musisz być zalogowana, aby korzystać z biblioteki.");
  }

  return userId;
}

export async function listTeacherDocuments({ supabase, userId, subjectId }) {
  if (!subjectId) {
    return [];
  }

  const { data, error } = await supabase
    .from("teacher_documents")
    .select(
      "id, subject_id, original_file_name, mime_type, file_size_bytes, status, storage_bucket, storage_path, created_at, updated_at"
    )
    .eq("owner_id", userId)
    .eq("subject_id", subjectId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error("Nie udało się pobrać listy plików nauczyciela.");
  }

  return data || [];
}

export async function uploadTeacherDocument({
  supabase,
  file,
  userId,
  subjectId,
}) {
  if (!file) {
    throw new Error("Nie wybrano pliku.");
  }

  if (!subjectId) {
    throw new Error("Nie udało się ustalić aktywnego przedmiotu.");
  }

  const allowedFileMetadata = getAllowedFileMetadata(file);

  if (!allowedFileMetadata) {
    throw new Error("Obsługiwane są tylko pliki DOCX i CSV.");
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error("Plik jest za duży. Maksymalny rozmiar to 10 MB.");
  }

  const safeFileName = normalizeFileName(file.name);
  const storagePath = `${userId}/${Date.now()}-${safeFileName}`;

  const { error: uploadError } = await supabase.storage
    .from(TEACHER_DOCUMENTS_BUCKET)
    .upload(storagePath, file, {
      contentType: allowedFileMetadata.mimeType,
      upsert: false,
    });

  if (uploadError) {
    throw new Error(`Nie udało się wgrać pliku: ${uploadError.message}`);
  }

  const { error: insertError } = await supabase
    .from("teacher_documents")
    .insert({
      owner_id: userId,
      subject_id: subjectId,
      lesson_topic_id: null,
      source_type: "teacher_private",
      storage_bucket: TEACHER_DOCUMENTS_BUCKET,
      storage_path: storagePath,
      original_file_name: file.name,
      mime_type: allowedFileMetadata.mimeType,
      file_size_bytes: file.size,
      status: "uploaded",
      error_message: null,
    });

  if (insertError) {
    await supabase.storage
      .from(TEACHER_DOCUMENTS_BUCKET)
      .remove([storagePath]);

    throw new Error(
      `Nie udało się zapisać metadanych pliku: ${insertError.message}`
    );
  }

  return {
    kind: allowedFileMetadata.kind,
    storagePath,
  };
}

export async function getTeacherDocumentDownloadUrl({
  supabase,
  storagePath,
}) {
  const { data, error } = await supabase.storage
    .from(TEACHER_DOCUMENTS_BUCKET)
    .createSignedUrl(storagePath, 60);

  if (error || !data?.signedUrl) {
    throw new Error("Nie udało się przygotować linku do pobrania pliku.");
  }

  return data.signedUrl;
}

export async function deleteTeacherDocument({
  supabase,
  document,
  subjectId,
}) {
  if (!document?.id || !document?.storage_path) {
    throw new Error("Brakuje danych pliku do usunięcia.");
  }

  if (!subjectId) {
    throw new Error("Nie udało się ustalić aktywnego przedmiotu.");
  }

  const { error: storageError } = await supabase.storage
    .from(TEACHER_DOCUMENTS_BUCKET)
    .remove([document.storage_path]);

  if (storageError) {
    throw new Error(
      `Nie udało się usunąć pliku ze Storage: ${storageError.message}`
    );
  }

  const { error: deleteError } = await supabase
    .from("teacher_documents")
    .delete()
    .eq("id", document.id)
    .eq("subject_id", subjectId);

  if (deleteError) {
    throw new Error(
      `Plik usunięto ze Storage, ale nie udało się usunąć metadanych: ${deleteError.message}`
    );
  }
}
