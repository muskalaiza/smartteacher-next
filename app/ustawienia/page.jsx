"use client";

import { AlertCircle, CheckCircle2, Save } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import {
  buildTeacherGradeScaleRanges,
  DEFAULT_TEACHER_GRADE_THRESHOLDS,
  validateTeacherGradeScaleThresholds,
} from "@/lib/gradeScale/teacherGradeScale";
import {
  getTeacherGradeScale,
  saveTeacherGradeScale,
} from "@/lib/gradeScale/teacherGradeScaleApi";
import { supabase } from "@/lib/supabaseClient";

const THRESHOLD_FIELDS = [
  {
    key: "grade2Min",
    grade: 2,
    label: "dopuszczający",
  },
  {
    key: "grade3Min",
    grade: 3,
    label: "dostateczny",
  },
  {
    key: "grade4Min",
    grade: 4,
    label: "dobry",
  },
  {
    key: "grade5Min",
    grade: 5,
    label: "bardzo dobry",
  },
  {
    key: "grade6Min",
    grade: 6,
    label: "celujący",
  },
];

function toFormValues(scale) {
  const source = scale || DEFAULT_TEACHER_GRADE_THRESHOLDS;

  return Object.fromEntries(
    THRESHOLD_FIELDS.map(({ key }) => [key, String(source[key])])
  );
}

function toThresholds(formValues) {
  return Object.fromEntries(
    THRESHOLD_FIELDS.map(({ key }) => [key, Number(formValues[key])])
  );
}

