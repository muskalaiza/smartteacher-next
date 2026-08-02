"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import GeneratedMaterial from "@/components/generator/GeneratedMaterial";
import {
  GENERATED_MATERIALS_HISTORY_PAGE_SIZE,
  getGeneratedMaterialFromHistory,
  listGeneratedMaterialsHistory,
} from "@/lib/generation/generatedMaterialsHistoryApi";
import { useActiveTeacherSubject } from "@/lib/subjects/useActiveTeacherSubject";
import { supabase } from "@/lib/supabaseClient";

const MATERIAL_TYPE_OPTIONS = [
  {
    value: "all",
    label: "Wszystkie typy",
  },
  {
    value: "karta pracy",
    label: "Karta pracy",
  },
  {
    value: "kartkówka",
    label: "Kartkówka",
  },
  {
    value: "sprawdzian",
    label: "Sprawdzian",
  },
];

const MATERIAL_TYPE_LABELS = {
  "karta pracy": "Karta pracy",
  kartkówka: "Kartkówka",
  sprawdzian: "Sprawdzian",
};

const PROFILE_LABELS = {
  Standard: "Standard",
  ASD: "Spektrum ASD",
  ADHD: "ADHD",
  Dysleksja: "Dysleksja",
  Obcojęzyczny: "Uczeń obcojęzyczny",
};

const historyDateFormatter = new Intl.DateTimeFormat("pl-PL", {
  dateStyle: "medium",
  timeStyle: "short",
});

function formatHistoryDate(value) {
  if (typeof value !== "string" || !value.trim()) {
    return "Brak daty";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Brak daty";
  }

  return historyDateFormatter.format(date);
}

function buildHistoryGenerationOutput(record) {
  const materialTypeLabel = MATERIAL_TYPE_LABELS[record.material_type];

  if (!materialTypeLabel) {
    throw new Error("Materiał ma nieobsługiwany typ.");
  }

  return {
    result: {
      lessonTopic: {
        displayTitle: record.topic_title_snapshot,
      },
      material: record.content_json,
    },
    materialType: {
      value: record.material_type,
      label: materialTypeLabel,
    },
    profiles: record.profiles.map((profile) => ({
      value: profile,
      label: PROFILE_LABELS[profile] || profile,
    })),
  };
}

