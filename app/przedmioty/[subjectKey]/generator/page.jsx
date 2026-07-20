
"use client";
import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useGeneratorLessonCatalog } from "@/lib/lessonCatalogs/useGeneratorLessonCatalog";
import { useActiveTeacherSubject } from "@/lib/subjects/useActiveTeacherSubject";

import { supabase } from "@/lib/supabaseClient";
import {
  requestMaterialGeneration,
} from "@/lib/generation/generationApi";

import GeneratedMaterial from "@/components/generator/GeneratedMaterial";

const MATERIAL_TYPES = [
  {
    value: "karta pracy",
    label: "Karta pracy",
    description: "Materiał do pracy z uczniami podczas lekcji.",
    disabled: true,
  },
  {
    value: "kartkówka",
    label: "Kartkówka",
    description: "Krótka forma sprawdzająca z jednego tematu.",
    disabled: false,
  },
  {
    value: "sprawdzian",
    label: "Sprawdzian",
    description: "Zestaw zadań z wybranego działu.",
    disabled: true,
  },
];

const STUDENT_PROFILES = [
  {
    value: "Standard",
    label: "Standard",
  },
  {
    value: "ASD",
    label: "Spektrum ASD",
  },
  {
    value: "ADHD",
    label: "ADHD",
  },
  {
    value: "Dysleksja",
    label: "Dysleksja",
  },
  {
    value: "Obcojęzyczny",
    label: "Uczeń obcojęzyczny",
  },
];

const TASK_COUNT_OPTIONS = [
  {
    value: "5",
    label: "5 zadań",
    level: "podstawowy",
  },
  {
    value: "6",
    label: "6 zadań",
    level: "średni",
  },
  {
    value: "7",
    label: "7 zadań",
    level: "zaawansowany",
  },
];


