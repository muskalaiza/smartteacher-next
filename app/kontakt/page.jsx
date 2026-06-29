"use client";

import Link from "next/link";

const CONTACT_REASONS = [
  "Pytanie o SmartTeacher",
  "Feedback po testach",
  "Problem techniczny",
  "Współpraca",
  "Inna sprawa",
];

export default function KontaktPage() {
  function handleSubmit(event) {
    event.preventDefault();
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
          <p className="text-sm font-medium text-sky-400">Kontakt</p>

          <h1 className="text-3xl font-bold tracking-tight text-zinc-50 md:text-4xl">
            Napisz do mnie
          </h1>

          <p className="text-sm leading-6 text-zinc-400">
            Masz pytanie, zauważyłaś/eś problem albo chcesz przekazać feedback
            po pracy ze SmartTeacher? Wyślij wiadomość przez formularz.
          </p>
        </div>
      </header>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-6 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-5 md:grid-cols-2">
              <div className="space-y-2">
                <label
                  htmlFor="name"
                  className="text-sm font-semibold text-zinc-100"
                >
                  Imię i nazwisko
                </label>

                <input
                  id="name"
                  type="text"
                  placeholder="np. Anna Kowalska"
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-500 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="email"
                  className="text-sm font-semibold text-zinc-100"
                >
                  Adres e-mail
                </label>

                <input
                  id="email"
                  type="email"
                  placeholder="np. anna@email.pl"
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-500 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                />
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div className="space-y-2">
                <label
                  htmlFor="role"
                  className="text-sm font-semibold text-zinc-100"
                >
                  Kim jesteś?
                </label>

                <input
                  id="role"
                  type="text"
                  placeholder="np. nauczyciel informatyki"
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-500 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="reason"
                  className="text-sm font-semibold text-zinc-100"
                >
                  Temat wiadomości
                </label>

                <select
                  id="reason"
                  defaultValue=""
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-zinc-100 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                >
                  <option value="" disabled>
                    Wybierz temat
                  </option>

                  {CONTACT_REASONS.map((reason) => (
                    <option key={reason} value={reason}>
                      {reason}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="message"
                className="text-sm font-semibold text-zinc-100"
              >
                Wiadomość
              </label>

              <textarea
                id="message"
                rows={8}
                placeholder="Opisz krótko, w czym mogę pomóc..."
                className="w-full resize-none rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm leading-6 text-zinc-100 outline-none transition placeholder:text-zinc-500 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
              />
            </div>

            <label className="flex gap-3 rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 text-sm leading-6 text-zinc-300">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 rounded border-zinc-600 bg-zinc-900 accent-sky-500"
              />

              <span>
                Wyrażam zgodę na kontakt zwrotny w sprawie przesłanej
                wiadomości.
              </span>
            </label>

            <div className="flex flex-col gap-3 border-t border-zinc-800 pt-6 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs leading-5 text-zinc-500">
                Formularz jest przygotowany wizualnie. Wysyłkę wiadomości
                podłączymy w kolejnym kroku.
              </p>

              <button
                type="submit"
                className="rounded-xl bg-sky-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
              >
                Wyślij wiadomość
              </button>
            </div>
          </form>
        </section>

        <aside className="space-y-4">
          <section className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-400">
              W czym mogę pomóc?
            </p>

            <h2 className="mt-2 text-lg font-semibold text-zinc-50">
              Najczęstsze sprawy
            </h2>

            <ul className="mt-4 space-y-3 text-sm text-zinc-300">
              <li className="flex gap-3">
                <span className="text-sky-400">•</span>
                <span>zgłoszenie błędu w działaniu aplikacji,</span>
              </li>
              <li className="flex gap-3">
                <span className="text-sky-400">•</span>
                <span>feedback po wygenerowaniu materiału,</span>
              </li>
              <li className="flex gap-3">
                <span className="text-sky-400">•</span>
                <span>pytania dotyczące testów SmartTeacher,</span>
              </li>
              <li className="flex gap-3">
                <span className="text-sky-400">•</span>
                <span>propozycje współpracy lub pilotażu.</span>
              </li>
            </ul>
          </section>

          <section className="rounded-2xl border border-sky-500/20 bg-sky-500/10 p-6">
            <h2 className="text-sm font-semibold text-sky-100">
              Dla nauczycieli
            </h2>

            <p className="mt-2 text-sm leading-6 text-sky-100/80">
              Najbardziej wartościowy feedback to konkret: jaki materiał był
              generowany, czego brakowało i czy dało się go użyć na lekcji.
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}

