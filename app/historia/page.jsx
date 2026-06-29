"use client";

import Link from "next/link";

const GENERATION_STATS = [
  {
    label: "Wygenerowane materiały",
    value: "24",
    description: "w ostatnich 30 dniach",
  },
  {
    label: "Najczęstszy typ",
    value: "Karta pracy",
    description: "najczęściej wybierana forma",
  },
  {
    label: "Ostatni materiał",
    value: "Dzisiaj",
    description: "ostatnia aktywność w historii",
  },
];

const HISTORY_ITEMS = [
  {
    id: 1,
    title: "Zmienne w Pythonie",
    subject: "Informatyka",
    type: "Karta pracy",
    profiles: ["Standard", "ADHD"],
    tasks: "5 zadań",
    date: "29.06.2026",
    status: "Gotowe",
  },
  {
    id: 2,
    title: "Instrukcje warunkowe",
    subject: "Informatyka",
    type: "Kartkówka",
    profiles: ["Standard"],
    tasks: "6 zadań",
    date: "28.06.2026",
    status: "Gotowe",
  },
  {
    id: 3,
    title: "Programowanie obiektowe — klasy i obiekty",
    subject: "Programowanie obiektowe",
    type: "Sprawdzian",
    profiles: ["Standard", "Dysleksja"],
    tasks: "7 zadań",
    date: "27.06.2026",
    status: "Gotowe",
  },
];

export default function HistoriaPage() {
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
              Historia pracy nauczyciela
            </p>

            <h1 className="text-3xl font-bold tracking-tight text-zinc-50 md:text-4xl">
              Historia generowań
            </h1>

            <p className="text-sm leading-6 text-zinc-400">
              Przeglądaj ostatnio wygenerowane materiały, sprawdzaj ich typ,
              przedmiot, profile uczniów i liczbę zadań.
            </p>
          </div>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        {GENERATION_STATS.map((stat) => (
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
        <div className="flex flex-col gap-4 border-b border-zinc-800 pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-400">
              Lista materiałów
            </p>

            <h2 className="mt-2 text-lg font-semibold text-zinc-50">
              Ostatnie generowania
            </h2>

            <p className="mt-1 text-sm text-zinc-400">
              Na tym etapie widok jest przygotowany wizualnie. Dane z bazy
              podłączymy osobnym krokiem.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:w-[520px]">
            <input
              type="text"
              placeholder="Szukaj po temacie..."
              className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-500 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
            />

            <select
              defaultValue="all"
              className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-zinc-100 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
            >
              <option value="all">Wszystkie typy</option>
              <option value="worksheet">Karta pracy</option>
              <option value="quiz">Kartkówka</option>
              <option value="test">Sprawdzian</option>
            </select>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          {HISTORY_ITEMS.map((item) => (
            <article
              key={item.id}
              className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 transition hover:border-zinc-700 hover:bg-zinc-900"
            >
              <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
                <div className="min-w-0 space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-3 py-1 text-xs font-medium text-sky-200">
                      {item.type}
                    </span>

                    <span className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-400">
                      {item.subject}
                    </span>

                    <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-200">
                      {item.status}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-zinc-50">
                      {item.title}
                    </h3>

                    <p className="mt-1 text-sm text-zinc-400">
                      {item.tasks} · {item.date}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {item.profiles.map((profile) => (
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
                    PDF
                  </button>

                  <button
                    type="button"
                    className="rounded-xl border border-zinc-700 px-4 py-2.5 text-sm font-medium text-zinc-200 transition hover:border-zinc-500 hover:bg-zinc-800"
                  >
                    DOCX
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-sky-500/20 bg-sky-500/10 p-6">
        <h2 className="text-sm font-semibold text-sky-100">
          Docelowo w tym miejscu
        </h2>

        <p className="mt-2 max-w-3xl text-sm leading-6 text-sky-100/80">
          Historia będzie pobierana z bazy danych i pozwoli nauczycielowi
          wracać do wygenerowanych materiałów, pobierać je ponownie oraz
          filtrować według przedmiotu, typu materiału i profili uczniów.
        </p>
      </section>
    </div>
  );
}
