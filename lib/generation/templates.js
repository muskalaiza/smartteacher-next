/* =========================
   SZABLONY DYDAKTYCZNE
========================= */
export const templates = {
  "karta pracy": {
    podstawowy: [
    "closed_single",  // 1. Rozpoznaj mechanizm
    "match_pair",     // 2. Uporządkuj pojęcia / elementy
    "match_fill",     // 3. Uzupełnij brakujący krok
    "error_find",     // 4. Znajdź błąd lub konsekwencję
    "open_explain"    // 5. Wyjaśnij działanie / przewidź wynik
    ],

    średni: [
      "closed_single",  // 1. Rozpoznaj mechanizm
    "match_pair",     // 2. Uporządkuj pojęcia / elementy
    "match_fill",     // 3. Uzupełnij brakujący krok
    "error_find",     // 4. Znajdź błąd lub konsekwencję
    "open_explain",   // 5. Wyjaśnij działanie
    "open_code"       // 6. Zastosuj mechanizm w krótkim kodzie
    ],

    zaawansowany: [
       "closed_single",  // 1. Rozpoznaj mechanizm
    "match_pair",     // 2. Uporządkuj pojęcia / elementy
    "match_fill",     // 3. Uzupełnij brakujący krok
    "error_find",     // 4. Znajdź błąd lub konsekwencję
    "open_explain",   // 5. Wyjaśnij działanie
    "open_code",      // 6. Zastosuj mechanizm
    "open_explain"    // 7. Podsumuj / uzasadnij rozwiązanie
    ]
  },

  "kartkówka": {
    podstawowy: [
      "closed_single",
      "closed_tf",
      "match_pair",
      "match_fill",
      "error_find"
    ],

    średni: [
      "error_find",
      "closed_single",
      "match_pair",
      "match_fill",
      "open_explain",
      "open_code"
    ],

    zaawansowany: [
      "open_explain",
      "open_code",
      "error_find",
      "match_fill",
      "match_pair",
      "open_code",
      "open_explain"
    ]
  },

  "sprawdzian": {
    podstawowy: [
      "closed_single",
      "closed_tf",
      "match_fill",
      "match_pair",
      "error_find"
    ],

    średni: [
      "error_find",
      "closed_single",
      "match_pair",
      "match_fill",
      "open_explain",
      "open_code"
    ],

    zaawansowany: [
      "error_find",
      "match_pair",
      "match_fill",
      "open_explain",
      "open_code",
      "open_explain",
      "open_code"
    ]
  }
};