import Link from "next/link";

const SUBJECT_LABELS = {
  informatyka: "Informatyka",
  programowanie_obiektowe: "Programowanie obiektowe",
  aplikacje_mobilne: "Aplikacje mobilne",
  aplikacje_desktopowe: "Aplikacje desktopowe",
  bazy_danych: "Bazy danych",
  aplikacje_internetowe: "Aplikacje internetowe",
};

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

function getSubjectLabel(subjectKey) {
  if (!subjectKey) {
    return "Nie wybrano przedmiotu";
  }

  return SUBJECT_LABELS[subjectKey] || subjectKey.replaceAll("_", " ");
}

export default async function SubjectGeneratorPage({ params }) {
  const resolvedParams = await params;
  const subjectKey = resolvedParams?.subjectKey;
  const subjectLabel = getSubjectLabel(subjectKey);

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
                  Określ zakres materiału
                </h2>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label
                    htmlFor="section"
                    className="text-sm font-semibold text-zinc-100"
                  >
                    Dział
                  </label>

                  <select
                    id="section"
                    defaultValue=""
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-zinc-100 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                  >
                    <option value="" disabled>
                      Wybierz dział
                    </option>
                    <option value="algorytmika">Algorytmika</option>
                    <option value="programowanie">Programowanie</option>
                  </select>

                  <p className="text-xs text-zinc-500">
                    Dział określa główny zakres materiału, np. dla sprawdzianu.
                  </p>
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="subtopic"
                    className="text-sm font-semibold text-zinc-100"
                  >
                    Temat lekcji
                  </label>

                  <select
                    id="subtopic"
                    defaultValue=""
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-zinc-100 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                  >
                    <option value="" disabled>
                      Wybierz temat lekcji
                    </option>
                    <option value="prog_zmienne">Zmienne</option>
                    <option value="prog_typy_danych">Typy danych</option>
                    <option value="prog_warunki">Instrukcje warunkowe</option>
                    <option value="prog_petla_for">Pętla for</option>
                    <option value="prog_petla_while">Pętla while</option>
                    <option value="prog_funkcje">Funkcje</option>
                    <option value="prog_tablice">Tablice</option>
                    <option value="alg_systemy_pozycyjne">Systemy pozycyjne</option>
                    <option value="alg_system_binarny">System binarny</option>
                    <option value="alg_konwersja_bin_dec">
                      Konwersja binarna na dziesiętną
                    </option>
                    <option value="alg_konwersja_dec_bin">
                      Konwersja dziesiętna na binarną
                    </option>
                    <option value="alg_reprezentacja_algorytmow">
                      Reprezentacja algorytmów
                    </option>
                    <option value="alg_lista_krokow">Lista kroków</option>
                    <option value="alg_schemat_blokowy">Schemat blokowy</option>
                    <option value="alg_pseudokod">Pseudokod</option>
                  </select>

                  <p className="text-xs text-zinc-500">
                    Temat lekcji będzie wymagany dla karty pracy i kartkówki.
                  </p>
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
                  {MATERIAL_TYPES.map((type, index) => (
                    <label
                      key={type.value}
                      className="flex cursor-pointer gap-3 rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 transition hover:border-zinc-700 hover:bg-zinc-900"
                    >
                      <input
                        type="radio"
                        name="materialType"
                        defaultChecked={index === 0}
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
                  <label
                    htmlFor="taskCount"
                    className="text-sm font-semibold text-zinc-100"
                  >
                    Ilość zadań
                  </label>

                  <select
                    id="taskCount"
                    defaultValue="5"
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-zinc-100 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                  >
                    <option value="5">5 zadań</option>
                    <option value="6">6 zadań</option>
                    <option value="7">7 zadań</option>
                  </select>
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