export default function SubjectGeneratorPage() {
  const params = useParams();
  const subjectKey =
    typeof params?.subjectKey === "string" ? params.subjectKey : "";

  const { subject, isLoading, errorMessage } =
    useActiveTeacherSubject(subjectKey);

  //stany dla działów
  const subjectId = subject?.id || "";

    const {
    gradeLevels,
    gradeLevelsLoading,
    gradeLevelsError,
    selectedGradeLevelId,

    lessonSections,
    sectionsLoading,
    sectionsError,
    selectedLessonSectionId,

    lessonTopics,
    topicsLoading,
    topicsError,
    selectedLessonTopicId,

    handleGradeLevelChange,
    handleLessonSectionChange,
    handleLessonTopicChange,
  } = useGeneratorLessonCatalog(subjectId);

  // stany formularza
    const [selectedMaterialType, setSelectedMaterialType] =
  // useState(MATERIAL_TYPES[0].value);
    useState("kartkówka");

  const [selectedTaskCount, setSelectedTaskCount] = useState(
    TASK_COUNT_OPTIONS[0].value
  );
  
const [selectedProfiles, setSelectedProfiles] =
  useState(["Standard"]);

const [isGenerating, setIsGenerating] =
  useState(false);

const [generationError, setGenerationError] =
  useState("");

const [generationResult, setGenerationResult] =
  useState(null);

function handleProfileChange(profileValue) {
  setSelectedProfiles((currentProfiles) => {
    if (currentProfiles.includes(profileValue)) {
      return currentProfiles.filter(
        (profile) => profile !== profileValue
      );
    }

    return [
      ...currentProfiles,
      profileValue,
    ];
  });
}

async function handleGenerate() {
  setGenerationError("");
  setGenerationResult(null);

  if (!selectedLessonTopicId) {
    setGenerationError(
      "Najpierw wybierz temat lekcji."
    );
    return;
  }

  if (selectedProfiles.length === 0) {
    setGenerationError(
      "Wybierz co najmniej jeden profil ucznia."
    );
    return;
  }

  setIsGenerating(true);

  try {
    const result =
      await requestMaterialGeneration({
        supabase,
        lessonTopicId:
          selectedLessonTopicId,
        materialType:
          selectedMaterialType,
        taskCount:
          selectedTaskCount,
        profiles:
          selectedProfiles,
      });

    setGenerationResult(result);
  } catch (error) {
    setGenerationError(
      error instanceof Error
        ? error.message
        : "Nie udało się wygenerować materiału."
    );
  } finally {
    setIsGenerating(false);
  }
}

const canGenerate =
  Boolean(selectedLessonTopicId) &&
  selectedMaterialType === "kartkówka" &&
  selectedProfiles.length > 0 &&
  !isGenerating;

  if (isLoading) {
    return (
      <div className="space-y-3">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-50">
          Ładowanie generatora...
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
          Nie można otworzyć przedmiotu
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

        <div className="max-w-3xl space-y-3">
          <p className="text-sm font-medium text-sky-400">{subjectLabel}</p>

          <h1 className="text-3xl font-bold tracking-tight text-zinc-50 md:text-4xl">
            Generator materiałów
          </h1>

          <p className="text-sm leading-6 text-zinc-400">
            Przygotuj kartę pracy, kartkówkę albo sprawdzian na podstawie
            działu, tematu lekcji i profili uczniów w klasie.
          </p>
        </div>
      </header>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-6 shadow-sm">
          <div className="space-y-8">
            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-400">
                  Krok 1
                </p>
                <h2 className="mt-1 text-lg font-semibold text-zinc-50">
                  Wybierz klasę i zakres materiału
                </h2>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                                <div className="space-y-2">
                  <label
                    htmlFor="gradeLevel"
                    className="text-sm font-semibold text-zinc-100"
                  >
                    Klasa
                  </label>

                  <select
                    id="gradeLevel"
                    value={selectedGradeLevelId}
                    onChange={handleGradeLevelChange}
                    disabled={gradeLevelsLoading || gradeLevels.length === 0}
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-zinc-100 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <option value="" disabled>
                      {gradeLevelsLoading ? "Ładowanie klas..." : "Wybierz klasę"}
                    </option>

                    {gradeLevels.map((gradeLevel) => (
                      <option key={gradeLevel.id} value={gradeLevel.id}>
                        {gradeLevel.label}
                      </option>
                    ))}
                  </select>

                  {gradeLevelsError ? (
                    <p className="text-xs text-red-300">{gradeLevelsError}</p>
                  ) : (
                    <p className="text-xs text-zinc-500">
                      Klasa określi prywatny katalog lekcji nauczyciela.
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="lessonSection"
                    className="text-sm font-semibold text-zinc-100"
                  >
                    Dział
                  </label>

                  <select
                    id="lessonSection"
                    value={selectedLessonSectionId}
                    onChange={handleLessonSectionChange}
                    disabled={
                      !selectedGradeLevelId ||
                      sectionsLoading ||
                      lessonSections.length === 0
                    }
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-zinc-100 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <option value="" disabled>
                      {!selectedGradeLevelId
                        ? "Najpierw wybierz klasę"
                        : sectionsLoading
                          ? "Ładowanie działów..."
                          : "Wybierz dział"}
                    </option>

                    {lessonSections.map((section) => (
                      <option key={section.id} value={section.id}>
                        {section.display_name}
                      </option>
                    ))}
                  </select>

                  {sectionsError ? (
                    <p className="text-xs text-red-300">{sectionsError}</p>
                  ) : (
                    <p className="text-xs text-zinc-500">
                      Działy pochodzą z prywatnego katalogu lekcji utworzonego z CSV.
                    </p>
                  )}
                </div>
          
                <div className="space-y-2">
                  <label
                    htmlFor="lessonTopic"
                    className="text-sm font-semibold text-zinc-100"
                  >
                    Temat lekcji
                  </label>

                  <select
  id="lessonTopic"
  value={selectedLessonTopicId}
  onChange={handleLessonTopicChange}
                    disabled={
                      !selectedLessonSectionId ||
                      topicsLoading ||
                      lessonTopics.length === 0
                    }
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-zinc-100 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <option value="" disabled>
                      {!selectedLessonSectionId
                        ? "Najpierw wybierz dział"
                        : topicsLoading
                          ? "Ładowanie tematów..."
                          : "Wybierz temat lekcji"}
                    </option>

                    {lessonTopics.map((topic) => (
                      <option key={topic.id} value={topic.id}>
                        {topic.display_title}
                      </option>
                    ))}
                  </select>

                  {topicsError ? (
                    <p className="text-xs text-red-300">{topicsError}</p>
                  ) : (
                    <p className="text-xs text-zinc-500">
                      Tematy pochodzą z prywatnego katalogu lekcji nauczyciela.
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_260px]">
              <fieldset className="space-y-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-400">
                    Krok 2
                  </p>
                  <legend className="mt-1 text-lg font-semibold text-zinc-50">
                    Wybierz formę materiału
                  </legend>
                </div>

                <div className="grid gap-3">
                  {MATERIAL_TYPES.map((type) => (
                    <label
                      key={type.value}
                      className="flex cursor-pointer gap-3 rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 transition hover:border-zinc-700 hover:bg-zinc-900"
                    >
                     <input
  type="radio"
  name="materialType"
  value={type.value}
  checked={
    selectedMaterialType === type.value
  }
  onChange={(event) =>
    setSelectedMaterialType(
      event.target.value
    )
  }
  disabled={type.disabled}
  className="mt-1 h-4 w-4 accent-sky-500 disabled:cursor-not-allowed"
/>

                      <span className="space-y-1">
                        <span className="block text-sm font-semibold text-zinc-100">
                          {type.label}
                        </span>
                        <span className="block text-xs leading-5 text-zinc-400">
                          {type.description}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <div className="space-y-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-400">
                    Krok 3
                  </p>
                  <h2 className="mt-1 text-lg font-semibold text-zinc-50">
                    Ustaw liczbę zadań
                  </h2>
                </div>

                <div className="space-y-2">

                 <select
  id="taskCount"
  value={selectedTaskCount}
  onChange={(event) => setSelectedTaskCount(event.target.value)}
  className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-zinc-100 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
>
  {TASK_COUNT_OPTIONS.map((option) => (
    <option key={option.value} value={option.value}>
      {option.label}
    </option>
  ))}
</select>

<p className="text-xs text-zinc-500">
  Aplikacja automatycznie dobierze typy zadań do wybranej liczby.
</p>
                </div>
              </div>
            </div>

            <fieldset className="space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-400">
                  Krok 4
                </p>
                <legend className="mt-1 text-lg font-semibold text-zinc-50">
                  Wybierz profile uczniów w klasie
                </legend>
                <p className="mt-1 text-sm text-zinc-400">
                  Materiał bazowy pozostaje wspólny, a różnicowanie dotyczy
                  sposobu prezentacji.
                </p>
              </div>

              <div className="grid gap-3 text-sm text-zinc-300 sm:grid-cols-2 lg:grid-cols-3">
               {STUDENT_PROFILES.map((profile) => (
  <label
    key={profile.value}
    className="flex cursor-pointer items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 transition hover:border-zinc-700 hover:bg-zinc-900"
  >
    <input
      type="checkbox"
      checked={selectedProfiles.includes(
        profile.value
      )}
      onChange={() =>
        handleProfileChange(
          profile.value
        )
      }
      className="h-4 w-4 rounded border-zinc-600 bg-zinc-900 accent-sky-500"
    />

    <span>{profile.label}</span>
  </label>
))}
              </div>
            </fieldset>

           <button
  type="button"
  onClick={handleGenerate}
  disabled={!canGenerate}
  className="w-full rounded-xl bg-sky-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/30 disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-400"
>
  {isGenerating
    ? "Generowanie materiału..."
    : "Generuj zestaw materiałów"}
</button>

{generationError ? (
  <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4">
    <p className="text-sm text-red-200">
      {generationError}
    </p>
  </div>
) : null}


<GeneratedMaterial
  generationResult={generationResult}
/>
          </div>
        </section>

        <aside className="space-y-4">
          <section className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-400">
              Podsumowanie
            </p>

            <h2 className="mt-2 text-lg font-semibold text-zinc-50">
              Co otrzyma nauczyciel?
            </h2>

            <ul className="mt-4 space-y-3 text-sm text-zinc-300">
              <li className="flex gap-3">
                <span className="text-sky-400">•</span>
                <span>materiał dla ucznia gotowy do wydruku,</span>
              </li>
              <li className="flex gap-3">
                <span className="text-sky-400">•</span>
                <span>klucz odpowiedzi dla nauczyciela,</span>
              </li>
              <li className="flex gap-3">
                <span className="text-sky-400">•</span>
                <span>punktację i strukturę zadań,</span>
              </li>
              <li className="flex gap-3">
                <span className="text-sky-400">•</span>
                <span>wersję dopasowaną do wybranych profili.</span>
              </li>
            </ul>
          </section>

          <section className="rounded-2xl border border-sky-500/20 bg-sky-500/10 p-6">
            <h2 className="text-sm font-semibold text-sky-100">
              Główna wartość SmartTeacher
            </h2>

            <p className="mt-2 text-sm leading-6 text-sky-100/80">
              Nauczyciel nie zaczyna od pustej kartki. Wybiera zakres,
              typ materiału i profile uczniów, a system przygotowuje
              uporządkowany zestaw do użycia na lekcji.
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}
