"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useActiveTeacherSubject } from "@/lib/subjects/useActiveTeacherSubject";

const LIBRARY_STATS = [
  {
    label: "Materiały w bibliotece",
    value: "18",
    description: "zapisane do ponownego użycia",
  },
  {
    label: "Najczęstszy dział",
    value: "Programowanie",
    description: "najwięcej zapisanych materiałów",
  },
  {
    label: "Ostatnia aktualizacja",
    value: "Dzisiaj",
    description: "ostatnio dodany materiał",
  },
];

const COLLECTIONS = [
  {
    name: "Karty pracy",
    count: "9 materiałów",
    description: "Materiały do pracy z uczniami podczas lekcji.",
  },
  {
    name: "Kartkówki",
    count: "5 materiałów",
    description: "Krótkie formy sprawdzające z jednego tematu.",
  },
  {
    name: "Sprawdziany",
    count: "4 materiały",
    description: "Zestawy zadań z wybranego działu.",
  },
];

const MATERIALS = [
  {
    id: 1,
    title: "Zmienne w Pythonie",
    section: "Programowanie",
    type: "Karta pracy",
    profiles: ["Standard", "ADHD"],
    updatedAt: "29.06.2026",
  },
  {
    id: 2,
    title: "Instrukcje warunkowe",
    section: "Programowanie",
    type: "Kartkówka",
    profiles: ["Standard"],
    updatedAt: "28.06.2026",
  },
  {
    id: 3,
    title: "System binarny",
    section: "Algorytmika",
    type: "Karta pracy",
    profiles: ["Standard", "Dysleksja"],
    updatedAt: "27.06.2026",
  },
  {
    id: 4,
    title: "Klasy i obiekty",
    section: "Podstawy OOP",
    type: "Sprawdzian",
    profiles: ["Standard"],
    updatedAt: "26.06.2026",
  },
];

export default function SubjectBibliotekaPage() {
  const params = useParams();

  const subjectKey =
    typeof params?.subjectKey === "string" ? params.subjectKey : "";

  const { subject, isLoading, errorMessage } =
    useActiveTeacherSubject(subjectKey);

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

  const generatorHref = `/przedmioty/${encodeURIComponent(
    subject.subject_key
  )}/generator`;

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
            <p className="text-sm font-medium text-sky-400">
              {subjectLabel}
            </p>

            <h1 className="text-3xl font-bold tracking-tight text-zinc-50 md:text-4xl">
              Biblioteka materiałów
            </h1>

            <p className="text-sm leading-6 text-zinc-400">
              Organizuj zapisane karty pracy, kartkówki i sprawdziany dla
              wybranego przedmiotu. Wracaj do gotowych materiałów, filtruj je
              według działu i typu pracy.
            </p>
          </div>

          <Link
            href={generatorHref}
            className="inline-flex items-center justify-center rounded-xl bg-sky-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
          >
            Utwórz nowy materiał
          </Link>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        {LIBRARY_STATS.map((stat) => (
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

      <section className="grid gap-4 lg:grid-cols-3">
        {COLLECTIONS.map((collection) => (
          <article
            key={collection.name}
            className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-5 shadow-sm transition hover:border-zinc-700 hover:bg-zinc-950"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-zinc-50">
                  {collection.name}
                </h2>

                <p className="mt-1 text-sm text-zinc-400">
                  {collection.count}
                </p>
              </div>

              <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-3 py-1 text-xs font-medium text-sky-200">
                Folder
              </span>
            </div>

            <p className="mt-4 text-sm leading-6 text-zinc-400">
              {collection.description}
            </p>
          </article>
        ))}
      </section>

      <section className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-6 shadow-sm">
        <div className="flex flex-col gap-4 border-b border-zinc-800 pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-400">
              Zapisane materiały
            </p>

            <h2 className="mt-2 text-lg font-semibold text-zinc-50">
              Ostatnio używane
            </h2>

            <p className="mt-1 text-sm text-zinc-400">
              Widok jest przygotowany wizualnie. Dane z bazy podłączymy
              osobnym krokiem.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:w-[520px]">
            <input
              type="text"
              placeholder="Szukaj materiału..."
              className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-500 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
            />

            <select
              defaultValue="all-types"
              className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-zinc-100 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
            >
              <option value="all-types">Wszystkie typy</option>
              <option value="worksheet">Karta pracy</option>
              <option value="quiz">Kartkówka</option>
              <option value="test">Sprawdzian</option>
            </select>
          </div>
        </div>

        <div className="mt-6 grid gap-4">
          {MATERIALS.map((material) => (
            <article
              key={material.id}
              className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 transition hover:border-zinc-700 hover:bg-zinc-900"
            >
              <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
                <div className="min-w-0 space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-3 py-1 text-xs font-medium text-sky-200">
                      {material.type}
                    </span>

                    <span className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-400">
                      {subjectLabel}
                    </span>

                    <span className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-400">
                      {material.section}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-zinc-50">
                      {material.title}
                    </h3>

                    <p className="mt-1 text-sm text-zinc-400">
                      Ostatnia aktualizacja: {material.updatedAt}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {material.profiles.map((profile) => (
                      <span
                        key={profile}
                        className="rounded-lg bg-zinc-800 px-2.5 py-1 text-xs text-zinc-300"
                      >
                        {profile}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="grid gap-2 sm:grid-cols-3 xl:w-[360px]">
                  <button
                    type="button"
                    className="rounded-xl border border-zinc-700 px-4 py-2.5 text-sm font-medium text-zinc-200 transition hover:border-zinc-500 hover:bg-zinc-800"
                  >
                    Otwórz
                  </button>

                  <button
                    type="button"
                    className="rounded-xl border border-zinc-700 px-4 py-2.5 text-sm font-medium text-zinc-200 transition hover:border-zinc-500 hover:bg-zinc-800"
                  >
                    Duplikuj
                  </button>

                  <button
                    type="button"
                    className="rounded-xl border border-zinc-700 px-4 py-2.5 text-sm font-medium text-zinc-200 transition hover:border-zinc-500 hover:bg-zinc-800"
                  >
                    Pobierz
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-sky-500/20 bg-sky-500/10 p-6">
        <h2 className="text-sm font-semibold text-sky-100">
          Docelowo w bibliotece
        </h2>

        <p className="mt-2 max-w-3xl text-sm leading-6 text-sky-100/80">
          Biblioteka będzie miejscem pracy nauczyciela z gotowymi materiałami:
          zapisywanie, wyszukiwanie, filtrowanie, ponowne użycie, duplikowanie
          i pobieranie materiałów bez konieczności generowania ich od zera.
        </p>
      </section>
    </div>
  );
}
