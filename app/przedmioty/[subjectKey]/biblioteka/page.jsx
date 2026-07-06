"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useActiveTeacherSubject } from "@/lib/subjects/useActiveTeacherSubject";

const TEACHER_DOCUMENTS_BUCKET = "teacher-documents";
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

function formatDate(value) {
  if (!value) return "Brak daty";

  return new Intl.DateTimeFormat("pl-PL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

function formatFileSize(bytes) {
  if (bytes === null || bytes === undefined) return "Brak danych";

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getDocumentKind(mimeType) {
  if (
    mimeType ===
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    return "DOCX";
  }

  if (
    mimeType === "text/csv" ||
    mimeType === "application/csv" ||
    mimeType === "text/plain"
  ) {
    return "CSV";
  }

  return "Plik";
}

function getStatusLabel(status) {
  const labels = {
    uploaded: "Wgrany",
    extracted: "Wyodrębniony",
    chunked: "Podzielony",
    embedded: "Embeddingi",
    ready: "Gotowy",
    error: "Błąd",
  };

  return labels[status] || status || "Brak statusu";
}

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

export default function SubjectBibliotekaPage() {
  const params = useParams();

  const subjectKey =
    typeof params?.subjectKey === "string" ? params.subjectKey : "";

  const { subject, isLoading, errorMessage } =
    useActiveTeacherSubject(subjectKey);

  const [documents, setDocuments] = useState([]);
  const [documentsLoading, setDocumentsLoading] = useState(true);
  const [documentsError, setDocumentsError] = useState("");

  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [uploadSuccess, setUploadSuccess] = useState("");

  const loadTeacherDocuments = useCallback(async () => {
  setDocumentsLoading(true);
  setDocumentsError("");

  if (!subject?.id) {
    setDocuments([]);
    setDocumentsLoading(false);
    return;
  }

    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError) {
      setDocuments([]);
      setDocumentsError("Nie udało się pobrać danych aktualnego użytkownika.");
      setDocumentsLoading(false);
      return;
    }

    const userId = userData?.user?.id;

    if (!userId) {
      setDocuments([]);
      setDocumentsError("Musisz być zalogowana, aby zobaczyć bibliotekę.");
      setDocumentsLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("teacher_documents")
    .select(
  "id, subject_id, original_file_name, mime_type, file_size_bytes, status, storage_bucket, storage_path, created_at, updated_at"
)
      .eq("owner_id", userId)
      .eq("subject_id", subject.id)
      .order("created_at", { ascending: false });

    if (error) {
      setDocuments([]);
      setDocumentsError("Nie udało się pobrać listy plików nauczyciela.");
      setDocumentsLoading(false);
      return;
    }

    setDocuments(data || []);
    setDocumentsLoading(false);
  }, [subject?.id]);

  useEffect(() => {
    loadTeacherDocuments();
  }, [loadTeacherDocuments]);

  async function handleFileUpload(event) {
    const file = event.target.files?.[0];

    setUploadError("");
    setUploadSuccess("");

    if (!file) return;

    if (!subject?.id) {
  setUploadError("Nie udało się ustalić aktywnego przedmiotu.");
  event.target.value = "";
  return;
}

    const allowedFileMetadata = getAllowedFileMetadata(file);

    if (!allowedFileMetadata) {
      setUploadError("Obsługiwane są tylko pliki DOCX i CSV.");
      event.target.value = "";
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setUploadError("Plik jest za duży. Maksymalny rozmiar to 10 MB.");
      event.target.value = "";
      return;
    }

    setUploading(true);

    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData?.user?.id) {
      setUploadError("Musisz być zalogowana, aby dodać plik.");
      setUploading(false);
      event.target.value = "";
      return;
    }

    const userId = userData.user.id;
    const safeFileName = normalizeFileName(file.name);
    const storagePath = `${userId}/${Date.now()}-${safeFileName}`;

    const { error: uploadErrorResult } = await supabase.storage
      .from(TEACHER_DOCUMENTS_BUCKET)
      .upload(storagePath, file, {
        contentType: allowedFileMetadata.mimeType,
        upsert: false,
      });

    if (uploadErrorResult) {
      setUploadError(`Nie udało się wgrać pliku: ${uploadErrorResult.message}`);
      setUploading(false);
      event.target.value = "";
      return;
    }

    const { error: insertError } = await supabase
      .from("teacher_documents")
      .insert({
        owner_id: userId,
        subject_id: subject.id,
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

      setUploadError(`Nie udało się zapisać metadanych pliku: ${insertError.message}`);
      setUploading(false);
      event.target.value = "";
      return;
    }

    setUploadSuccess(
      `${allowedFileMetadata.kind}: plik został wgrany i zapisany w teacher_documents.`
    );

    await loadTeacherDocuments();

    setUploading(false);
    event.target.value = "";
  }

  async function handleDownloadDocument(document) {
  setUploadError("");
  setUploadSuccess("");

  const { data, error } = await supabase.storage
    .from(TEACHER_DOCUMENTS_BUCKET)
    .createSignedUrl(document.storage_path, 60);

  if (error || !data?.signedUrl) {
    setUploadError("Nie udało się przygotować linku do pobrania pliku.");
    return;
  }

  window.open(data.signedUrl, "_blank", "noopener,noreferrer");
}

async function handleDeleteDocument(document) {
  const confirmed = window.confirm(
    `Czy na pewno usunąć plik "${document.original_file_name}"?`
  );

  if (!confirmed) return;

  setUploadError("");
  setUploadSuccess("");

  const { error: storageError } = await supabase.storage
    .from(TEACHER_DOCUMENTS_BUCKET)
    .remove([document.storage_path]);

  if (storageError) {
    setUploadError(`Nie udało się usunąć pliku ze Storage: ${storageError.message}`);
    return;
  }

  const { error: deleteError } = await supabase
    .from("teacher_documents")
    .delete()
    .eq("id", document.id)
    .eq("subject_id", subject.id);

  if (deleteError) {
    setUploadError(
      `Plik usunięto ze Storage, ale nie udało się usunąć metadanych: ${deleteError.message}`
    );
    return;
  }

  setUploadSuccess(`Usunięto plik: ${document.original_file_name}`);
  await loadTeacherDocuments();
}

  const stats = useMemo(() => {
    const docxCount = documents.filter(
      (document) => getDocumentKind(document.mime_type) === "DOCX"
    ).length;

    const csvCount = documents.filter(
      (document) => getDocumentKind(document.mime_type) === "CSV"
    ).length;

    const latestDocument = documents[0];

    return [
      {
        label: "Pliki źródłowe",
        value: String(documents.length),
        description: "własne materiały nauczyciela",
      },
      {
        label: "DOCX / CSV",
        value: `${docxCount} / ${csvCount}`,
        description: "obsługiwane formaty pierwszego etapu",
      },
      {
        label: "Ostatni upload",
        value: latestDocument ? formatDate(latestDocument.created_at) : "Brak",
        description: "ostatni plik w teacher_documents",
      },
    ];
  }, [documents]);

  if (isLoading) {
    return (
      <div className="space-y-3">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-50">
          Ładowanie biblioteki...
        </h1>
        <p className="text-sm text-zinc-400">
          Pobieramy przedmiot przypisany do Twojego konta.
        </p>
      </div>
    );
  }

  if (errorMessage || !subject) {
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-50">
          Nie można otworzyć biblioteki
        </h1>

        <p className="text-sm text-zinc-400">
          {errorMessage || "Nie znaleziono przedmiotu."}
        </p>

        <Link
          href="/dashboard"
          className="inline-flex items-center justify-center rounded-xl bg-sky-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-sky-400"
        >
          Wróć do wyboru przedmiotu
        </Link>
      </div>
    );
  }

  const subjectLabel = subject.name;

  return (
    <div className="space-y-8">
      <header className="space-y-4">
        <Link
          href="/dashboard"
          className="inline-flex items-center text-sm text-zinc-400 transition-colors hover:text-zinc-100"
        >
          ← Wróć do wyboru przedmiotu
        </Link>

        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl space-y-3">
            <p className="text-sm font-medium text-sky-400">{subjectLabel}</p>

            <h1 className="text-3xl font-bold tracking-tight text-zinc-50 md:text-4xl">
              Biblioteka materiałów źródłowych
            </h1>

            <p className="text-sm leading-6 text-zinc-400">
              To miejsce na prywatne materiały nauczyciela: pliki DOCX i CSV.
              CSV będzie później źródłem działów i tematów lekcji, a DOCX
              źródłem treści merytorycznej jednej lekcji.
            </p>
          </div>

          <label
            className={`inline-flex items-center justify-center rounded-xl px-5 py-3 text-sm font-semibold transition ${
              uploading
                ? "cursor-not-allowed bg-zinc-800 text-zinc-400"
                : "cursor-pointer bg-sky-500 text-white hover:bg-sky-400"
            }`}
          >
            {uploading ? "Wgrywanie..." : "Dodaj DOCX / CSV"}

            <input
              type="file"
              className="hidden"
              accept=".docx,.csv,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/csv"
              disabled={uploading}
              onChange={handleFileUpload}
            />
          </label>
        </div>

        {uploadError && (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4">
            <p className="text-sm text-red-200">{uploadError}</p>
          </div>
        )}

        {uploadSuccess && (
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4">
            <p className="text-sm text-emerald-200">{uploadSuccess}</p>
          </div>
        )}
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-5 shadow-sm"
          >
            <p className="text-sm text-zinc-400">{stat.label}</p>
            <p className="mt-2 text-2xl font-bold text-zinc-50">
              {stat.value}
            </p>
            <p className="mt-1 text-xs text-zinc-500">{stat.description}</p>
          </div>
        ))}
      </section>

      <section className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-6 shadow-sm">
        <div className="border-b border-zinc-800 pb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-400">
            Pliki nauczyciela
          </p>

          <h2 className="mt-2 text-lg font-semibold text-zinc-50">
            Materiały źródłowe w Supabase
          </h2>

          <p className="mt-1 text-sm text-zinc-400">
            Lista pochodzi z tabeli teacher_documents. To nie jest jeszcze
            biblioteka wygenerowanych kart pracy, kartkówek ani sprawdzianów.
          </p>
        </div>

        {documentsLoading && (
          <div className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
            <p className="text-sm text-zinc-400">
              Ładowanie plików źródłowych...
            </p>
          </div>
        )}

        {!documentsLoading && documentsError && (
          <div className="mt-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-5">
            <p className="text-sm text-red-200">{documentsError}</p>
          </div>
        )}

        {!documentsLoading && !documentsError && documents.length === 0 && (
          <div className="mt-6 rounded-2xl border border-dashed border-zinc-700 bg-zinc-900/40 p-8 text-center">
            <h3 className="text-lg font-semibold text-zinc-50">
              Brak plików źródłowych
            </h3>

            <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
              W tabeli teacher_documents nie ma jeszcze plików przypisanych do
              Twojego konta. Dodaj plik DOCX lub CSV, aby sprawdzić minimalny
              przepływ uploadu.
            </p>
          </div>
        )}

        {!documentsLoading && !documentsError && documents.length > 0 && (
          <div className="mt-6 grid gap-4">
            {documents.map((document) => (
              <article
                key={document.id}
                className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 transition hover:border-zinc-700 hover:bg-zinc-900"
              >
                <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
                  <div className="min-w-0 space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-3 py-1 text-xs font-medium text-sky-200">
                        {getDocumentKind(document.mime_type)}
                      </span>

                      <span className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-400">
                        {getStatusLabel(document.status)}
                      </span>

                      <span className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-400">
                        {formatFileSize(document.file_size_bytes)}
                      </span>
                    </div>

                    <div>
                      <h3 className="break-words text-lg font-semibold text-zinc-50">
                        {document.original_file_name}
                      </h3>

                      <p className="mt-1 text-sm text-zinc-400">
                        Dodano: {formatDate(document.created_at)}
                      </p>

                      <p className="mt-1 break-all text-xs text-zinc-500">
                        {document.storage_bucket}/{document.storage_path}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 xl:w-[240px]">
  <button
    type="button"
    onClick={() => handleDownloadDocument(document)}
    className="inline-flex items-center justify-center rounded-xl border border-zinc-700 bg-zinc-950/70 px-4 py-3 text-sm font-semibold text-zinc-100 transition hover:border-sky-500/60 hover:text-sky-200"
  >
    Pobierz plik
  </button>

  <button
    type="button"
    onClick={() => handleDeleteDocument(document)}
    className="inline-flex items-center justify-center rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-200 transition hover:border-red-400/60 hover:bg-red-500/20"
  >
    Usuń plik
  </button>

  <p className="text-xs leading-5 text-zinc-500">
    Przypisanie do działu, tematu lekcji i przetwarzanie pliku dodamy w
    kolejnych krokach.
  </p>
</div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-sky-500/20 bg-sky-500/10 p-6">
        <h2 className="text-sm font-semibold text-sky-100">
          Zakres tego etapu
        </h2>

        <p className="mt-2 max-w-3xl text-sm leading-6 text-sky-100/80">
          Ten krok sprawdza wyłącznie upload pliku do Supabase Storage i zapis
          metadanych w teacher_documents. CSV nie jest jeszcze parsowany, a DOCX
          nie jest jeszcze dzielony na bloki i chunki.
        </p>
      </section>
    </div>
  );
}
