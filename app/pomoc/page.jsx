"use client";

import Link from "next/link";

const QUICK_START_STEPS = [
  {
    title: "Wybierz przedmiot",
    description: "Po zalogowaniu wybierz przedmiot, dla którego chcesz przygotować materiał.",
  },
  {
    title: "Ustaw typ materiału",
    description: "Wybierz kartę pracy, kartkówkę albo sprawdzian.",
  },
  {
    title: "Wybierz profile uczniów",
    description: "Zaznacz profile, dla których materiał ma być przygotowany w odpowiedniej formie.",
  },
  {
    title: "Wygeneruj i pobierz",
    description: "Po wygenerowaniu skorzystaj z wersji do wydruku, PDF albo DOCX.",
  },
];

const MATERIAL_TYPES = [
  {
    title: "Karta pracy",
    description: "Materiał do pracy z uczniami podczas lekcji.",
  },
  {
    title: "Kartkówka",
    description: "Krótka forma sprawdzająca z jednego tematu.",
  },
  {
    title: "Sprawdzian",
    description: "Zestaw zadań z wybranego działu.",
  },
];

const FAQ_ITEMS = [
  {
    question: "Czy materiał można pobrać jako PDF?",
    answer: "Tak. Docelowo materiały będą dostępne do wydruku oraz pobrania jako PDF.",
  },
  {
    question: "Czy materiał można pobrać jako DOCX?",
    answer: "Tak. SmartTeacher obsługuje eksport do edytowalnego dokumentu Word.",
  },
  {
    question: "Czy profile uczniów zmieniają zakres zadań?",
    answer:
      "Nie. Zakres merytoryczny pozostaje wspólny, a różnicowanie dotyczy sposobu prezentacji materiału.",
  },
  {
    question: "Gdzie znajdę wcześniej wygenerowane materiały?",
    answer:
      "Ostatnie generowania znajdziesz w Historii, a zapisane materiały w Bibliotece materiałów.",
  },
];

export default function PomocPage() {
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
          <p className="text-sm font-medium text-sky-400">Centrum pomocy</p>

          <h1 className="text-3xl font-bold tracking-tight text-zinc-50 md:text-4xl">
            Jak korzystać ze SmartTeacher?
          </h1>

          <p className="text-sm leading-6 text-zinc-400">
            Szybki przewodnik dla nauczyciela: jak rozpocząć pracę, wygenerować
            materiał, wrócić do historii i skorzystać z biblioteki.
          </p>
        </div>
      </header>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <section className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-6 shadow-sm">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-400">
                Szybki start
              </p>

              <h2 className="mt-2 text-lg font-semibold text-zinc-50">
                Wygeneruj pierwszy materiał w 4 krokach
              </h2>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {QUICK_START_STEPS.map((step, index) => (
                <article
                  key={step.title}
                  className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5"
                >
                  <div className="flex items-start gap-4">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky-500 text-sm font-bold text-white">
                      {index + 1}
                    </span>

                    <div>
                      <h3 className="text-sm font-semibold text-zinc-50">
                        {step.title}
                      </h3>

                      <p className="mt-2 text-sm leading-6 text-zinc-400">
                        {step.description}
                      </p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-6 shadow-sm">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-400">
                Typy materiałów
              </p>

              <h2 className="mt-2 text-lg font-semibold text-zinc-50">
                Co możesz przygotować?
              </h2>

              <p className="mt-2 text-sm leading-6 text-zinc-400">
                Każdy materiał zawiera część dla ucznia oraz sekcję dla
                nauczyciela: klucz odpowiedzi, punktację i skalę ocen.
              </p>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {MATERIAL_TYPES.map((type) => (
                <article
                  key={type.title}
                  className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 transition hover:border-zinc-700 hover:bg-zinc-900"
                >
                  <h3 className="text-sm font-semibold text-zinc-50">
                    {type.title}
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-zinc-400">
                    {type.description}
                  </p>
                </article>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-6 shadow-sm">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-400">
                Najczęstsze pytania
              </p>

              <h2 className="mt-2 text-lg font-semibold text-zinc-50">
                FAQ
              </h2>
            </div>

            <div className="mt-6 space-y-3">
              {FAQ_ITEMS.map((item) => (
                <article
                  key={item.question}
                  className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5"
                >
                  <h3 className="text-sm font-semibold text-zinc-50">
                    {item.question}
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-zinc-400">
                    {item.answer}
                  </p>
                </article>
              ))}
            </div>
          </section>
        </div>

        <aside className="space-y-4">
          <section className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-400">
              Gdzie czego szukać?
            </p>

            <div className="mt-5 space-y-4 text-sm text-zinc-300">
              <div>
                <h3 className="font-semibold text-zinc-50">Generator</h3>
                <p className="mt-1 leading-6 text-zinc-400">
                  Tworzenie nowych kart pracy, kartkówek i sprawdzianów.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-zinc-50">Historia</h3>
                <p className="mt-1 leading-6 text-zinc-400">
                  Przegląd ostatnio wygenerowanych materiałów.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-zinc-50">Biblioteka</h3>
                <p className="mt-1 leading-6 text-zinc-400">
                  Miejsce na zapisane materiały do ponownego użycia.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-zinc-50">Kontakt</h3>
                <p className="mt-1 leading-6 text-zinc-400">
                  Formularz do zgłoszenia problemu, pytania lub feedbacku.
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-sky-500/20 bg-sky-500/10 p-6">
            <h2 className="text-sm font-semibold text-sky-100">
              Potrzebujesz pomocy?
            </h2>

            <p className="mt-2 text-sm leading-6 text-sky-100/80">
              Najlepiej opisz konkretny materiał: przedmiot, typ pracy, temat i
              co dokładnie wymaga poprawy.
            </p>

            <Link
              href="/kontakt"
              className="mt-5 inline-flex w-full items-center justify-center rounded-xl bg-sky-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
            >
              Przejdź do kontaktu
            </Link>
          </section>
        </aside>
      </section>
    </div>
  );
}
