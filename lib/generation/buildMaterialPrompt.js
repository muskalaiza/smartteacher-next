import { taskTypeSchemas } from "./taskTypeSchemas";
import { buildTaskTypeRules } from "./buildTaskTypeRules";

/* =========================
   PROMPT
========================= */

export function buildMaterialPrompt({
  topic,
  type,
  profile = "Standard",
  taskPlan,
  ragContext,
  shouldGenerateGlossary
}) {
  const taskTypeRules = buildTaskTypeRules(taskTypeSchemas);

  const selectedProfiles = String(profile)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  const shouldGenerateAdhdSupport =
    selectedProfiles.includes("ADHD");

  const adhdSupportRules = shouldGenerateAdhdSupport
    ? `
==================================================
WSPARCIE MERYTORYCZNE DLA PROFILU ADHD

Dla każdego zadania przygotuj merytoryczne pole "adhdSupport".

ZASADY:
1. "focus" wskazuje jeden konkretny mechanizm merytoryczny danego zadania.
2. "steps" zawiera dokładnie 2 krótkie kroki merytoryczne.
3. Każdy krok odnosi się do danych, kodu, pojęcia, warunku lub wymagania z zadania.
4. Nie powtarzaj polecenia i nie twórz kroków ogólnych typu:
   "Przeczytaj zadanie", "Zastanów się", "Wybierz odpowiedź"
   lub "Zapisz rozwiązanie".
5. Kroki pokazują metodę działania, ale nie podają poprawnej odpowiedzi
   ani gotowego rozwiązania.
6. "checkpoint" sprawdza jeden konkretny typowy błąd związany z zadaniem.
7. Wsparcie korzysta wyłącznie z treści zadania
   i BIEŻĄCEGO KONTEKSTU MERYTORYCZNEGO.
`
    : "";

  const glossaryRules = shouldGenerateGlossary
    ? `
==================================================
SŁOWNICZEK DLA UCZNIA OBCOJĘZYCZNEGO

1. Dodaj wyłącznie terminy techniczne rzeczywiście użyte w materiale.
2. Pole "term" zawiera termin w języku polskim.
3. Pole "translation" zawiera tłumaczenie na język ukraiński.
4. Pole "explanation" zawiera krótkie wyjaśnienie w języku ukraińskim.
5. Wyjaśnienia muszą być jednoznaczne i odpowiednie dla ucznia szkoły średniej.
6. Nie tłumaczaj elementów składni języka programowania,
   które powinny pozostać w oryginalnej formie.
`
    : "";

  return `
Jesteś nauczycielem informatyki w szkole średniej
i ekspertem dydaktyki.

Twoim zadaniem jest wygenerowanie kompletnego materiału
dydaktycznego dla ucznia.

TEMAT: ${topic}
FORMA DOKUMENTU: ${type}
LICZBA ZADAŃ: ${taskPlan.length}
PROFIL UCZNIA: ${profile}

==================================================
PLAN ZADAŃ

Wygeneruj zadania dokładnie w podanej kolejności
i zgodnie z przypisanymi podtypami:

${JSON.stringify(taskPlan, null, 2)}

==================================================
BIEŻĄCY KONTEKST MERYTORYCZNY

Korzystaj wyłącznie z poniższych zasobów podczas tworzenia zadań:

${ragContext}

==================================================
WYMAGANIA DLA TYPÓW ZADAŃ

${taskTypeRules}

==================================================
ZASADY OGÓLNE

1. Wygeneruj dokładnie ${taskPlan.length} zadań zgodnie
   z kolejnością w PLANIE ZADAŃ.
2. Wygeneruj neutralny bazowy zestaw zadań dla całej klasy.
3. Treść zadań musi pozostać wspólna dla wszystkich profili uczniów.
4. Profil ADHD wpływa wyłącznie na pole "adhdSupport".
5. Nie zmieniaj z powodu profilu ADHD treści ani poziomu zadania.
6. Pozostałe profile zostaną obsłużone wyłącznie
   przez renderery aplikacji.
7. Zadania muszą być poprawne merytorycznie,
   krótkie, precyzyjne i jednoznaczne.
8. Używaj poprawnej składni języka programowania
   właściwego dla tematu.
9. Każde zadanie ma wymagać od ucznia jednej głównej akcji.
10. Nie podawaj rozwiązania ani poprawnej odpowiedzi
    w treści przeznaczonej dla ucznia.

${adhdSupportRules}

${glossaryRules}
`;
}