export default function SettingsPage() {
  const [formValues, setFormValues] = useState(() => toFormValues(null));
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasSavedScale, setHasSavedScale] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadScale() {
      try {
        const scale = await getTeacherGradeScale({ supabase });

        if (!isMounted) {
          return;
        }

        setHasSavedScale(Boolean(scale));
        setFormValues(toFormValues(scale));
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Nie udało się pobrać skali ocen."
        );
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadScale();

    return () => {
      isMounted = false;
    };
  }, []);

  const preview = useMemo(() => {
    try {
      const thresholds = validateTeacherGradeScaleThresholds(
        toThresholds(formValues)
      );

      return {
        ranges: buildTeacherGradeScaleRanges(thresholds),
        error: "",
      };
    } catch (error) {
      return {
        ranges: [],
        error:
          error instanceof Error
            ? error.message
            : "Nieprawidłowe progi ocen.",
      };
    }
  }, [formValues]);

  function handleThresholdChange(key, value) {
    setFormValues((current) => ({
      ...current,
      [key]: value,
    }));
    setErrorMessage("");
    setSuccessMessage("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    let thresholds;

    try {
      thresholds = validateTeacherGradeScaleThresholds(
        toThresholds(formValues)
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Nieprawidłowe progi ocen."
      );
      return;
    }

    setIsSaving(true);

    try {
      const savedScale = await saveTeacherGradeScale({
        supabase,
        thresholds,
      });

      setFormValues(toFormValues(savedScale));
      setHasSavedScale(true);
      setSuccessMessage("Skala ocen została zapisana.");
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Nie udało się zapisać skali ocen."
      );
    } finally {
      setIsSaving(false);
    }
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
          <p className="text-sm font-medium text-sky-400">Ustawienia konta</p>

          <h1 className="text-3xl font-bold tracking-tight text-zinc-50 md:text-4xl">
            Skala ocen
          </h1>

          <p className="text-sm leading-6 text-zinc-400">
            Ustaw minimalny próg procentowy dla ocen od 2 do 6. Ocena 1
            zawsze rozpoczyna się od 0%.
          </p>
        </div>
      </header>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-6 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex flex-col gap-3 border-b border-zinc-800 pb-5 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-400">
                  Progi minimalne
                </p>
                <h2 className="mt-2 text-lg font-semibold text-zinc-50">
                  Formularz skali ocen
                </h2>
              </div>

              <span
                className={`inline-flex w-fit rounded-full border px-3 py-1 text-xs font-medium ${
                  hasSavedScale
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
                    : "border-zinc-700 bg-zinc-900 text-zinc-400"
                }`}
              >
                {hasSavedScale ? "Skala aktywna" : "Skala niezapisana"}
              </span>
            </div>

            {isLoading ? (
              <p className="text-sm text-zinc-400">Ładowanie ustawień...</p>
            ) : (
              <div className="space-y-4">
                <div className="grid gap-4 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 sm:grid-cols-[minmax(0,1fr)_140px] sm:items-center">
                  <div>
                    <p className="text-sm font-semibold text-zinc-100">
                      Ocena 1 — niedostateczny
                    </p>
                    <p className="mt-1 text-xs text-zinc-500">
                      Początek zakresu jest stały.
                    </p>
                  </div>

                  <div className="rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-center text-sm font-semibold text-zinc-400">
                    od 0%
                  </div>
                </div>

                {THRESHOLD_FIELDS.map(({ key, grade, label }) => (
                  <label
                    key={key}
                    className="grid gap-4 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 sm:grid-cols-[minmax(0,1fr)_140px] sm:items-center"
                  >
                    <span>
                      <span className="block text-sm font-semibold text-zinc-100">
                        Ocena {grade} — {label}
                      </span>
                      <span className="mt-1 block text-xs text-zinc-500">
                        Minimalny wynik procentowy ucznia.
                      </span>
                    </span>

                    <span className="relative block">
                      <input
                        type="number"
                        min="1"
                        max="100"
                        step="1"
                        inputMode="numeric"
                        value={formValues[key]}
                        onChange={(event) =>
                          handleThresholdChange(key, event.target.value)
                        }
                        disabled={isSaving}
                        aria-label={`Minimalny próg procentowy dla oceny ${grade}`}
                        className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 pr-10 text-sm font-semibold text-zinc-100 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 disabled:cursor-wait disabled:opacity-60"
                      />
                      <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-zinc-500">
                        %
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            )}

            {errorMessage ? (
              <div className="flex gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <p>{errorMessage}</p>
              </div>
            ) : null}

            {successMessage ? (
              <div className="flex gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-200">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <p>{successMessage}</p>
              </div>
            ) : null}

            <div className="flex justify-end border-t border-zinc-800 pt-6">
              <button
                type="submit"
                disabled={isLoading || isSaving || Boolean(preview.error)}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-sky-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Save className="h-4 w-4" aria-hidden="true" />
                {isSaving ? "Zapisywanie..." : "Zapisz skalę"}
              </button>
            </div>
          </form>
        </section>

        <aside className="space-y-4">
          <section className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-400">
              Podgląd
            </p>

            <h2 className="mt-2 text-lg font-semibold text-zinc-50">
              Zakresy ocen
            </h2>

            {preview.error ? (
              <p className="mt-4 text-sm leading-6 text-red-300">
                {preview.error}
              </p>
            ) : (
              <ol className="mt-4 space-y-3">
                {preview.ranges.map((range) => (
                  <li
                    key={range.grade}
                    className="flex items-center justify-between gap-4 border-b border-zinc-800 pb-3 text-sm last:border-b-0 last:pb-0"
                  >
                    <span className="text-zinc-300">
                      {range.grade} — {range.label}
                    </span>
                    <span className="shrink-0 font-semibold text-zinc-100">
                      {range.min}–{range.max}%
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </section>

          <section className="rounded-2xl border border-sky-500/20 bg-sky-500/10 p-6">
            <h2 className="text-sm font-semibold text-sky-100">
              Jak działa skala?
            </h2>

            <p className="mt-2 text-sm leading-6 text-sky-100/80">
              Po zapisaniu zostanie dołączona do klucza nauczyciela w
              Generatorze, Historii oraz na wydruku PDF. Zmiana progów obejmie
              również wcześniej zapisane materiały.
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}
