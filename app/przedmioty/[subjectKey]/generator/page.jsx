
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import {
  getCurrentLessonCatalogUserId,
  getPrivateLessonCatalogForGrade,
  listGradeLevels,
  listLessonTopics,
  listLessonSections,
} from "@/lib/lessonCatalogs/lessonCatalogsApi";

import { useActiveTeacherSubject } from "@/lib/subjects/useActiveTeacherSubject";

const MATERIAL_TYPES = [
  {
    value: "karta-pracy",
    label: "Karta pracy",
    description: "Materiał do pracy z uczniami podczas lekcji.",
  },
  {
    value: "kartkowka",
    label: "Kartkówka",
    description: "Krótka forma sprawdzająca z jednego tematu.",
  },
  {
    value: "sprawdzian",
    label: "Sprawdzian",
    description: "Zestaw zadań z wybranego działu.",
  },
];

const STUDENT_PROFILES = [
  "Standard",
  "Spektrum ASD",
  "ADHD",
  "Dysleksja",
  "Uczeń obcojęzyczny",
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

  // stany klas
  const [gradeLevels, setGradeLevels] = useState([]);
  const [gradeLevelsLoading, setGradeLevelsLoading] = useState(true);
  const [gradeLevelsError, setGradeLevelsError] = useState("");
  const [selectedGradeLevelId, setSelectedGradeLevelId] = useState("");

  //stany dla działów
  const subjectId = subject?.id || "";

  const [lessonSections, setLessonSections] = useState([]);
  const [sectionsLoading, setSectionsLoading] = useState(false);
  const [sectionsError, setSectionsError] = useState("");
  const [selectedLessonSectionId, setSelectedLessonSectionId] = useState("");

  // stany tematów lekcji

  const [selectedLessonCatalogId, setSelectedLessonCatalogId] = useState("");
  const [lessonTopics, setLessonTopics] = useState([]);
  const [topicsLoading, setTopicsLoading] = useState(false);
  const [topicsError, setTopicsError] = useState("");
  const [selectedLessonTopicId, setSelectedLessonTopicId] = useState("");

  // stany formularza
    const [selectedMaterialType, setSelectedMaterialType] =
    useState(MATERIAL_TYPES[0].value);

  const [selectedTaskCount, setSelectedTaskCount] = useState(
    TASK_COUNT_OPTIONS[0].value
  );


  useEffect(() => {
    let isMounted = true;

    async function loadGradeLevels() {
      try {
        const loadedGradeLevels = await listGradeLevels({ supabase });

        if (!isMounted) return;

        setGradeLevels(loadedGradeLevels);
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

  //handler wyboru klasy

  function handleGradeLevelChange(event) {
    const gradeLevelId = event.target.value;

    setSelectedGradeLevelId(gradeLevelId);
    setSelectedLessonCatalogId("");
    setSelectedLessonSectionId("");
    setLessonSections([]);
    setSectionsError("");
    setSectionsLoading(Boolean(gradeLevelId && subjectId));
    setSelectedLessonTopicId("");
    setLessonTopics([]);
    setTopicsError("");
    setTopicsLoading(false);
  }

//handler wyboru działu

    function handleLessonSectionChange(event) {
    const lessonSectionId = event.target.value;

    setSelectedLessonSectionId(lessonSectionId);
    setSelectedLessonTopicId("");
    setLessonTopics([]);
    setTopicsError("");
    setTopicsLoading(Boolean(lessonSectionId && selectedLessonCatalogId));
  }
    useEffect(() => {
    let isMounted = true;

    async function loadLessonSectionsForGrade() {
      if (!selectedGradeLevelId || !subjectId) {
        return;
      }

      try {
        const userId = await getCurrentLessonCatalogUserId(supabase);

        if (!isMounted) return;

        const catalog = await getPrivateLessonCatalogForGrade({
          supabase,
          userId,
          subjectId,
          gradeLevelId: selectedGradeLevelId,
        });

        if (!isMounted) return;

        if (!catalog) {
          setSelectedLessonCatalogId("");
          setLessonSections([]);
          setSectionsError(
            "Brak prywatnego katalogu lekcji dla wybranej klasy. Najpierw zaimportuj plan lekcji CSV w Bibliotece."
          );
          return;
        }

        setSelectedLessonCatalogId(catalog.id);

        const loadedSections = await listLessonSections({
          supabase,
          catalogId: catalog.id,
        });

        if (!isMounted) return;

        setLessonSections(loadedSections);
        setSectionsError("");
      } catch (error) {
        if (!isMounted) return;

        setLessonSections([]);
        setSectionsError(error.message);
      } finally {
        if (isMounted) {
          setSectionsLoading(false);
        }
      }
    }

    loadLessonSectionsForGrade();

    return () => {
      isMounted = false;
    };
  }, [selectedGradeLevelId, subjectId]);

    useEffect(() => {
    let isMounted = true;

    async function loadLessonTopicsForSection() {
      if (!selectedLessonCatalogId || !selectedLessonSectionId) {
        return;
      }

      try {
        const loadedTopics = await listLessonTopics({
          supabase,
          catalogId: selectedLessonCatalogId,
          sectionId: selectedLessonSectionId,
        });

        if (!isMounted) return;

        setLessonTopics(loadedTopics);
        setTopicsError("");
      } catch (error) {
        if (!isMounted) return;

        setLessonTopics([]);
        setTopicsError(error.message);
      } finally {
        if (isMounted) {
          setTopicsLoading(false);
        }
      }
    }

    loadLessonTopicsForSection();

    return () => {
      isMounted = false;
    };
  }, [selectedLessonCatalogId, selectedLessonSectionId]);
  
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
                    onChange={(event) =>
                      setSelectedLessonTopicId(event.target.value)
                    }
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
  checked={selectedMaterialType === type.value}
  onChange={(event) => setSelectedMaterialType(event.target.value)}
  className="mt-1 h-4 w-4 accent-sky-500"
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
                {STUDENT_PROFILES.map((profile, index) => (
                  <label
                    key={profile}
                    className="flex cursor-pointer items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 transition hover:border-zinc-700 hover:bg-zinc-900"
                  >
                    <input
                      type="checkbox"
                      defaultChecked={index === 0}
                      className="h-4 w-4 rounded border-zinc-600 bg-zinc-900 accent-sky-500"
                    />
                    <span>{profile}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <button
              type="button"
              className="w-full rounded-xl bg-sky-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
            >
              Generuj zestaw materiałów
            </button>
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
