"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useActiveTeacherSubject } from "@/lib/subjects/useActiveTeacherSubject";
import {
  deleteTeacherDocument,
  getCurrentTeacherUserId,
  getTeacherDocumentDownloadUrl,
  listTeacherDocuments,
  uploadTeacherDocument,
} from "@/lib/teacherDocuments/teacherDocumentsApi";
import { importLessonPlanCsvFromDocument } from "@/lib/lessonPlanImports/lessonPlanImportsApi";
import { extractTeacherDocumentBlocks } from "@/lib/privateRag/privateRagApi";

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

  const [gradeLevels, setGradeLevels] = useState([]);
  const [gradeLevelsLoading, setGradeLevelsLoading] = useState(true);
  const [gradeLevelsError, setGradeLevelsError] = useState("");
  const [selectedGradeLevelId, setSelectedGradeLevelId] = useState("");

  const subjectId = subject?.id || "";

  async function refreshTeacherDocuments() {
    setDocumentsLoading(true);
    setDocumentsError("");

    if (!subjectId) {
      setDocuments([]);
      setDocumentsLoading(false);
      return;
    }

    try {
      const userId = await getCurrentTeacherUserId(supabase);

      const loadedDocuments = await listTeacherDocuments({
        supabase,
        userId,
        subjectId,
      });

      setDocuments(loadedDocuments);
    } catch (error) {
      setDocuments([]);
      setDocumentsError(error.message);
    } finally {
      setDocumentsLoading(false);
    }
  }

  useEffect(() => {
    let isMounted = true;

    async function loadGradeLevels() {
      try {
        const { data, error } = await supabase
          .from("grade_levels")
          .select("id, grade_key, label, order_index")
          .order("order_index", { ascending: true });

        if (!isMounted) return;

        if (error) {
          throw new Error(error.message);
        }

        setGradeLevels(data || []);
        setGradeLevelsError("");
      } catch (error) {
        if (!isMounted) return;

        setGradeLevels([]);
        setGradeLevelsError(error.message);
      } finally {
        if (isMounted) {
          setGradeLevelsLoading(false);
        }
      }
    }

    loadGradeLevels();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadTeacherDocuments() {
      if (!subjectId) return;

      try {
        const userId = await getCurrentTeacherUserId(supabase);

        if (!isMounted) return;

        const loadedDocuments = await listTeacherDocuments({
          supabase,
          userId,
          subjectId,
        });

        if (!isMounted) return;

        setDocuments(loadedDocuments);
        setDocumentsError("");
      } catch (error) {
        if (!isMounted) return;

        setDocuments([]);
        setDocumentsError(error.message);
      } finally {
        if (isMounted) {
          setDocumentsLoading(false);
        }
      }
    }

    loadTeacherDocuments();

    return () => {
      isMounted = false;
    };
  }, [subjectId]);