export default function SubjectHistoriaPage() {
  const params = useParams();

  const subjectKey =
    typeof params?.subjectKey === "string" ? params.subjectKey : "";

  const { subject, isLoading, errorMessage } =
    useActiveTeacherSubject(subjectKey);

  const [materialTypeFilter, setMaterialTypeFilter] = useState("all");
  const [historyItems, setHistoryItems] = useState([]);
  const [hasMore, setHasMore] = useState(false);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [historyError, setHistoryError] = useState("");

  const [openedMaterial, setOpenedMaterial] = useState(null);
  const [isOpeningMaterial, setIsOpeningMaterial] = useState(false);
  const [openingMaterialId, setOpeningMaterialId] = useState("");
  const [openError, setOpenError] = useState("");

  const subjectId = subject?.id || "";

  useEffect(() => {
    let isMounted = true;

    async function loadHistory() {
      if (!subjectId) {
        return;
      }

      setIsHistoryLoading(true);
      setHistoryError("");
      setHistoryItems([]);
      setHasMore(false);
      setOpenedMaterial(null);
      setOpenError("");

      try {
        const result = await listGeneratedMaterialsHistory({
          supabase,
          subjectId,
          materialType: materialTypeFilter,
        });

        if (!isMounted) return;

        setHistoryItems(result.items);
        setHasMore(result.hasMore);
      } catch (error) {
        if (!isMounted) return;

        setHistoryError(
          error instanceof Error
            ? error.message
            : "Nie udało się pobrać Historii Generowań."
        );
      } finally {
        if (isMounted) {
          setIsHistoryLoading(false);
        }
      }
    }

    loadHistory();

    return () => {
      isMounted = false;
    };
  }, [materialTypeFilter, subjectId]);

  async function handleLoadMore() {
    if (
      !subjectId ||
      !hasMore ||
      isHistoryLoading ||
      isLoadingMore
    ) {
      return;
    }

    setIsLoadingMore(true);
    setHistoryError("");

    try {
      const result = await listGeneratedMaterialsHistory({
        supabase,
        subjectId,
        materialType: materialTypeFilter,
        offset: historyItems.length,
        limit: GENERATED_MATERIALS_HISTORY_PAGE_SIZE,
      });

      setHistoryItems((currentItems) => [
        ...currentItems,
        ...result.items,
      ]);
      setHasMore(result.hasMore);
    } catch (error) {
      setHistoryError(
        error instanceof Error
          ? error.message
          : "Nie udało się pobrać kolejnych materiałów."
      );
    } finally {
      setIsLoadingMore(false);
    }
  }

  async function handleOpenMaterial(generatedMaterialId) {
    if (!subjectId || isOpeningMaterial) {
      return;
    }

    setIsOpeningMaterial(true);
    setOpeningMaterialId(generatedMaterialId);
    setOpenError("");

    try {
      const record = await getGeneratedMaterialFromHistory({
        supabase,
        subjectId,
        generatedMaterialId,
      });

      setOpenedMaterial({
        record,
        generationOutput: buildHistoryGenerationOutput(record),
      });
    } catch (error) {
      setOpenError(
        error instanceof Error
          ? error.message
          : "Nie udało się otworzyć zapisanego materiału."
      );
    } finally {
      setIsOpeningMaterial(false);
      setOpeningMaterialId("");
    }
  }

  function handleBackToHistory() {
    setOpenedMaterial(null);
    setOpenError("");
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-50">
          Ładowanie historii...
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
          Nie można otworzyć historii
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

  if (openedMaterial) {
    return (
      <div className="space-y-8">
        <header className="space-y-4 print:hidden">
          <button
            type="button"
            onClick={handleBackToHistory}
            className="inline-flex items-center text-sm text-zinc-400 transition-colors hover:text-zinc-100"
          >
            ← Wróć do historii
          </button>

          <div className="max-w-3xl space-y-3">
            <p className="text-sm font-medium text-sky-400">
              {subjectLabel}
            </p>

            <h1 className="text-3xl font-bold tracking-tight text-zinc-50 md:text-4xl">
              {openedMaterial.record.topic_title_snapshot}
            </h1>

            <p className="text-sm leading-6 text-zinc-400">
              Zapisany materiał został otwarty z Historii Generowań. Ponowny
              wydruk nie uruchamia modelu i nie tworzy nowego rekordu.
            </p>
          </div>
        </header>

        <GeneratedMaterial
          generationOutput={openedMaterial.generationOutput}
        />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="space-y-4">
        <Link
          href="/dashboard"
          className="inline-flex items-center text-sm text-zinc-400 transition-colors hover:text-zinc-100"
        >
          ← Wróć do wyboru przedmiotu
        </Link>

        <div className="max-w-3xl space-y-3">
          <p className="text-sm font-medium text-sky-400">{subjectLabel}</p>

          <h1 className="text-3xl font-bold tracking-tight text-zinc-50 md:text-4xl">
            Historia generowań
          </h1>

          <p className="text-sm leading-6 text-zinc-400">
            Otwieraj zapisane materiały i drukuj je ponownie bez ponownego
            wywołania modelu.
          </p>
        </div>
      </header>

      <section className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-6 shadow-sm">
        <div className="flex flex-col gap-4 border-b border-zinc-800 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-400">
              Lista materiałów
            </p>

            <h2 className="mt-2 text-lg font-semibold text-zinc-50">
              Ostatnie generowania
            </h2>
          </div>

          <label className="grid gap-2 sm:w-60">
            <span className="text-xs font-medium text-zinc-400">
              Typ materiału
            </span>
            <select
              value={materialTypeFilter}
              onChange={(event) => setMaterialTypeFilter(event.target.value)}
              disabled={isHistoryLoading || isLoadingMore || isOpeningMaterial}
              className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-zinc-100 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 disabled:cursor-wait disabled:opacity-60"
            >
              {MATERIAL_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {openError ? (
          <div className="mt-6 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
            {openError}
          </div>
        ) : null}

        {historyError ? (
          <div className="mt-6 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
            {historyError}
          </div>
        ) : null}

        {isHistoryLoading ? (
          <div className="py-12 text-center">
            <p className="text-sm text-zinc-400">Ładowanie materiałów...</p>
          </div>
        ) : null}

        {!isHistoryLoading && !historyError && historyItems.length === 0 ? (
          <div className="py-12 text-center">
            <h3 className="text-base font-semibold text-zinc-100">
              Brak zapisanych materiałów
            </h3>
            <p className="mt-2 text-sm text-zinc-400">
              Dla wybranego typu nie ma jeszcze gotowych materiałów w historii.
            </p>
          </div>
        ) : null}

        {!isHistoryLoading && historyItems.length > 0 ? (
          <div className="mt-6 space-y-4">
            {historyItems.map((item) => {
              const materialTypeLabel =
                MATERIAL_TYPE_LABELS[item.material_type] || item.material_type;
              const isOpening = openingMaterialId === item.id;

              return (
                <article
                  key={item.id}
                  className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 transition hover:border-zinc-700 hover:bg-zinc-900"
                >
                  <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
                    <div className="min-w-0 space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-3 py-1 text-xs font-medium text-sky-200">
                          {materialTypeLabel}
                        </span>

                        <span className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-400">
                          {item.subject_name_snapshot || subjectLabel}
                        </span>
                      </div>

                      <div>
                        <h3 className="text-lg font-semibold text-zinc-50">
                          {item.topic_title_snapshot}
                        </h3>

                        <p className="mt-1 text-sm text-zinc-400">
                          {item.task_count} zadań · Wygenerowano: {" "}
                          {formatHistoryDate(item.created_at)}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {item.profiles.map((profile) => (
                          <span
                            key={profile}
                            className="rounded-lg bg-zinc-800 px-2.5 py-1 text-xs text-zinc-300"
                          >
                            {PROFILE_LABELS[profile] || profile}
                          </span>
                        ))}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleOpenMaterial(item.id)}
                      disabled={isOpeningMaterial}
                      className="inline-flex min-w-28 items-center justify-center rounded-xl border border-zinc-700 px-4 py-2.5 text-sm font-medium text-zinc-200 transition hover:border-zinc-500 hover:bg-zinc-800 disabled:cursor-wait disabled:opacity-60"
                    >
                      {isOpening ? "Otwieranie..." : "Otwórz"}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        ) : null}

        {!isHistoryLoading && hasMore ? (
          <div className="mt-6 flex justify-center border-t border-zinc-800 pt-5">
            <button
              type="button"
              onClick={handleLoadMore}
              disabled={isLoadingMore || isOpeningMaterial}
              className="text-sm font-medium text-zinc-400 transition hover:text-zinc-100 disabled:cursor-wait disabled:opacity-60"
            >
              {isLoadingMore ? "Ładowanie..." : "Pokaż więcej"}
            </button>
          </div>
        ) : null}
      </section>
    </div>
  );
}