async function handleFileUpload(event) {
  const file = event.target.files?.[0];

  setUploadError("");
  setUploadSuccess("");

  if (!file) return;

    const isCsvFile =
    file.name.toLowerCase().endsWith(".csv") ||
    file.type === "text/csv" ||
    file.type === "application/csv" ||
    file.type === "text/plain";

  if (isCsvFile && !selectedGradeLevelId) {
    setUploadError("Wybierz klasę przed dodaniem planu lekcji CSV.");
    event.target.value = "";
    return;
  }

  setUploading(true);

  try {
    const userId = await getCurrentTeacherUserId(supabase);

    const result = await uploadTeacherDocument({
      supabase,
      file,
      userId,
      subjectId: subject?.id,
    });

    if (result.kind === "CSV") {
      try {
        const importResult = await importLessonPlanCsvFromDocument({
          supabase,
          document: result.document,
          userId,
          gradeLevelId: selectedGradeLevelId,
          subjectId: subject?.id,
          sourceSystem: "manual_csv",
        });

                setUploadSuccess(
          `Plan lekcji CSV został dodany. Odczytano ${importResult.rowCount} tematów lekcji i utworzono katalog: ${importResult.sectionCount} działów, ${importResult.topicCount} tematów.`
        );

      } catch (importError) {
        try {
          await deleteTeacherDocument({
            supabase,
            document: result.document,
            subjectId: subject?.id,
          });
        } catch (rollbackError) {
          throw new Error(
            `Plan lekcji CSV nie został dodany: ${importError.message} Plik został wgrany, ale nie udało się go automatycznie usunąć: ${rollbackError.message}`
          );
        }

        throw new Error(
          `Plan lekcji CSV nie został dodany: ${importError.message}`
        );
      }
       } else {
      const ingestionResult =
        await extractTeacherDocumentBlocks({
          supabase,
          documentId: result.document.id,
        });

      setUploadSuccess(
        `Opracowanie DOCX zostało dodane i wyodrębnione do ${ingestionResult.blockCount} bloków źródłowych.`
      );
    }

    await refreshTeacherDocuments();
  } catch (error) {
    setUploadError(error.message);
    await refreshTeacherDocuments();
  } finally {
    setUploading(false);
    event.target.value = "";
  }
}


  async function handleDownloadDocument(document) {
    setUploadError("");
    setUploadSuccess("");

    try {
      const signedUrl = await getTeacherDocumentDownloadUrl({
        supabase,
        storagePath: document.storage_path,
      });

      window.open(signedUrl, "_blank", "noopener,noreferrer");
    } catch (error) {
      setUploadError(error.message);
    }
  }

  async function handleDeleteDocument(document) {
    const confirmed = window.confirm(
      `Czy na pewno usunąć plik "${document.original_file_name}"?`
    );

    if (!confirmed) return;

    setUploadError("");
    setUploadSuccess("");

    try {
      await deleteTeacherDocument({
        supabase,
        document,
        subjectId: subject?.id,
      });

      setUploadSuccess(`Usunięto plik: ${document.original_file_name}`);
      await refreshTeacherDocuments();
    } catch (error) {
      setUploadError(error.message);
    }
  }

  const lessonPlanDocuments = useMemo(
    () => documents.filter((document) => getDocumentKind(document.mime_type) === "CSV"),
    [documents]
  );

  const lessonContentDocuments = useMemo(
    () => documents.filter((document) => getDocumentKind(document.mime_type) === "DOCX"),
    [documents]
  );

  const otherDocuments = useMemo(
    () =>
      documents.filter((document) => {
        const kind = getDocumentKind(document.mime_type);
        return kind !== "CSV" && kind !== "DOCX";
      }),
    [documents]
  );

  const stats = useMemo(() => {
    const latestDocument = documents[0];

    return [
      {
        label: "Plany lekcji",
        value: String(lessonPlanDocuments.length),
        description: "pliki CSV dla katalogu lekcji",
      },
      {
        label: "Opracowane lekcje",
        value: String(lessonContentDocuments.length),
        description: "pliki DOCX z treścią tematów",
      },
      {
        label: "Ostatni upload",
        value: latestDocument ? formatDate(latestDocument.created_at) : "Brak",
        description: "ostatni plik w bazie",
      },
    ];
  }, [documents, lessonContentDocuments.length, lessonPlanDocuments.length]);

  function renderDocumentCard(document, options = {}) {
    const documentKind = getDocumentKind(document.mime_type);
   const {
  downloadLabel = "Pobierz plik",
  deleteLabel = "Usuń plik",
  note = "Przypisanie do działu, tematu lekcji i przetwarzanie pliku dodamy w kolejnych krokach.",
} = options;

    return (
      <article
        key={document.id}
        className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 transition hover:border-zinc-700 hover:bg-zinc-900"
      >
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="min-w-0 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-3 py-1 text-xs font-medium text-sky-200">
                {documentKind}
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
              {downloadLabel}
            </button>

           <button
  type="button"
  onClick={() => handleDeleteDocument(document)}
  className="inline-flex items-center justify-center rounded-xl border border-red-500/30 bg-transparent px-4 py-3 text-sm font-semibold text-red-400 transition hover:border-red-400/50 hover:bg-red-500/10 hover:text-red-300"
>
  {deleteLabel}
</button>

            <p className="text-xs leading-5 text-zinc-500">{note}</p>
          </div>
        </div>
      </article>
    );
  }

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
              Biblioteka jest podzielona na dwa typy źródeł: plany lekcji CSV
              oraz opracowane lekcje DOCX. CSV buduje katalog działów i
              tematów, a DOCX będzie później źródłem treści merytorycznej
              jednej lekcji.
            </p>
          </div>
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

      {documentsLoading && (
        <section className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-6 shadow-sm">
          <p className="text-sm text-zinc-400">Ładowanie plików źródłowych...</p>
        </section>
      )}

      {!documentsLoading && documentsError && (
        <section className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 shadow-sm">
          <p className="text-sm text-red-200">{documentsError}</p>
        </section>
      )}

      {!documentsLoading && !documentsError && (
        <>
          <section className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-6 shadow-sm">
            <div className="flex flex-col gap-4 border-b border-zinc-800 pb-6 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-400">
                Plany lekcji
              </p>

                <h2 className="mt-2 text-lg font-semibold text-zinc-50">
                  Twoje plany lekcji
                </h2>

                <p className="mt-1 text-sm leading-6 text-zinc-400">
                  Tutaj dodajesz plik CSV z listą działów i tematów lekcji dla
                  wybranego przedmiotu. Na podstawie tego pliku SmartTeacher
                  przygotuje katalog tematów do Generatora.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <select
                  value={selectedGradeLevelId}
                  onChange={(event) =>
                    setSelectedGradeLevelId(event.target.value)
                  }
                  disabled={uploading || gradeLevelsLoading}
                  className="min-w-[180px] rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-zinc-100 outline-none transition focus:border-sky-500 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500"
                >
                  <option value="">
                    {gradeLevelsLoading ? "Ładowanie klas..." : "Wybierz klasę"}
                  </option>

                  {gradeLevels.map((gradeLevel) => (
                    <option key={gradeLevel.id} value={gradeLevel.id}>
                      {gradeLevel.label}
                    </option>
                  ))}
                </select>

                <label
                  className={`inline-flex items-center justify-center rounded-xl px-5 py-3 text-sm font-semibold transition ${
                    uploading || !selectedGradeLevelId
                      ? "cursor-not-allowed bg-zinc-800 text-zinc-400"
                      : "cursor-pointer bg-sky-500 text-white hover:bg-sky-400"
                  }`}
                >
                  {uploading ? "Wgrywanie..." : "Dodaj plan lekcji CSV"}

                  <input
                    type="file"
                    className="hidden"
                    accept=".csv,text/csv"
                    disabled={uploading || !selectedGradeLevelId}
                    onChange={handleFileUpload}
                  />
                </label>
              </div>
            </div>
              {gradeLevelsError && (
                <p className="text-sm text-red-300">
                  Nie udało się pobrać listy klas: {gradeLevelsError}
                </p>
              )}
              
            {lessonPlanDocuments.length === 0 ? (
              <div className="mt-6 rounded-2xl border border-dashed border-zinc-700 bg-zinc-900/40 p-8 text-center">
                <h3 className="text-lg font-semibold text-zinc-50">
                  Brak planów lekcji
                </h3>

                <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
                  Dodaj CSV z kolumnami dział i temat. SmartTeacher odczyta plik
                  i zapisze tematy lekcji dla tego przedmiotu.
                </p>
              </div>
            ) : (
              <div className="mt-6 grid gap-4">
                {lessonPlanDocuments.map((document) =>
                  renderDocumentCard(document, {
                    downloadLabel: "Pobierz CSV",
                    deleteLabel: "Usuń plan lekcji",
                    note: "Ten plik służy do importu działów i tematów lekcji. Po imporcie dane trafiają do lesson_plan_imports i lesson_plan_items.",
                  })
                )}
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-6 shadow-sm">
            <div className="flex flex-col gap-4 border-b border-zinc-800 pb-6 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-3xl">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-400">
                  Opracowania tematów
                </p>

                <h2 className="mt-2 text-lg font-semibold text-zinc-50">
                  Twoje opracowane lekcje
                </h2>

                <p className="mt-1 text-sm leading-6 text-zinc-400">
                  Tutaj dodasz własne opracowania tematów lekcji w DOCX. W
                  kolejnym etapie będzie można przypisać je do tematów z planu
                  lekcji i przetworzyć jako źródło wiedzy.
                </p>
              </div>

              <label
                className={`inline-flex items-center justify-center rounded-xl px-5 py-3 text-sm font-semibold transition ${
                  uploading
                    ? "cursor-not-allowed bg-zinc-800 text-zinc-400"
                    : "cursor-pointer bg-sky-500 text-white hover:bg-sky-400"
                }`}
              >
                {uploading ? "Wgrywanie..." : "Dodaj opracowanie DOCX"}

                <input
                  type="file"
                  className="hidden"
                  accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  disabled={uploading}
                  onChange={handleFileUpload}
                />
              </label>
            </div>

            {lessonContentDocuments.length === 0 ? (
              <div className="mt-6 rounded-2xl border border-dashed border-zinc-700 bg-zinc-900/40 p-8 text-center">
                <h3 className="text-lg font-semibold text-zinc-50">
                  Brak opracowanych lekcji
                </h3>

                <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
                  Dodaj DOCX z opracowaniem konkretnego tematu lekcji. DOCX nie
                  jest jeszcze dzielony na bloki i chunki.
                </p>
              </div>
            ) : (
              <div className="mt-6 grid gap-4">
                {lessonContentDocuments.map((document) =>
                  renderDocumentCard(document, {
                    downloadLabel: "Pobierz DOCX",
                    deleteLabel: "Usuń opracowanie",
                    note: "Przypisanie DOCX do tematu lekcji oraz source-only ingestion dodamy w kolejnym etapie.",
                  })
                )}
              </div>
            )}
          </section>

          {otherDocuments.length > 0 && (
            <section className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-6 shadow-sm">
              <div className="border-b border-zinc-800 pb-6">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
                  Inne pliki
                </p>

                <h2 className="mt-2 text-lg font-semibold text-zinc-50">
                  Pliki nierozpoznane
                </h2>

                <p className="mt-1 text-sm text-zinc-400">
                  Te pliki nie zostały rozpoznane jako CSV ani DOCX.
                </p>
              </div>

              <div className="mt-6 grid gap-4">
                {otherDocuments.map((document) => renderDocumentCard(document))}
              </div>
            </section>
          )}
        </>
      )}

      <section className="rounded-2xl border border-sky-500/20 bg-sky-500/10 p-6">
        <h2 className="text-sm font-semibold text-sky-100">
          Zakres tego etapu
        </h2>

        <p className="mt-2 max-w-3xl text-sm leading-6 text-sky-100/80">
          Ten krok rozdziela UI Biblioteki na plany lekcji CSV oraz opracowane
          lekcje DOCX. CSV można importować do lesson_plan_imports i
          lesson_plan_items. DOCX pozostaje na razie tylko w teacher_documents.
        </p>
      </section>
    </div>
  );
}
