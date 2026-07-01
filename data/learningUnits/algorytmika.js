export const algorytmikaUnits = [
/*
 PODTEMAT: SYSTEMY LICZBOWE - OGÓLNE (Dla: closed_single, closed_tf, match_pair, open_explain)
   ======================================================================== */
{
  id: "ALG.NUM.PP.CONCEPT.01",
  topic: "algorytmy",
  subtopic: "sys_pozycyjne",
  curriculum_level: "PP",
  type: "concept",
  taskSubtypes: ["closed_single", "closed_tf", "match_fill", "match_pair", "open_explain"],
  content: {
  definition: "System liczbowy określa sposób zapisu liczb przy użyciu określonej podstawy (np. 2, 10, 16). Najczęściej wykorzystywany jest system pozycyjny.",
tip: [
  {
    title: "Wartość liczby w systemie pozycyjnym",
    text: "Wartość każdej cyfry zależy od jej pozycji. Pozycje numeruje się od prawej strony, zaczynając od zera.",
    code: "(aₙ...a₂a₁a₀)ₚ = aₙ·pⁿ + ... + a₂·p² + a₁·p¹ + a₀·p⁰"
  },
  {
    title: "Cyfry dozwolone w systemie o podstawie p",
    text: "W systemie o podstawie p można używać cyfr o wartościach od 0 do p − 1.",
    code: "system binarny: 0, 1\nsystem dziesiętny: 0–9\nsystem szesnastkowy: 0–9, A–F"
  }
],
  // Bank unikalnych pojęć ogólnych o systemach pozycyjnych i ich podstawach
    raw: [
      { term: "Podstawa systemu", desc: "Liczba unikalnych cyfr używanych w danym systemie, decydująca o wartości wag pozycji." },
      { term: "System pozycyjny", desc: "Metoda zapisu, w której wartość cyfry zależy bezpośrednio od zajmowanego przez nią miejsca." },
      { term: "System binarny", desc: "System o podstawie 2, wykorzystujący wyłącznie cyfry 0 oraz 1." },
      { term: "System dziesiętny", desc: "System o podstawie 10, używający cyfr od 0 do 9, będący standardem w codziennym życiu." },
      { term: "System szesnastkowy", desc: "System o podstawie 16, w którym cyfry od 10 do 15 są reprezentowane przez litery A-F." },
      { term: "Waga pozycji", desc: "Wartość, przez którą mnoży się cyfrę, równa podstawie systemu podniesionej do potęgi indeksu pozycji." },
      { term: "Cyfra A w systemie hex", desc: "Reprezentuje wartość dziesiętną równą 10." },
      { term: "Cyfra F w systemie hex", desc: "Reprezentuje najwyższą pojedynczą wartość cyfrową, czyli 15." },
      { term: "Notacja indeksowa", desc: "Zapis dolny przy liczbie wskazujący bazę systemu, na przykład zapis typu: 1010₂." },
      { term: "System niedwójkowy", desc: "Dowolny system liczbowy, którego podstawa (baza) jest różna od liczby dwa." },
    ]
  }
},
{
  id: "ALG.NUM.PP.TASK.02",
  topic: "algorytmy",
  subtopic: "sys_pozycyjne",
  curriculum_level: "PP",
  type: "task",
  taskSubtypes: ["closed_single", "closed_tf", "match_fill", "open_explain"],
  content: {
    definition: "",
    // Bank 10 unikalnych i różnorodnych konwersji między systemami (BIN, DEC, HEX)
    raw: [
      { expr: "1010₂ = 10₁₀", base: 2, target: 10, equation: "1·2³ + 0·2² + 1·2¹ + 0·2⁰ = 8 + 0 + 2 + 0" },
      { expr: "A₁₆ = 10₁₀", base: 16, target: 10, equation: "10 · 16⁰ = 10 · 1" },
      { expr: "9₁₀ = 1001₂", base: 10, target: 2, equation: "9 / 2 = 4 r 1, 4 / 2 = 2 r 0, 2 / 2 = 1 r 0, 1 / 2 = 0 r 1" },
      { expr: "125₁₀ = 125", base: 10, target: 10, equation: "1·10² + 2·10¹ + 5·10⁰ = 100 + 20 + 5" },
      { expr: "1F₁₆ = 31₁₀", base: 16, target: 10, equation: "1·16¹ + 15·16⁰ = 16 + 15" },
      { expr: "11₂ = 3₁₀", base: 2, target: 10, equation: "1·2¹ + 1·2⁰ = 2 + 1" },
      { expr: "10₁₆ = 16₁₀", base: 16, target: 10, equation: "1·16¹ + 0·16⁰ = 16 + 0" },
      { expr: "7₁₀ = 111₂", base: 10, target: 2, equation: "7 / 2 = 3 r 1, 3 / 2 = 1 r 1, 1 / 2 = 0 r 1" },
      { expr: "FF₁₆ = 255₁₀", base: 16, target: 10, equation: "15·16¹ + 15·16⁰ = 240 + 15" },
      { expr: "100₂ = 4₁₀", base: 2, target: 10, equation: "1·2² + 0·2¹ + 0·2⁰ = 4 + 0 + 0" },
    ]
  }
},
{
  id: "ALG.NUM.PP.ERROR.03",
  topic: "algorytmy",
  subtopic: "sys_pozycyjne",
  curriculum_level: "PP",
  type: "error",
  taskSubtypes: ["error_find", "closed_tf", "open_explain"],
  content: {
    definition: "",
    // Bank 10 unikalnych, rzeczywistych błędów do zadań typu error_find
    raw: [
      { bad_expr: "1010₂ = 1010₁₀", fix: "Mylenie zapisu binarnego z dziesiętnym. Liczba binarna 1010 to w systemie dziesiętnym 10, a nie tysiąc dziesięć.", error_type: "Tożsamość baz" },
      { bad_expr: "19₁₀ = 19₂", fix: "W systemie binarnym nie istnieje cyfra 9. Dozwolone znaki to wyłącznie 0 i 1.", error_type: "Nielegalna cyfra w bazie" },
      { bad_expr: "125₁₀ = 1 * 10² + 2 * 10¹ + 5 * 10²", fix: "Błędna waga ostatniej pozycji. Powinno być 5 * 10⁰, ponieważ indeksy wag zaczynają się od zera.", error_type: "Błędny wykładnik potęgi" },
      { bad_expr: "ABC₁₆ = 10 * 16² + 11 * 16¹ + 13 * 16⁰ = 2560 + 176 + 13 = 2749", fix: "Błąd w podstawieniu wartości litery C. W systemie szesnastkowym C odpowiada wartości 12, obliczenia są poprawne, ale C to 12.", error_type: "Wartość litery w HEX" },
      { bad_expr: "1A₁₆ = 1 * 16¹ + 10 * 16⁰ = 16 + 110 = 126", fix: "Zapis matematyczny jest poprawny, ale końcowa konwersja przypisuje zły wynik ogólny (np. przepisanie jako 110).", error_type: "Błąd interpretacji" },
      { bad_expr: "Zapis liczby szesnastkowej: G1₂", fix: "Litera G nie występuje w systemie szesnastkowym, zakres liter kończy się na F (15). dodatkowo indeks dolny wskazuje na binarny.", error_type: "Konflikt indeksu i alfabetu" },
      { bad_expr: "101₂ ma taką samą wartość jak 101₁₆", fix: "Zrównanie wartości ze względu na identyczny układ cyfr, ignorując całkowicie podstawę systemu wagowego.", error_type: "Ignorowanie bazy systemu" },
      { bad_expr: "10₂ * 10₂ = 100₁₀", fix: "Wynik mnożenia dwóch liczb binarnych zapisano bezpośrednio w formacie bazy dziesiętnej bez przeliczenia.", error_type: "Złe oznaczenie bazy wyniku" },
      { bad_expr: "Wartość pozycji liczby szesnastkowej rośnie od lewej do prawej", fix: "W systemach pozycyjnych wagi rosną odwrotnie - zawsze od prawej strony ku lewej.", error_type: "Błędny kierunek wzrostu wag" },
      { bad_expr: "Liczba szesnastkowa B to wartość 13", fix: "W systemie HEX litera A=10, a litera B=11. Wartość 13 odpowiada literze D.", error_type: "Złe mapowanie litery" },
    ]
  }
},
{
  id: "ALG.NUM.PP.STRUCTURE.04",
  topic: "algorytmy",
  subtopic: "sys_pozycyjne",
  curriculum_level: "PP",
  type: "structure",
  taskSubtypes: ["match_pair",  "match_fill", "open_explain", "open_code"],
  content: {
    definition: "",
    // Bank kroków algorytmicznych dla: open_code, open_explain, match_pair
    raw: [
      { step: "Konwersja BIN→DEC", action: "Zapisz cyfry, przypisz im potęgi liczby 2 od prawej strony, oblicz iloczyny i zsumuj wyniki." },
      { step: "Konwersja DEC→BIN", action: "Dziel liczbę sukcesywnie przez 2, zapisuj reszty z dzielenia, a ostateczny wynik odczytaj od końca." },
      { step: "Konwersja HEX→DEC", action: "Zamień litery na wartości dziesiętne (A-F), pomnóż przez odpowiednie potęgi 16 i zsumuj." },
      { step: "Inicjalizacja pętli", action: "Przygotuj zmienną przechowującą aktualną wagę pozycji (np. weight = 1) oraz sumator wyniku (sum = 0)." },
      { step: "Aktualizacja wagi", action: "W każdej iteracji algorytmu pomnóż aktualną wagę pozycji przez podstawę przetwarzanego systemu." },
      { step: "Pobieranie cyfry", action: "Wydziel ostatnią cyfrę liczby za pomocą operacji wyznaczania reszty z dzielenia przez 10 (modulo 10)." },
      { step: "Warunek pętli DEC", action: "Wykonuj operację dzielenia całkowitego liczby przez 2 dopóki wartość wejściowa jest większa od zera." },
      { step: "Obsługa liter HEX", action: "Zaimplementuj warunek sprawdzający, czy znak ascii należy do przedziału 'A'-'F', aby dodać przesunięcie o 10." },
      { step: "Wyznaczenie reszty", action: "Operacja 'liczba % podstawa' dostarcza kolejną cyfrę od końca dla nowo budowanego systemu." },
      { step: "Odwrócenie ciągu", action: "Po zakończeniu cyklu dzielenia dziesiętnego należy odwrócić zebrane reszty, by uzyskać poprawny zapis." },
    ]
  }
},

/* ========================================================================
   PODTEMAT: SYSTEM BINARNY - OGÓLNIE (Dla: closed_single, closed_tf, match_pair, open_explain)
   ======================================================================== */
{
  id: "ALG.BIN.PP.CONCEPT.01",
  topic: "algorytmy",
  subtopic: "sys_binarny",
  curriculum_level: "PP",
  type: "concept",
  taskSubtypes: ["closed_single", "closed_tf",  "match_fill", "match_pair", "open_explain"],
  content: {
    definition: "System binarny (dwójkowy) to system liczbowy o podstawie 2 wykorzystujący cyfry 0 i 1. Cyfry te są pojedynczymi bitami. System ten jest fundamentem technologii cyfrowej, informatyki i elektroniki.",   
tip: [
  {
    title: "Zapis liczby w systemie binarnym",
    text: "Liczba binarna składa się wyłącznie z bitów 0 i 1. Indeks dolny 2 oznacza podstawę systemu.",
    code: "(bₙ...b₂b₁b₀)₂, gdzie bᵢ ∈ {0, 1}"
  },
  {
    title: "Wagi pozycji bitów",
    text: "Pozycje numeruje się od prawej strony, zaczynając od zera. Skrajny prawy bit to LSB, a skrajny lewy bit to MSB.",
    code: "pozycja:  n  ...  3   2   1   0\nwaga:     2ⁿ  ...  2³  2²  2¹  2⁰\n          MSB              LSB"
  }
],
    // Bank 10 unikalnych pojęć i definicji teoretycznych z systemu binarnego
    raw: [
      { term: "Bit", desc: "Najmniejsza jednostka informacji, przyjmuje wartość 0 lub 1." },
      { term: "Podstawa systemu", desc: "W systemie binarnym wynosi zawsze 2." },
      { term: "Pozycja cyfry (indeks)", desc: "Wyznacza wykładnik potęgi liczby 2, będący wagą danej cyfry." },
      { term: "Najmłodszy bit (LSB)", desc: "Bit po skrajnie prawej stronie o najmniejszej wadze (2⁰)." },
      { term: "Najstarszy bit (MSB)", desc: "Bit po skrajnie lewej stronie o najwyższej wadze w danym ciągu." },
      { term: "Bajt", desc: "Podstawowa jednostka pamięci składająca się z 8 bitów." },
      { term: "Sygnał niski (0)", desc: "W elektronice cyfrowej oznacza brak napięcia lub stan logiczny False." },
      { term: "Sygnał wysoki (1)", desc: "W elektronice cyfrowej oznacza obecność napięcia lub stan logiczny True." },
      { term: "Zbiór znaków binarnego", desc: "Dozwolone symbole matematyczne w systemie dwójkowym: {0, 1}." },
      { term: "Wartość pozycji", desc: "Kolejna potęga liczby 2, przez którą mnożona jest cyfra na danej pozycji." },
    ]
  }
},

{
  id: "ALG.BIN.PP.TASK.02",
  topic: "algorytmy",
  subtopic: "sys_binarny",
  curriculum_level: "PP",
  type: "task",
 taskSubtypes: ["closed_single", "closed_tf", "match_fill", "open_explain"],
  content: {
    definition: "",
    // Bank 10 unikalnych rozwinięć pozycyjnych i najwyższych potęg
    raw: [
      { bin: "1011", dec: 11, max_power: 3, equation: "2³·1 + 2²·0 + 2¹·1 + 2⁰·1 = 8 + 0 + 2 + 1" },
      { bin: "1111", dec: 15, max_power: 3, equation: "2³·1 + 2²·1 + 2¹·1 + 2⁰·1 = 8 + 4 + 2 + 1" },
      { bin: "1001", dec: 9,  max_power: 3, equation: "2³·1 + 2²·0 + 2¹·0 + 2⁰·1 = 8 + 0 + 0 + 1" },
      { bin: "1101", dec: 13, max_power: 3, equation: "2³·1 + 2²·1 + 2¹·0 + 2⁰·1 = 8 + 4 + 0 + 1" },
      { bin: "10100", dec: 20, max_power: 4, equation: "2⁴·1 + 2³·0 + 2²·1 + 2¹·0 + 2⁰·0 = 16 + 0 + 4 + 0 + 0" },
      { bin: "110", dec: 6, max_power: 2, equation: "2²·1 + 2¹·1 + 2⁰·0 = 4 + 2 + 0" },
      { bin: "1010", dec: 10, max_power: 3, equation: "2³·1 + 2²·0 + 2¹·1 + 2⁰·0 = 8 + 0 + 2 + 0" },
      { bin: "111", dec: 7, max_power: 2, equation: "2²·1 + 2¹·1 + 2⁰·1 = 4 + 2 + 1" },
      { bin: "10001", dec: 17, max_power: 4, equation: "2⁴·1 + 2³·0 + 2²·0 + 2¹·0 + 2⁰·1 = 16 + 0 + 0 + 0 + 1" },
      { bin: "1110", dec: 14, max_power: 3, equation: "2³·1 + 2²·1 + 2¹·1 + 2⁰·0 = 8 + 4 + 2 + 0" },
    ]
  }
},

{
  id: "ALG.BIN.PP.ERROR.03",
  topic: "algorytmy",
  subtopic: "sys_binarny",
  curriculum_level: "PP",
  type: "error",
 taskSubtypes: ["error_find", "closed_tf", "open_explain"],
  content: {
    definition: "",
    // Bank unikalnych błędów matematycznych i logicznych do error_find
    raw: [
      { bad_expr: "1011₂ = 1·2⁰ + 0·2¹ + 1·2² + 1·2³", fix: "Uczeń policzył potęgi od lewej strony. Wagi należy przypisywać od prawej strony (od najmłodszego bitu).", error_type: "Odwrócona kolejność wag" },
      { bad_expr: "1011₂ = 13", fix: "Błąd w obliczeniu sumy wag pozycji: 8 + 0 + 2 + 1 daje wynik 11, a nie 13.", error_type: "Błąd arytmetyczny" },
      { bad_expr: "Zapis liczby binarnej: 1201₂", fix: "W systemie binarnym nie istnieje cyfra 2. Dozwolone znaki to wyłącznie cyfry 0 i 1.", error_type: "Użycie niedozwolonej cyfry" },
      { bad_expr: "Najwyższa potęga dwójki w liczbie 1111₂ to 2⁴", fix: "Dla liczby 4-cyfrowej pozycje indeksujemy od 0 do 3, więc najwyższa potęga to 2³, a nie 2⁴.", error_type: "Złe określenie potęgi maksymalnej" },
      { bad_expr: "Wartość pozycji bitu wynosi 2 * pozycja (np. dla pozycji 3 waga to 6)", fix: "Wagi pozycji to potęgi liczby 2 (2³ = 8), a nie wynik mnożenia podstawy przez indeks pozycji.", error_type: "Mnożenie zamiast potęgowania" },
      { bad_expr: "100₂ = 2² + 2¹ + 2⁰ = 4 + 2 + 1 = 7", fix: "Uczeń dodał wagi dla wszystkich pozycji, ignorując fakt, że bity 0 oznaczają brak danej wagi (powinno być samo 2² = 4).", error_type: "Dodawanie nieaktywnych wag" },
      { bad_expr: "Dopisanie zera na końcu liczby binarnej (np. z 11₂ na 110₂) nie zmienia jej wartości", fix: "W systemie pozycyjnym przesunięcie cyfr w lewo zmienia ich wagi. W systemie binarnym dopisanie zera na końcu mnoży wartość liczby przez 2.", error_type: "Błędne rozumienie dopisania zera" },
      { bad_expr: "Liczba 0010₂ ma większą wartość niż 0100₂", fix: "Liczba 0100₂ (4) jest większa niż 0010₂ (2), ponieważ jedynka znajduje się na wyższej pozycji wagowej.", error_type: "Zła ocena starszeństwa pozycji" },
      { bad_expr: "101₂ = 1 + 0 + 1 = 2", fix: "Zsumowano same cyfry (bity) zamiast wartości przypisanych im wag pozycyjnych (powinno być 4 + 0 + 1 = 5).", error_type: "Sumowanie samych bitów" },
      { bad_expr: "Liczba binarna składająca się z samych jedynek zawsze reprezentuje liczbę parzystą", fix: "Jeśli ostatnia cyfra od prawej to 1, to liczba jest zawsze nieparzysta, ponieważ dodajemy wagę 2⁰ = 1.", error_type: "Błędna reguła parzystości" },
       { bad_expr: "Waga pierwszej pozycji od prawej w liczbie binarniej wynosi 2¹", fix: "Pierwsza pozycja od prawej ma zawsze wagę 2⁰ (czyli 1).", error_type: "Błąd wagi początkowej" },
    ]
  }
},

{
  id: "ALG.BIN.PP.STRUCTURE.04",
  topic: "algorytmy",
  subtopic: "sys_binarny",
  curriculum_level: "PP",
  type: "structure",
 taskSubtypes: ["match_pair",  "match_fill", "open_explain", "open_code"],
  content: {
    definition: "",
    // Bank 10 unikalnych kroków, struktur i schematów blokowych algorytmu binarnego
    raw: [
      { step: "Krok 1", action: "Zapisz liczbę binarną w czytelny sposób, pozostawiając odstępy między cyframi." },
      { step: "Krok 2", action: "Przypisz potęgi liczby 2 nad każdą cyfrą, zaczynając od prawej strony od wartości 2⁰." },
      { step: "Krok 3", action: "Pomnóż każdą cyfrę (bit) przez odpowiadającą jej wagę pozycji (potęgę dwójki)." },
      { step: "Krok 4", action: "Zsumuj wszystkie otrzymane wyniki iloczynów, aby uzyskać końcową wartość dziesiętną." },
      { step: "Inicjalizacja sumatora", action: "Ustaw zmienną przechowującą ostateczny wynik dziesiętny na wartość początkową 0." },
      { step: "Inicjalizacja bazy wag", action: "Ustaw początkową wagę pozycji na wartość 1 (co odpowiada potędze 2⁰) przed rozpoczęciem pętli." },
      { step: "Iteracja po ciągu", action: "Przechodź przez kolejne cyfry zapisu binarnego od prawej strony do lewej." },
      { step: "Mnożenie wag", action: "W każdym kroku pętli pomnóż aktualną wagę pozycji przez 2, aby przygotować ją dla kolejnego bitu." },
      { step: "Instrukcja warunkowa", action: "Sprawdź, czy aktualnie analizowany bit jest równy 1 – jeśli tak, dodaj bieżącą wagę do sumatora." },
      { step: "Koniec algorytmu", action: "Gdy sprawdzisz już wszystkie bity w ciągu, zwróć ostateczną wartość zgromadzoną w sumatorze." },
    ]
  }
},

/* ========================================================================
   PODTEMAT: KONWERSJA BIN → DEC (Dla: closed_single, closed_tf, match_pair, open_explain)
   ======================================================================== */
{
  id: "ALG.CONV.BD.PP.CONCEPT.01",
  topic: "algorytmy",
  subtopic: "konwersja_bin_dec",
  curriculum_level: "PP",
  type: "concept",
  taskSubtypes: ["closed_single", "closed_tf",  "match_fill", "match_pair", "open_explain"],
  content: {
    definition: "Konwersja z systemu binarnego na dziesiętny polega na sumowaniu odpowiednich potęg liczby 2 (wag pozycji), na których w zapisie dwójkowym stoi cyfra 1.",
tip: [
  {
    title: "Wzór konwersji BIN → DEC",
    text: "Każdy bit mnoży się przez potęgę liczby 2 odpowiadającą jego pozycji. Pozycje numeruje się od prawej strony, zaczynając od zera.",
    code: "(bₙ...b₂b₁b₀)₂ = bₙ·2ⁿ + ... + b₂·2² + b₁·2¹ + b₀·2⁰"
  },
  {
    title: "Schemat przekształcenia",
    text: "Wynik dziesiętny otrzymuje się przez zsumowanie wartości wszystkich pozycji. Bit 0 wnosi do sumy wartość 0, a bit 1 pełną wagę swojej pozycji.",
    code: "1. Ponumeruj bity od prawej strony: 0, 1, 2, ...\n2. Pomnóż każdy bit przez 2 do potęgi jego pozycji.\n3. Zsumuj otrzymane iloczyny.\n4. Zapisz wynik w systemie dziesiętnym."
  }
],
    // Bank 10 unikalnych pojęć i faktów teoretycznych dotyczących konwersji BIN na DEC
    raw: [
      { term: "Konwersja pozycyjna", desc: "Przekształcenie liczby polegające na przemnożeniu jej cyfr przez potęgi bazy systemu źródłowego." },
      { term: "Suma wag aktywnych", desc: "Ostateczny wynik dziesiętny, w którym pomija się pozycje o wartości bitu równej 0." },
      { term: "Wykładnik potęgi 2", desc: "Liczba określająca pozycję bitu, liczona od 0 poczynając od prawej strony." },
      { term: "Wartość bitu 1", desc: "Sygnalizuje, że waga danej pozycji (np. 1, 2, 4, 8) musi zostać dodana do sumy końcowej." },
      { term: "Wartość bitu 0", desc: "Oznacza, że waga danej pozycji jest nieaktywna i jej iloczyn wynosi zero." },
      { term: "Baza konwersji (2)", desc: "Liczba, której kolejne potęgi stanowią mnożniki dla poszczególnych pozycji cyfrowych." },
      { term: "Notacja dziesiętna", desc: "Format docelowy konwersji (podstawa 10), wykorzystujący cyfry arabskie od 0 do 9." },
      { term: "Indeksowanie pozycji", desc: "Przypisywanie liczb całkowitych (0, 1, 2...) kolejnym bitom od prawej strony do lewej." },
      { term: "Mnożnik potęgowy", desc: "Wartość liczbowa (np. 16, 32, 64) przypisana do konkretnego miejsca w ciągu binarnym." },
      { term: "Weryfikacja parzystości", desc: "Zasada mówiąca, że jeśli liczba binarna kończy się na 0, jej odpowiednik dziesiętny jest liczbą parzystą." },
    ]
  }
},
{
  id: "ALG.CONV.BD.PP.TASK.02",
  topic: "algorytmy",
  subtopic: "konwersja_bin_dec",
  curriculum_level: "PP",
  type: "task",
 taskSubtypes: ["closed_single", "closed_tf", "match_fill", "open_explain"],
  content: {
    definition: "",
    // Bank 10 unikalnych i zróżnicowanych przykładów konwersji matematycznych
    raw: [
      { bin: "110", dec: 6, equation: "1·2² + 1·2¹ + 0·2⁰ = 4 + 2 + 0", weights: "4 + 2" },
      { bin: "111", dec: 7, equation: "1·2² + 1·2¹ + 1·2⁰ = 4 + 2 + 1", weights: "4 + 2 + 1" },
      { bin: "100", dec: 4, equation: "1·2² + 0·2¹ + 0·2⁰ = 4 + 0 + 0", weights: "4" },
      { bin: "1011", dec: 11, equation: "1·2³ + 0·2² + 1·2¹ + 1·2⁰ = 8 + 0 + 2 + 1", weights: "8 + 2 + 1" },
      { bin: "1101", dec: 13, equation: "1·2³ + 1·2² + 0·2¹ + 1·2⁰ = 8 + 4 + 0 + 1", weights: "8 + 4 + 1" },
      { bin: "1010", dec: 10, equation: "1·2³ + 0·2² + 1·2¹ + 0·2⁰ = 8 + 0 + 2 + 0", weights: "8 + 2" },
      { bin: "1111", dec: 15, equation: "1·2³ + 1·2² + 1·2¹ + 1·2⁰ = 8 + 4 + 2 + 1", weights: "8 + 4 + 2 + 1" },
      { bin: "1001", dec: 9, equation: "1·2³ + 0·2² + 0·2¹ + 1·2⁰ = 8 + 0 + 0 + 1", weights: "8 + 1" },
      { bin: "10100", dec: 20, equation: "1·2⁴ + 0·2³ + 1·2² + 0·2¹ + 0·2⁰ = 16 + 0 + 4 + 0 + 0", weights: "16 + 4" },
      { bin: "11001", dec: 25, equation: "1·2⁴ + 1·2³ + 0·2² + 0·2¹ + 1·2⁰ = 16 + 8 + 0 + 0 + 1", weights: "16 + 8 + 1" },
    ]
  }
},
{
  id: "ALG.CONV.BD.PP.ERROR.03",
  topic: "algorytmy",
  subtopic: "konwersja_bin_dec",
  curriculum_level: "PP",
  type: "error",
 taskSubtypes: ["error_find", "closed_tf", "open_explain"],
  content: {
    definition: "",
    // Bank 10 unikalnych błędów matematycznych i koncepcyjnych do zadań error_find
    raw: [
      { bad_expr: "110₂ = 1·2⁰ + 1·2¹ = 3", fix: "Przypisano wagi od lewej strony zamiast od prawej. Prawidłowe przypisanie wag da wynik 4 + 2 = 6.", error_type: "Kolejność indeksowania" },
      { bad_expr: "111₂ = 2² + 2⁰ = 5", fix: "Pominięto środkową cyfrę 1 na pozycji o wadze 2¹. Prawidłowe obliczenie to 4 + 2 + 1 = 7.", error_type: "Pominięcie cyfry" },
      { bad_expr: "101₂ = 1·2³ + 0·2² + 1·2¹ = 10", fix: "Rozpoczęto indeksowanie pozycji od potęgi 2¹ zamiast od 2⁰. Liczba 3-cyfrowa ma pozycje 2², 2¹ i 2⁰.", error_type: "Przesunięcie wykładników" },
      { bad_expr: "1001₂ = 2³ + 2⁰ = 6 + 1 = 7", fix: "Błąd arytmetyczny: potęga 2³ wynosi 8, a nie 6. Prawidłowy wynik sumowania to 8 + 1 = 9.", error_type: "Błędna wartość potęgi" },
      { bad_expr: "1010₂ = 2³ + 2² + 2¹ = 8 + 4 + 2 = 14", fix: "Uwzględniono wagę 2² dla pozycji, na której stoi bit 0. Wagi dla bitów zerowych należy pominąć.", error_type: "Dodanie nieaktywnej wagi" },
      { bad_expr: "11₂ = 1 * 2 + 1 * 2 = 4", fix: "Zastosowano stały mnożnik 2 dla każdej pozycji, zapominając o stopniowaniu potęg dwójki (2¹ oraz 2⁰).", error_type: "Brak stopniowania potęg" },
      { bad_expr: "101₂ = 1 + 0 + 1 = 2", fix: "Zsumowano same bity zamiast wartości przypisanych im wag pozycyjnych. Prawidłowo: 4 + 0 + 1 = 5.", error_type: "Zsumowanie samych cyfr" },
      { bad_expr: "1100₂ = 2⁴ + 2³ = 16 + 8 = 24", fix: "Dla liczby 4-cyfrowej najwyższa potęga to 2³, uczeń błędnie przyjął potęgi 2⁴ i 2³.", error_type: "Zawyżenie indeksu początkowego" },
      { bad_expr: "1011₂ = 8 + 0 + 2 + 0 = 10", fix: "Błędnie zinterpretowano ostatni bit jako 0, pomijając wagę 2⁰ = 1 na końcu obliczenia.", error_type: "Błędne odczytanie bitu" },
      { bad_expr: "0101₂ = 1·2³ + 0·2² + 1·2¹ + 0·2⁰ = 8 + 0 + 2 + 0 = 10", fix: "Zaczęto odczytywać liczbę od końca (od prawej do lewej) przypisując wagi odwrotnie do pozycji cyfr.", error_type: "Złe mapowanie kierunku" },
    ]
  }
},
{
  id: "ALG.CONV.BD.PP.STRUCTURE.04",
  topic: "algorytmy",
  subtopic: "konwersja_bin_dec",
  curriculum_level: "PP",
  type: "structure",
 taskSubtypes: ["match_pair",  "match_fill", "open_explain", "open_code"],
  content: {
    definition: "",
    // Bank 10 unikalnych kroków i struktur proceduralnych algorytmu konwersji BIN->DEC
    raw: [
      { step: "Krok 1", action: "Zapisz liczbę binarną i nadpisz nad każdym bitem jego indeks pozycji, licząc od 0 od prawej strony." },
      { step: "Krok 2", action: "Oblicz wagi dla każdej pozycji podnosząc liczbę 2 do potęgi równej indeksowi pozycji." },
      { step: "Krok 3", action: "Pomnóż każdą zapisaną cyfrę binarną (0 lub 1) przez odpowiadającą jej wagę pozycyjną." },
      { step: "Krok 4", action: "Zsumuj wszystkie uzyskane iloczyny, aby otrzymać ostateczną wartość w systemie dziesiętnym." },
      { step: "Warunek sumowania", action: "Instrukcja warunkowa w programie sprawdza, czy znak w ciągu tekstowym to '1', by zaktualizować sumę." },
      { step: "Zmienna akumulatora", action: "Zdefiniuj zmienną przeznaczoną do przechowywania sumy częściowej i zainicjalizuj ją wartością zero." },
      { step: "Mnożnik iteracyjny", action: "W pętli czytającej od prawej, po każdym znaku pomnóż pomocniczą zmienną wagi przez podstawę 2." },
      { step: "Pętla for (od końca)", action: "Ustaw licznik pętli tak, aby dekrementował od długości ciągu pomniejszonej o 1 aż do zera." },
      { step: "Pętla while (dzielenie ciągu)", action: "Pobieraj bity poprzez operację modulo 10 na liczbie traktowanej jako matematyczny zapis cyfr." },
      { step: "Konwersja końcowa typu", action: "Zwróć obliczoną wartość numeryczną sumatora jako ostateczny wynik w formacie dziesiętnym." },
    ]
  }
},
/* ========================================================================
   PODTEMAT: KONWERSJA DEC → BIN (Dla: closed_single, closed_tf, match_pair, open_explain)
   ======================================================================== */
{
  id: "ALG.CONV.DB.PP.CONCEPT.01",
  topic: "algorytmy",
  subtopic: "konwersja_dec_bin",
  curriculum_level: "PP",
  type: "concept",
  taskSubtypes: ["closed_single", "closed_tf",  "match_fill", "match_pair", "open_explain"],
  content: {
    definition: "Konwersja z systemu dziesiętnego na binarny polega na sukcesywnym (wielokrotnym) dzieleniu całkowitym liczby przez 2 i zapisywaniu reszt z tych dzieleń (0 lub 1). Odczytując zebrane reszty od dołu do góry otrzymujemy wynik w systemie binarnym",
tip: [
  {
    title: "Dzielenie całkowite i wyznaczanie reszty",
    text: "W każdym kroku reszta z dzielenia przez 2 tworzy kolejny bit wyniku, a iloraz całkowity staje się liczbą dzieloną w następnym kroku.",
    code: "reszta = liczba mod 2\nliczba = liczba div 2"
  },
  {
    title: "Kolejność zapisu wyniku",
    text: "Pierwsza otrzymana reszta jest najmłodszym bitem. Poprawny zapis binarny powstaje po odczytaniu wszystkich reszt w odwrotnej kolejności.",
    code: "otrzymane reszty: r₀, r₁, r₂, ..., rₙ\nwynik binarny: rₙ...r₂r₁r₀"
  }
],
    // Bank 10 unikalnych definicji i faktów teoretycznych o konwersji DEC na BIN
    raw: [
      { term: "Metoda resztowa", desc: "Algorytm wyznaczania kolejnych cyfr nowej bazy poprzez operacje modulo (dzielenie z resztą)." },
      { term: "Dzielenie całkowite", desc: "Operacja matematyczna odrzucająca ułamek po podziale (np. 13 / 2 daje wynik całkowity 6)." },
      { term: "Reszta z dzielenia przez 2", desc: "Wartość określająca pojedynczy bit, wynosi zawsze 0 dla liczb parzystych lub 1 dla nieparzystych." },
      { term: "Kolejność zapisu bitów", desc: "Zasada mówiąca, że pierwsza uzyskana reszta to najmniej znaczący bit (po prawej), a ostatnia to najstarszy (po lewej)." },
      { term: "Warunek zakończenia", desc: "Moment w algorytmie, gdy wynik dzielenia całkowitego osiąga zero, co oznacza koniec obliczeń." },
      { term: "Odczyt wsteczny", desc: "Zasada czytania wyznaczonych reszt od końca (od dołu do góry) w celu ułożenia poprawnej liczby." },
      { term: "Bit znaku", desc: "W systemie bez znaku (naturalnym kodzie binarnym) wszystkie wyznaczone reszty należą do wartości liczby." },
      { term: "Baza docelowa (2)", desc: "Podstawa systemu, przez którą stale dzielimy liczbę wyjściową." },
      { term: "Liczby nieparzyste", desc: "Liczby dziesiętne, których pierwsza reszta z dzielenia przez 2 (najmłodszy bit) zawsze wynosi 1." },
      { term: "Liczby parzyste", desc: "Liczby dziesiętne, których pierwsza reszta z dzielenia przez 2 (najmłodszy bit) zawsze wynosi 0." },
    ]
  }
},
{
  id: "ALG.CONV.DB.PP.TASK.02",
  topic: "algorytmy",
  subtopic: "konwersja_dec_bin",
  curriculum_level: "PP",
  type: "task",
 taskSubtypes: ["closed_single", "closed_tf", "match_fill", "open_explain"],
  content: {
    definition: "",
    // Bank 10 unikalnych, kompletnych rozpisań matematycznych dla różnych liczb dziesiętnych
    raw: [
      { dec: 13, bin: "1101", steps: ["13/2=6 r 1", "6/2=3 r 0", "3/2=1 r 1", "1/2=0 r 1"] },
      { dec: 10, bin: "1010", steps: ["10/2=5 r 0", "5/2=2 r 1", "2/2=1 r 0", "1/2=0 r 1"] },
      { dec: 6,  bin: "110",  steps: ["6/2=3 r 0", "3/2=1 r 1", "1/2=0 r 1"] },
      { dec: 9,  bin: "1001", steps: ["9/2=4 r 1", "4/2=2 r 0", "2/2=1 r 0", "1/2=0 r 1"] },
      { dec: 15, bin: "1111", steps: ["15/2=7 r 1", "7/2=3 r 1", "3/2=1 r 1", "1/2=0 r 1"] },
      { dec: 11, bin: "1011", steps: ["11/2=5 r 1", "5/2=2 r 1", "2/2=1 r 0", "1/2=0 r 1"] },
      { dec: 8,  bin: "1000", steps: ["8/2=4 r 0", "4/2=2 r 0", "2/2=1 r 0", "1/2=0 r 1"] },
      { dec: 7,  bin: "111",  steps: ["7/2=3 r 1", "3/2=1 r 1", "1/2=0 r 1"] },
      { dec: 14, bin: "1110", steps: ["14/2=7 r 0", "7/2=3 r 1", "3/2=1 r 1", "1/2=0 r 1"] },
      { dec: 12, bin: "1100", steps: ["12/2=6 r 0", "6/2=3 r 0", "3/2=1 r 1", "1/2=0 r 1"] },
    ]
  }
},
{
  id: "ALG.CONV.DB.PP.ERROR.03",
  topic: "algorytmy",
  subtopic: "konwersja_dec_bin",
  curriculum_level: "PP",
  type: "error",
 taskSubtypes: ["error_find", "closed_tf", "open_explain"],
  content: {
    definition: "",
    // Bank 10 unikalnych błędów proceduralnych i arytmetycznych do zadań error_find
    raw: [
      { bad_expr: "13₁₀ → 1011₂", fix: "Zła kolejność odczytu reszt. Uczeń przepisał bity od góry do dołu (od pierwszej reszty), zamiast od dołu do góry (od ostatniej reszty).", error_type: "Kolejność odczytu" },
      { bad_expr: "13 / 2 = 6 r 1, 6 / 2 = 3 r 0, 3 / 2 = 1 r 1 → wynik 101₂", fix: "Pominięcie ostatniego etapu dzielenia liczby 1 przez 2 (1 / 2 = 0 r 1), co spowodowało utratę najstarszego bitu o najwyższej wadze.", error_type: "Przedwczesne zakończenie" },
      { bad_expr: "8 / 2 = 4 r 0, 4 / 2 = 2 r 0, 2 / 2 = 0 r 2", fix: "Błąd w ostatnim dzieleniu: 2 podzielone przez 2 daje wynik całkowity 1 oraz resztę 0, a nie wynik 0 r 2.", error_type: "Zły podział reszty" },
      { bad_expr: "11₁₀ → zapis 1011 bez wykonania dzielenia dla liczby parzystej", fix: "Próba zgadywania sekwencji bitów bez zastosowania algorytmu, co prowadzi do błędów przy większych wartościach.", error_type: "Brak schematu" },
      { bad_expr: "9 / 2 = 4.5 r 0", fix: "Zapisanie wyniku z ułamkiem dziesiętnym. W algorytmie stosuje się wyłącznie dzielenie całkowite z jawnym wydzieleniem reszty.", error_type: "Dzielenie zmiennoprzecinkowe" },
      { bad_expr: "10 / 2 = 5 r 0, 5 / 2 = 2 r 1, 2 / 2 = 1 r 0 → wynik 010₂", fix: "Zgubienie ostatniej jedynki z dzielenia 1 / 2, przez co liczba ma błędną wartość końcową.", error_type: "Utrata bitu MSB" },
      { bad_expr: "14 / 2 = 7 r 1", fix: "Błąd w wyznaczaniu reszty: liczba 14 jest parzysta, więc reszta z dzielenia przez 2 musi wynosić 0.", error_type: "Błąd parzystości reszty" },
      { bad_expr: "7 / 2 = 3 r 1, 3 / 2 = 1 r 1, 1 / 2 = 0 r 1 → wynik 111₁₀", fix: "Błędne oznaczenie bazy wyniku. Otrzymany ciąg to liczba binarna (indeks 2), a nie dziesiętna.", error_type: "Złe oznaczenie systemu" },
      { bad_expr: "6 / 2 = 3 r 0, 3 / 2 = 1 r 1, 1 / 2 = 0 r 1 → wynik 011₂", fix: "Odczytano sekwencję wspak w niepoprawny sposób, dopisując nieistniejące zero wiodące zamiast poprawnego układu 110.", error_type: "Zniekształcenie ciągu" },
      { bad_expr: "12 / 2 = 6 (brak zapisu reszty)", fix: "Ignorowanie zapisywania reszt równych 0, co uniemożliwia późniejsze odtworzenie pełnego ciągu bitów.", error_type: "Pominięcie bitu zero" },
    ]
  }
},
{
  id: "ALG.CONV.DB.PP.STRUCTURE.04",
  topic: "algorytmy",
  subtopic: "konwersja_dec_bin",
  curriculum_level: "PP",
  type: "structure",
 taskSubtypes: ["match_pair",  "match_fill", "open_explain", "open_code"],
  content: {
    definition: "",
    // Bank 10 unikalnych kroków i elementów kodu/algorytmu dla open_code, open_explain, match_pair
    raw: [
      { step: "Krok 1", action: "Przyjmij wejściową liczbę dziesiętną i przygotuj pusty ciąg tekstowy na reszty." },
      { step: "Krok 2", action: "Oblicz resztę z dzielenia aktualnej liczby przez 2 (operacja modulo)." },
      { step: "Krok 3", action: "Wykonaj dzielenie całkowite aktualnej liczby przez 2, zastępując nią poprzednią wartość." },
      { step: "Krok 4", action: "Dopisz uzyskaną resztę na początek (lub koniec) budowanego ciągu znaków." },
      { step: "Krok 5", action: "Sprawdź, czy nowa wartość liczby wynosi 0. Jeśli nie, powtórz kroki od obliczenia reszty." },
      { step: "Krok 6", action: "Jeśli reszty były dopisywane na koniec, odwróć kolejność całego ciągu znaków." },
      { step: "Operator modulo (%)", action: "Służy w kodzie programu do pobierania wartości bitu (0 lub 1) z dzielenia liczby przez 2." },
      { step: "Dzielenie całkowite (//)", action: "Używane do zmniejszania liczby dziesiętnej w każdej iteracji (odrzuca część ułamkową)." },
      { step: "Warunek pętli while", action: "Pętla konwersji wykonuje się tak długo, dopóki badana liczba dziesiętna jest ściśle większa od zera." },
      { step: "Zwrócenie wyniku", action: "Ostateczne przekazanie sformatowanego ciągu tekstowego (string) jako reprezentacji binarnej." },
    ]
  }
},
/* ========================================================================
   PODTEMAT: REPREZENTACJA ALGORYTMÓW - OGÓLNE (Dla: closed_single, closed_tf, match_pair, open_explain)
   ======================================================================== */
{
  id: "ALG.REP.PP.CONCEPT.01",
  topic: "algorytmy",
  subtopic: "alg_reprezentacje",
  curriculum_level: "PP",
  type: "concept",
  taskSubtypes: ["closed_single", "closed_tf",  "match_fill", "match_pair", "open_explain"],
  content: {
    definition: "Algorytmy można zapisywać na różne sposoby, dopasowując formę do stopnia skomplikowania problemu. Główne metody to opis słowny, lista kroków, schemat blokowy, drzewo algorytmiczne oraz pseudokod. Dobór sposobu zapisu zależy od specyfiki problemu. Każda forma reprezentacji (lista kroków, schemat, pseudokod) opisuje ten sam logiczny proces matematyczny.",
tip: [
  {
    title: "Główne sposoby zapisu algorytmu",
    text: "Ten sam algorytm może być przedstawiony w różnych formach. Zmienia się sposób zapisu, ale nie kolejność ani znaczenie wykonywanych operacji.",
    code: "opis słowny → opis w języku naturalnym\nlista kroków → ponumerowana sekwencja instrukcji\nschemat blokowy → bloki i strzałki przepływu\ndrzewo algorytmiczne → rozgałęzienia i możliwe ścieżki\npseudokod → strukturalny zapis tekstowy"
  },
  {
    title: "Wspólny układ reprezentacji algorytmu",
    text: "Niezależnie od wybranej formy zapis powinien określać dane wejściowe, sposób ich przetwarzania, wynik oraz moment zakończenia algorytmu.",
    code: "START → dane wejściowe → operacje / decyzje → wynik → STOP"
  }
],
    // Bank 10 unikalnych pojęć i faktów teoretycznych o reprezentacji algorytmów
    raw: [
      { term: "Opis słowny", desc: "Intuicyjny, naturalny język opisu problemu, często stosowany jako wstęp do projektowania algorytmu." },
      { term: "Lista kroków", desc: "Uporządkowana, ponumerowana sekwencja jednoznacznych operacji, wykonywanych jedna po drugiej." },
      { term: "Schemat blokowy", desc: "Graficzna reprezentacja algorytmu wykorzystująca zunifikowane figury geometryczne (bloki) i strzałki kierunkowe." },
      { term: "Pseudokod", desc: "Tekstowy zapis algorytmu łączący elementy języka naturalnego ze strukturami programistycznymi (np. pętle, warunki)." },
      { term: "Skończoność algorytmu", desc: "Cechą algorytmu określająca, że musi on zakończyć działanie po wykonaniu skończonej liczby kroków." },
      { term: "Jednoznaczność (determinizm)", desc: "Własność gwarantująca, że dla tych samych danych wejściowych algorytm zawsze wykona te same kroki i da ten sam wynik." },
      { term: "Efektywność algorytmu", desc: "Rozwiązanie problemu w optymalnym czasie przy użyciu jak najmniejszej ilości zasobów (np. pamięci komputerowej)." },
      { term: "Dane wejściowe (Input)", desc: "Zestaw informacji i zmiennych dostarczanych do algorytmu, niezbędnych do rozpoczęcia jego przetwarzania." },
      { term: "Dane wyjściowe (Output)", desc: "Ostateczny rezultat działania algorytmu, będący rozwiązaniem zadanego problemu." },
      { term: "Instrukcja warunkowa", desc: "Konstrukcja algorytmiczna umożliwiająca wybór ścieżki działania w zależności od spełnienia określonego kryterium." },
    ]
  }
},
{
  id: "ALG.REP.PP.TASK.02",
  topic: "algorytmy",
  subtopic: "alg_reprezentacje",
  curriculum_level: "PP",
  type: "task",
 taskSubtypes: ["closed_single", "closed_tf", "match_fill", "open_explain"],
  content: {
    definition: "",
    // Bank 10 unikalnych mini-scenariuszy algorytmicznych w różnych formach zapisu
    raw: [
      { problem: "Obliczanie średniej dwóch liczb", form: "Lista kroków", representation: "1. Pobierz a i b -> 2. Oblicz sumę s=a+b -> 3. Oblicz wynik w=s/2 -> 4. Wyświetl w" },
      { problem: "Wyszukiwanie większej z dwóch liczb", form: "Pseudokod", representation: "JEŻELI a > b TO wypisz a W PRZECIWNYM WYPADKU wypisz b" },
      { problem: "Sprawdzanie parzystości liczby n", form: "Schemat blokowy", representation: "Blok decyzyjny (romb) z warunkiem: czy n % 2 == 0? Ścieżki TAK i NIE" },
      { problem: "Licznik powtórzeń (pętla)", form: "Pseudokod", representation: "DLA i = 1 DO 5 WYKONAJ: wypisz i" },
      { problem: "Parzenie herbaty (algorytm życiowy)", form: "Lista kroków", representation: "1. Nalej wodę -> 2. Zagotuj -> 3. Włóż torebkę herbaty do kubka -> 4. Zalej wrzątkiem" },
      { problem: "Sumowanie liczb od 1 do n", form: "Schemat blokowy", representation: "Blok operacyjny: suma = suma + i; Blok operacyjny: i = i + 1" },
      { problem: "Wczytywanie poprawnego hasła", form: "Pseudokod", representation: "DOPÓKI haslo != 'sekret' WYKONAJ: wczytaj haslo" },
      { problem: "Pole prostokąta o bokach a, b", form: "Lista kroków", representation: "1. Sprawdź czy a>0 i b>0 -> 2. Pomnóż pole=a*b -> 3. Zwróć pole" },
      { problem: "Zasypianie (pętla warunkowa)", form: "Lista kroków", representation: "1. Połóż się -> 2. Czy chce ci się spać? Jeśli nie, czytaj książkę i wróć do 2. Jeśli tak, zaśnij" },
      { problem: "Obliczanie obwodu koła", form: "Pseudokod", representation: "POBIERZ r; USTAW pi = 3.14; obwod = 2 * pi * r; WYŚWIETL obwod" },
    ]
  }
},
{
  id: "ALG.REP.PP.ERROR.03",
  topic: "algorytmy",
  subtopic: "alg_reprezentacje",
  curriculum_level: "PP",
  type: "error",
 taskSubtypes: ["error_find", "closed_tf", "open_explain"],
  content: {
    definition: "",
    // Bank 10 unikalnych, rzeczywistych błędów logicznych i strukturalnych w zapisie algorytmów
    raw: [
      { bad_expr: "1. Wczytaj a i b -> 2. Podziel a przez b -> 3. Wyświetl wynik (brak sprawdzenia b==0)", fix: "Brak instrukcji zabezpieczającej przed dzieleniem przez zero. Należy dodać warunek sprawdzający, czy b jest różne od 0.", error_type: "Błąd krytyczny danych" },
      { bad_expr: "Zapis w kroku: 'Zrób coś z liczbą, żeby była mniejsza'", fix: "Użyto nieprecyzyjnego i niejednoznacznego polecenia. Należy podać konkretne działanie matematyczne, np. 'Odejmij 1 od liczby'.", error_type: "Niejednoznaczność polecenia" },
      { bad_expr: "1. Wczytaj dane -> 2. Pomnóż x * 2 -> 3. STOP (brak wyświetlenia wyniku)", fix: "Algorytm oblicza wartość, ale jej nie komunikuje użytkownikowi. Brakuje kroku 'Wyświetl wynik' przed zakończeniem.", error_type: "Brak danych wyjściowych" },
      { bad_expr: "Schemat blokowy: Umieszczenie instrukcji 'x = x + 1' wewnątrz owalnego bloku START/STOP", fix: "Błędne użycie bloku graficznego. Operacje przypisania i obliczenia muszą znajdować się w prostokątnym bloku operacyjnym.", error_type: "Zły symbol graficzny" },
      { bad_expr: "1. Wykonaj działanie -> 2. Wczytaj zmienne -> 3. Wyświetl wynik", fix: "Odwrócona, nielogiczna kolejność. Algorytm próbuje przetwarzać zmienne zanim zostaną one wczytane do pamięci.", error_type: "Zaburzenie chronologii" },
      { bad_expr: "Romb (blok warunkowy) na schemacie posiadający tylko jedną strzałkę wyjściową", fix: "Blok decyzyjny musi posiadać dokładnie dwie ścieżki wyjściowe opisane jako TAK (warunek spełniony) oraz NIE (warunek niespełniony).", error_type: "Wada struktury graficznej" },
      { bad_expr: "1. Ustaw i=1 -> 2. Wyświetl i -> 3. Wróć do kroku 2", fix: "Pętla nieskończona. Brak kroku modyfikującego licznik (np. i=i+1), przez co algorytm nigdy nie osiągnie warunku stopu.", error_type: "Zapętlenie algorytmu" },
      { bad_expr: "Zapis pseudokodu bez użycia wcięć tekstowych wewnątrz instrukcji JEŻELI i DLA", fix: "Brak czytelności strukturalnej. Bez wcięć nie da się jednoznacznie określić, które instrukcje należą do wnętrza bloku warunkowego lub pętli.", error_type: "Błąd składniowy/wizualny" },
      { bad_expr: "1. Wczytaj wiek -> 2. JEŻELI wiek > 18 TO wypisz 'Dorosły' (brak ścieżki dla wieku <= 18)", fix: "Niewyczerpanie wszystkich możliwych przypadków testowych. Brakuje sekcji 'W PRZECIWNYM WYPADKU' dla osób niepełnoletnich.", error_type: "Niekompletność warunku" },
      { bad_expr: "Rozpoczęcie numeracji listy kroków od losowych liczb lub brak numeracji", fix: "Algorytm w formie listy musi posiadać jednoznaczną, sekwencyjną numerację (1, 2, 3...), określającą sztywny porządek wykonania.", error_type: "Brak uporządkowania" },
    ]
  }
},
{
  id: "ALG.REP.PP.STRUCTURE.04",
  topic: "algorytmy",
  subtopic: "alg_reprezentacje",
  curriculum_level: "PP",
  type: "structure",
 taskSubtypes: ["match_pair",  "match_fill", "open_explain", "open_code"],
  content: {
    definition: "",
    // Bank 10 unikalnych elementów strukturalnych i ról bloków w reprezentacji
    raw: [
      { step: "Blok START/STOP", action: "Owalny kształt na schemacie wyznaczający jedyne miejsce rozpoczęcia oraz zakończenia realizacji algorytmu." },
      { step: "Blok wejścia/wyjścia", action: "Równoległobok służący do wprowadzania danych od użytkownika oraz wyprowadzania końcowych wyników programu." },
      { step: "Blok operacyjny", action: "Prostokąt zawierający podstawowe operacje matematyczne, podstawienia oraz modyfikacje wartości zmiennych." },
      { step: "Blok decyzyjny (warunkowy)", action: "Romb służący do sprawdzania warunków logicznych; rozdziela bieg algorytmu na dwie alternatywne ścieżki." },
      { step: "Linie przepływu", action: "Strzałki łączące bloki graficzne, jednoznacznie wskazujące kierunek i kolejność wykonywania kolejnych kroków." },
      { step: "Sekwencja liniowa", action: "Struktura, w której kroki wykonują się bezwzględnie jeden po drugim, bez żadnych rozgałęzień i powtórzeń." },
      { step: "Struktura rozgałęziona", action: "Układ algorytmu wykorzystujący instrukcje wyboru, reagujący odmiennie na różne zestawy danych testowych." },
      { step: "Struktura iteracyjna", action: "Organizacja kroków polegająca na wielokrotnym powtarzaniu tego samego bloku operacji aż do spełnienia kryterium stopu." },
      { step: "Nagłówek algorytmu", action: "Krok wstępny określający nazwę realizowanej procedury oraz specyfikację parametrów wejściowych." },
      { step: "Krok inkrementacji", action: "Struktura wewnątrz pętli odpowiedzialna za systematyczne zwiększanie wartości licznika o określoną wartość (krok)." }
    ]
  }
},


   // ALGORYTMIKA -PREZENTACJA ALGORYTMÓW (PODTEMAT: LISTA KROKÓW)
   
  {
    id: "ALG.STEPS.PP.CONCEPT.01",
    topic: "algorytmy",
    subtopic: "alg_lista_krokow",
    curriculum_level: "PP",
    type: "concept",
  taskSubtypes: ["closed_single", "closed_tf",  "match_fill", "match_pair", "open_explain"],
    content: {
      definition: "Lista kroków to uporządkowany, punktowy sposób zapisu algorytmu przedstawiający instrukcje jedna po drugiej w języku naturalnym.",
tip: [
  {
    title: "Budowa listy kroków",
    text: "Kroki zapisuje się w kolejności wykonywania. Każdy krok powinien opisywać jedną jednoznaczną i wykonalną czynność, a lista musi mieć określony początek i koniec.",
    code: "START\n1. Wczytaj dane wejściowe.\n2. Wykonaj określoną operację.\n3. Wyświetl wynik.\nSTOP"
  },
  {
    title: "Krok decyzyjny",
    text: "Jeżeli dalsze działanie zależy od warunku, należy wskazać osobno przejście dla wyniku prawdziwego i fałszywego.",
    code: "Jeżeli warunek jest spełniony, przejdź do kroku X.\nW przeciwnym razie przejdź do kroku Y."
  }
],
      // Dokładnie 14 unikalnych pojęć teoretycznych 
      raw: [
        { term: "Skończoność listy", desc: "Zasada mówiąca, że lista kroków musi posiadać jasno zdefiniowany koniec (np. krok STOP)." },
        { term: "Jednoznaczność kroku", desc: "Każdy punkt na liście musi być zrozumiały w dokładnie jeden sposób, bez domysłów." },
        { term: "Sekwencyjność", desc: "Domyślne wykonywanie instrukcji punkt po punkcie, zgodnie z rosnącą numeracją." },
        { term: "Język naturalny", desc: "Język używany do zapisu listy kroków (np. polski), zrozumiały dla człowieka." },
        { term: "Instrukcja skoku", desc: "Krok zmieniający kolejność wykonywania zadań, np. 'Wróć do kroku 2'." },
        { term: "Specyfikacja danych", desc: "Krok odpowiedzialny za zdefiniowanie, jakie parametry są niezbędne do uruchomienia algorytmu." },
        { term: "Krok operacyjny", desc: "Punkt na liście opisujący bezpośrednie działanie, obliczenie lub transformację danych." },
        { term: "Krok decyzyjny", desc: "Punkt sprawdzający warunek, np. 'Jeśli warunek jest spełniony, przejdź do kroku 5'." },
        { term: "Uniwersalność", desc: "Własność algorytmu pozwalająca na rozwiązanie całej klasy problemów, a nie jednej liczby." },
        { term: "Wykonalność", desc: "Wymóg, aby każda operacja na liście była możliwa do zrealizowania przez wykonawcę." },
        { term: "Dane wejściowe (Input)", desc: "Informacje, które należy wczytać na samym początku listy kroków." },
        { term: "Dane wyjściowe (Output)", desc: "Wyniki działania algorytmu, które należy wyświetlić przed krokiem STOP." },
        { term: "Licznik iteracji", desc: "Zmienna modyfikowana w jednym z kroków, kontrolująca liczbę powtórzeń pętli." },
        { term: "Warunek stopu", desc: "Kryterium logiczne na liście kroków, które przerywa zapętlenie algorytmu." },
      ]
    }
  },

  {
    id: "ALG.STEPS.PP.TASK.02",
    topic: "algorytmy",
    subtopic: "alg_lista_krokow",
    curriculum_level: "PP",
    type: "task",
 taskSubtypes: ["closed_single", "closed_tf", "match_fill", "open_explain"],
    content: {
      definition: "",
      // Dokładnie 14 unikalnych mini-scenariuszy
      raw: [
        { title: "Pole prostokąta", steps: ["1. START", "2. Pobierz boki a, b", "3. Oblicz P = a * b", "4. Wyświetl P", "5. STOP"] },
        { title: "Średnia z dwóch ocen", steps: ["1. START", "2. Pobierz x, y", "3. Oblicz S = x + y", "4. Oblicz W = S / 2", "5. Wyświetl W", "6. STOP"] },
        { title: "Większa z dwóch liczb", steps: ["1. START", "2. Pobierz a, b", "3. Jeśli a > b, wypisz a i idź do 5", "4. Wypisz b", "5. STOP"] },
        { title: "Parzystość liczby", steps: ["1. START", "2. Pobierz n", "3. Jeśli n % 2 == 0, wypisz 'Parzysta' w przeciwnym razie 'Nieparzysta'", "4. STOP"] },
        { title: "Obwód kwadratu", steps: ["1. START", "2. Pobierz bok a", "3. Oblicz Obw = 4 * a", "4. Wyświetl Obw", "5. STOP"] },
        { title: "Dzielenie liczb", steps: ["1. START", "2. Pobierz x, y", "3. Jeśli y == 0, wypisz 'Błąd' i idź do 6", "4. Oblicz W = x / y", "5. Wyświetl W", "6. STOP"] },
        { title: "Licznik do 3", steps: ["1. START", "2. Ustaw i = 1", "3. Wyświetl i", "4. Zwiększ i o 1", "5. Jeśli i <= 3, idź do 3", "6. STOP"] },
        { title: "Pole trójkąta", steps: ["1. START", "2. Pobierz a, h", "3. Oblicz P = (a * h) / 2", "4. Wyświetl P", "5. STOP"] },
        { title: "Dodatnia czy ujemna", steps: ["1. START", "2. Pobierz x", "3. Jeśli x >= 0, wypisz 'Dodatnia', w innym wypadku 'Ujemna'", "4. STOP"] },
        { title: "Zamiana miejscami (SWAP)", steps: ["1. START", "2. Pobierz a, b", "3. Ustaw tymczasowy t = a", "4. Ustaw a = b", "5. Ustaw b = t", "6. STOP"] },
        { title: "Kolejne liczby parzyste", steps: ["1. START", "2. Ustaw n = 2", "3. Wyświetl n", "4. Zwiększ n o 2", "5. Jeśli n <= 6, idź do 3", "6. STOP"] },
        { title: "Potęga kwadratowa", steps: ["1. START", "2. Pobierz x", "3. Oblicz W = x * x", "4. Wyświetl W", "5. STOP"] },
        { title: "Cena z rabatem 10%", steps: ["1. START", "2. Pobierz cena", "3. Oblicz r = cena * 0.1", "4. Oblicz nowa = cena - r", "5. Wyświetl nowa", "6. STOP"] },
        { title: "Weryfikacja hasła", steps: ["1. START", "2. Pobierz h", "3. Jeśli h != '123', idź do 2", "4. Wyświetl 'Zalogowano'", "5. STOP"] }
      ]
    }
  },

  {
    id: "ALG.STEPS.PP.ERROR.03",
    topic: "algorytmy",
    subtopic: "alg_lista_krokow",
    curriculum_level: "PP",
    type: "error",
 taskSubtypes: ["error_find", "closed_tf", "open_explain"],
    content: {
      definition: "",
      // Dokładnie 14 unikalnych błędów dla typu error_find
      raw: [
        { bad: "1. Wyświetl wynik W -> 2. Oblicz W = a + b", fix: "Wyświetlenie wyniku następuje przed jego obliczeniem. Popraw kolejność.", error_type: "Zaburzenie chronologii" },
        { bad: "1. START -> 2. Oblicz x = y * 2 -> 3. STOP", fix: "Brak kroku wczytania danych wejściowych (zmienna y nie istnieje w pamięci).", error_type: "Brak danych wejściowych" },
        { bad: "1. START -> 2. Wczytaj a -> 3. Oblicz X = a * 5 -> 4. STOP", fix: "Zguba danych wyjściowych. Wynik X został policzony, ale nie wyświetlono go użytkownikowi.", error_type: "Brak danych wyjściowych" },
        { bad: "1. Wczytaj x -> 2. Zrób coś magicznego z x -> 3. Wyświetl x", fix: "Krok 2 jest niejednoznaczny i nieprecyzyjny. Trzeba podać konkretną operację matematyczną.", error_type: "Niejasne polecenie" },
        { bad: "1. START -> 2. Ustaw i = 1 -> 3. Wyświetl i -> 4. Idź do kroku 3", fix: "Pętla nieskończona. Brak modyfikacji licznika sprawia, że algorytm nigdy się nie skończy.", error_type: "Zapętlenie algorytmu" },
        { bad: "1. START -> 2. Wczytaj bok a -> 3. Oblicz P = a * b -> 4. Wyświetl P", fix: "Użyto niezdefiniowanej zmiennej b. Należy najpierw wczytać obie zmienne (a oraz b).", error_type: "Niezdefiniowana zmienna" },
        { bad: "1. Wczytaj a, b -> 2. Oblicz W = a / b -> 3. Wyświetl W", fix: "Brak warunku zabezpieczającego przed dzieleniem przez zero (gdy b == 0).", error_type: "Błąd krytyczny danych" },
        { bad: "1. START -> 2. Jeśli wiek >= 18 idź do kroku 4 -> 3. STOP", fix: "Brak zdefiniowania co dzieje się, gdy warunek nie jest spełniony (brak kroku 4 lub alternatywy).", error_type: "Niekompletny warunek" },
        { bad: "Oblicz pole: weź długość, pomnóż przez szerokość i zapisz wynik.", fix: "Zapis ciągły w postaci tekstu słownego, zamiast wymaganej formy ponumerowanych punktów.", error_type: "Zła forma reprezentacji" },
        { bad: "A. START -> B. Wczytaj x -> C. Wyświetl x", fix: "Użyto liter zamiast kolejnych, jednoznacznych liczb całkowitych (1, 2, 3...) do numeracji kroków.", error_type: "Błędna numeracja" },
        { bad: "1. START -> 2. Wczytaj n -> 3. Wyświetl n", fix: "Algorytm nie posiada punktu końcowego. Zapomniano dodać na końcu kroku STOP.", error_type: "Brak zakończenia" },
        { bad: "Wczytaj x -> 1. Oblicz x*2 -> 2. STOP", fix: "Pierwszy krok nie posiada przypisanego numeru, co uniemożliwia odwołanie się do niego instrukcją skoku.", error_type: "Pominięcie indeksu" },
        { bad: "1. START -> 2. Wczytaj a -> 3. Idź do kroku 5 -> 4. Wyświetl a -> 5. STOP", fix: "Krok 4 (wyświetlenie) nigdy się nie wykona, ponieważ instrukcja skoku omija go bezwarunkowo.", error_type: "Martwy kod" },
        { bad: "1. START -> 2. Jeśli x > 0 idź do kroku 2", fix: "Instrukcja decyzyjna odsyła wykonawcę do samej siebie, generując pętlę bez warunku wyjścia.", error_type: "Autoreferencja błędna" }
      ]
    }
  },

  {
    id: "ALG.STEPS.PP.STRUCTURE.04",
    topic: "algorytmy",
    subtopic: "alg_lista_krokow",
    curriculum_level: "PP",
    type: "structure",
    taskSubtypes: ["match_pair",  "match_fill", "open_explain", "open_code"],
    content: {
      definition: "",
      // Dokładnie 14 unikalnych elementów strukturalnych i ról proceduralnych
      raw: [
        { element: "Inicjalizacja (START)", role: "Pierwszy obowiązkowy krok otwierający wykonanie ciągu instrukcji." },
        { element: "Sekcja wprowadzania", role: "Krok lub kroki odpowiedzialne za pobranie danych wejściowych od użytkownika." },
        { element: "Instrukcja przypisania", role: "Krok nadający nową wartość zmiennej, np. 'Ustaw licznik = 0'." },
        { element: "Przetwarzanie (Proces)", role: "Kroki realizujące główne operacje arytmetyczne, logiczne lub tekstowe." },
        { element: "Sekcja wyprowadzania", role: "Krok przekazujący obliczony rezultat na zewnątrz (np. 'Wyświetl wynik')." },
        { element: "Terminacja (STOP)", role: "Ostatni krok algorytmu, formalnie zamykający całą procedurę obliczeniową." },
        { element: "Numeracja porządkowa", role: "Liczby na początku każdej linii wymuszające jednoznaczną chronologię wykonania." },
        { element: "Instrukcja warunkowa", role: "Element struktury sterującej, rozgałęziający listę kroków na podstawie testu logicznego." },
        { element: "Skok bezwarunkowy", role: "Polecenie przeniesienia wykonania do innego punktu listy bez sprawdzania warunków." },
        { element: "Licznik pętli", role: "Zmienna, której wartość zmienia się cyklicznie w określonym kroku, kontrolując powtórzenia." },
        { element: "Zmienna pomocnicza", role: "Dodatkowy kontener na dane wykorzystywany tymczasowo między krokami obliczeń." },
        { element: "Zagnieżdżenie", role: "Struktura, w której jeden warunek decyzyjny odsyła do kolejnego punktu sprawdzającego." },
        { element: "Krok inkrementacji", role: "Punkt na liście zwiększający wartość o stały krok, np. 'Zwiększ k o 1'." },
        { element: "Specyfikacja problemu", role: "Opis założeń i wyników, umieszczany formalnie przed pierwszym krokiem listy." }
      ]
    }
  },

  // SCHEMAT BLOKOWY

  {
  "id": "ALG.FLOW.PP.CONCEPT.01",
  "topic": "algorytmy",
  "subtopic": "alg_schemat_blokowy",
  "curriculum_level": "PP",
  "type": "concept",
  "taskSubtypes": ["closed_single", "closed_tf", "match_pair"],
  "content": {
    "definition": "Schemat blokowy to graficzna reprezentacja algorytmu, w której poszczególne operacje są przedstawione za pomocą zunifikowanych figur geometrycznych połączonych strzałkami.",
tip: [
  {
    title: "Podstawowe bloki schematu blokowego",
    text: "Rodzaj wykonywanej czynności określa figurę zastosowaną w schemacie. Strzałki wskazują kolejność i kierunek wykonywania operacji.",
    code: "START / STOP → blok graniczny — owal\nWEJŚCIE / WYJŚCIE → równoległobok\nOPERACJA → blok operacyjny — prostokąt\nWARUNEK → blok decyzyjny — romb\nKIERUNEK PRZEPŁYWU → strzałka"
  },
  {
    title: "Przepływ sterowania",
    text: "Schemat rozpoczyna się blokiem START i kończy blokiem STOP. Z bloku decyzyjnego wychodzą co najmniej dwie opisane ścieżki, najczęściej TAK i NIE.",
    code: "START → wejście → operacja → warunek\n                                ├─ TAK → dalsze operacje\n                                └─ NIE → inna ścieżka\n→ wyjście → STOP"
  }
],
    "raw": [
      { "term": "Blok graniczny (Początek/Koniec)", "desc": "Owalny kształt wyznaczający punkt startowy oraz miejsce zakończenia działania całego algorytmu." },
      { "term": "Blok wejścia/wyjścia (I/O)", "desc": "Równoległobok służący do wprowadzania danych do pamięci komputera oraz wyprowadzania wyników dla użytkownika." },
      { "term": "Blok operacyjny (Proces)", "desc": "Prostokąt, w którym umieszcza się operacje przypisania, obliczenia matematyczne oraz transformacje danych." },
      { "term": "Blok decyzyjny (Warunkowy)", "desc": "Romb służący do sprawdzania warunków logicznych, posiadający co najmniej dwie ścieżki wyjściowe (TAK i NIE)." },
      { "term": "Linie potokowe (Strzałki)", "desc": "Wektory wskazujące jednoznaczny kierunek przepływu sterowania i kolejność wykonywania operacji." },
      { "term": "Łącznik stronicowy", "desc": "Małe koło używane do łączenia rozbitych fragmentów schematu na tej samej stronie w celu uniknięcia krzyżowania linii." },
      { "term": "Kierunek główny", "desc": "Standardowy przepływ algorytmu na płaszczyźnie, realizowany z góry do dołu lub od lewej do prawej strony." },
      { "term": "Algorytm liniowy", "desc": "Struktura, w której wszystkie operacje wykonują się sekwencyjnie, jedna po drugiej, bez żadnych rozgałęzień." },
      { "term": "Zmienna algorytmiczna", "desc": "Nazwany obszar pamięci modyfikowany w blokach operacyjnych, przechowujący dane wejściowe lub cząstkowe wyniki." },
      { "term": "Jednoznaczność graficzna", "desc": "Zasada mówiąca, że każda figura w schemacie ma ściśle zdefiniowane i niezmienne przeznaczenie funkcjonalne." }
    ]
  }
},
{
  "id": "ALG.FLOW.PP.TASK.02",
  "topic": "algorytmy",
  "subtopic": "alg_schemat_blokowy",
  "curriculum_level": "PP",
  "type": "task",
  "taskSubtypes": ["closed_single", "match_fill", "open_explain"],
  "content": {
    "definition": "",
    "raw": [
      { "problem": "Obliczanie pola prostokąta", "form": "Schemat liniowy", "representation": "START -> Równoległobok [Wczytaj a, b] -> Prostokąt [P = a * b] -> Równoległobok [Wypisz P] -> STOP" },
      { "problem": "Konwersja temperatury z Celsjusza na Fahrenheita", "form": "Schemat liniowy", "representation": "START -> Równoległobok [Wczytaj C] -> Prostokąt [F = C * 1.8 + 32] -> Równoległobok [Wypisz F] -> STOP" },
      { "problem": "Obliczanie ceny brutto z podatkiem VAT 23%", "form": "Schemat liniowy", "representation": "START -> Równoległobok [Wczytaj netto] -> Prostokąt [brutto = netto * 1.23] -> Równoległobok [Wypisz brutto] -> STOP" },
      { "problem": "Średnia arytmetyczna trzech liczb", "form": "Schemat liniowy", "representation": "START -> Równoległobok [Wczytaj x, y, z] -> Prostokąt [S = (x + y + z) / 3] -> Równoległobok [Wypisz S] -> STOP" },
      { "problem": "Obliczanie obwodu kwadratu", "form": "Schemat liniowy", "representation": "START -> Równoległobok [Wczytaj bok] -> Prostokąt [Obw = 4 * bok] -> Równoległobok [Wypisz Obw] -> STOP" },
      { "problem": "Zamiana wartości dwóch zmiennych (z buforem temp)", "form": "Schemat liniowy", "representation": "START -> Równoległobok [Wczytaj A, B] -> Prostokąt [temp = A; A = B; B = temp] -> Równoległobok [Wypisz A, B] -> STOP" },
      { "problem": "Obliczanie rocznego kosztu abonamentu", "form": "Schemat liniowy", "representation": "START -> Równoległobok [Wczytaj koszt_mies] -> Prostokąt [koszt_rok = koszt_mies * 12] -> Równoległobok [Wypisz koszt_rok] -> STOP" },
      { "problem": "Droga w ruchu jednostajnym (s = v * t)", "form": "Schemat liniowy", "representation": "START -> Równoległobok [Wczytaj v, t] -> Prostokąt [s = v * t] -> Równoległobok [Wypisz s] -> STOP" },
      { "problem": "Dzielenie modulo przez 10 (ostatnia cyfra)", "form": "Schemat liniowy", "representation": "START -> Równoległobok [Wczytaj liczba] -> Prostokąt [cyfra = liczba % 10] -> Równoległobok [Wypisz cyfra] -> STOP" },
      { "problem": "Zmniejszenie ceny towaru o rabat kwotowy", "form": "Schemat liniowy", "representation": "START -> Równoległobok [Wczytaj cena, rabat] -> Prostokąt [nowa_cena = cena - rabat] -> Równoległobok [Wypisz nowa_cena] -> STOP" }
    ]
  }
},
{
  "id": "ALG.FLOW.PP.ERROR.03",
  "topic": "algorytmy",
  "subtopic": "alg_schemat_blokowy",
  "curriculum_level": "PP",
  "type": "error",
  "taskSubtypes": ["error_find", "closed_tf"],
  "content": {
    "definition": "",
    "raw": [
      { "bad_expr": "Użycie prostokąta do wprowadzania danych poleceniem 'Wczytaj X'", "fix": "Instrukcje wejścia/wyjścia (I/O) muszą być bezwzględnie umieszczane w równoległoboku.", "error_type": "Błędny dobór figury" },
      { "bad_expr": "Blok START posiada strzałkę wchodzącą, a blok STOP strzałkę wychodzącą", "fix": "START inicjuje działanie (tylko wychodzi), STOP kończy działanie (tylko wchodzi).", "error_type": "Zły kierunek przepływu" },
      { "bad_expr": "Narysowanie linii łączącej dwa bloki bez zakończenia jej grotem strzałki", "fix": "Każda linia łącząca musi być strzałką, aby wskazywać jednoznaczną chronologię operacji.", "error_type": "Brak wektora sterowania" },
      { "bad_expr": "Wprowadzenie tekstu 'Wyświetl wynik' do owalnego bloku końcowego", "fix": "Blok końcowy zawiera tylko słowo 'STOP'. Wyświetlanie danych musi być osobnym równoległobokiem.", "error_type": "Mieszanie funkcji bloku" },
      { "bad_expr": "Umieszczenie w prostokącie instrukcji matematycznej bez przypisania, np. 'A + B'", "fix": "Blok operacyjny musi modyfikować stan zmiennej, np. poprzez zapis typu 'Suma = A + B'.", "error_type": "Instrukcja bezefektowa" },
      { "bad_expr": "Schemat składa się z pięciu odizolowanych bloków geometrycznych bez żadnych linii", "fix": "Wszystkie bloki muszą tworzyć jeden spójny graf połączony liniami potokowymi.", "error_type": "Rozbicie struktury grafu" },
      { "bad_expr": "Użycie rombu z pojedynczą linią wyjściową opisującą operację 'X = X + 1'", "fix": "Romb służy wyłącznie do rozgałęzień warunkowych i musi mieć dwie drogi wyjścia.", "error_type": "Niewłaściwa funkcja rombu" },
      { "bad_expr": "Umieszczenie dwóch osobnych bloków 'START' na jednym schemacie blokowym", "fix": "Algorytm może mieć tylko jeden punkt wejścia (jeden nadrzędny blok START).", "error_type": "Wielokrotna inicjalizacja" },
      { "bad_expr": "Zapisanie wzoru matematycznego wewnątrz elipsy/owalu", "fix": "Owal rezerwowany jest tylko dla znaczników systemowych START i STOP.", "error_type": "Złamanie konwencji kształtów" },
      { "bad_expr": "Strzałka wychodząca z bloku wejściowego prowadzi donikąd (brak bloku docelowego)", "fix": "Każda strzałka musi zamykać się w kolejnej figurze geometrycznej, nie może wisieć w próżni.", "error_type": "Przerwanie potoku sterowania" }
    ]
  }
},
{
  "id": "ALG.FLOW.PP.CONCEPT.04",
  "topic": "algorytmy",
  "subtopic": "alg_schemat_blokowy",
  "curriculum_level": "PP",
  "type": "concept",
  "taskSubtypes": ["closed_single", "match_fill", "open_explain"],
  "content": {
    "definition": "Struktury warunkowe i iteracyjne wprowadzają do schematów blokowych nieliniowy przepływ sterowania, sterowany wartościami logicznymi PRAWDA lub FAŁSZ.",
    "raw": [
      { "term": "Rozgałęzienie binarne", "desc": "Podział ścieżki algorytmu w rombie na dwa alternatywne nurty oznaczone etykietami TAK (+) oraz NIE (-)." },
      { "term": "Warunek prosty", "desc": "Wyrażenie relacyjne umieszczane w rombie, porównujące dwie wartości (np. x > 0 lub y == b)." },
      { "term": "Pętla ze słowem kluczowym DOPÓKI", "desc": "Konstrukcja graficzna, w której strzałka powrotna wraca przed blok decyzyjny, tworząc cykl wykonywany gdy warunek jest spełniony." },
      { "term": "Licznik pętli (iterator)", "desc": "Zmienna modyfikowana w bloku operacyjnym wewnątrz pętli, zapobiegająca nieskończonemu wykonywaniu cyklu." },
      { "term": "Warunek złożony", "desc": "Kryterium w rombie łączące kilka relacji za pomocą spójników logicznych ORAZ (AND) lub LUB (OR)." },
      { "term": "Instrukcja warunkowa jednostronna", "desc": "Konstrukcja, w której ścieżka NIE omija blok operacyjny i łączy się bezpośrednio z głównym potokiem." },
      { "term": "Inicjalizacja zmiennych pętli", "desc": "Blok operacyjny umieszczany przed wejściem do pętli, ustawiający początkowe wartości liczników lub sumatorów." },
      { "term": "Zbieg linii potokowych", "desc": "Miejsce w schemacie, gdzie strzałki z alternatywnych ścieżek warunku łączą się z powrotem w jeden nurt przed kolejną figurą." },
      { "term": "Zmienna flagowa", "desc": "Zmienna przyjmująca stany logiczne (0 lub 1), sprawdzana w bloku decyzyjnym do sterowania kierunkiem wykonania." },
      { "term": "Walidacja danych wejściowych", "desc": "Pętla ze schematu blokowego, która zmusza do ponownego wczytania danych, jeśli nie spełniają one kryteriów poprawności." }
    ]
  }
},
{
  "id": "ALG.FLOW.PP.TASK.05",
  "topic": "algorytmy",
  "subtopic": "alg_schemat_blokowy",
  "curriculum_level": "PP",
  "type": "task",
  "taskSubtypes": ["closed_single", "match_fill", "open_explain"],
  "content": {
    "definition": "",
    "raw": [
      { "problem": "Zabezpieczenie przed dzieleniem przez zero", "form": "Romb warunkowy", "representation": "Wczytaj a, b -> Romb [czy b == 0?] --TAK--> Wypisz 'Błąd' | --NIE--> Z = a / b -> Wypisz Z" },
      { "problem": "Wybór większej z dwóch liczb", "form": "Romb warunkowy", "representation": "Wczytaj x, y -> Romb [czy x > y?] --TAK--> Max = x | --NIE--> Max = y -> Wypisz Max" },
      { "problem": "Sprawdzanie pełnoletniości", "form": "Romb warunkowy", "representation": "Wczytaj wiek -> Romb [czy wiek >= 18?] --TAK--> Wypisz 'Dorosły' | --NIE--> Wypisz 'Małoletni'" },
      { "problem": "Wyświetlanie liczb od 1 do 5", "form": "Pętla warunkowa", "representation": "Ustaw i=1 -> Romb [czy i <= 5?] --TAK--> Wypisz i -> i = i + 1 -> (powrót do rombu) | --NIE--> STOP" },
      { "problem": "Sumowanie pięciu kolejnych liczb", "form": "Pętla warunkowa", "representation": "Suma=0, i=1 -> Romb [i <= 5] --TAK--> Wczytaj x -> Suma=Suma+x -> i=i+1 -> (powrót) | --NIE--> Wypisz Suma" },
      { "problem": "Badanie znaku liczby (dodatnia/ujemna/zero)", "form": "Kaskada rombów", "representation": "Romb1 [x > 0] --TAK--> 'Dodatnia' | --NIE--> Romb2 [x < 0] --TAK--> 'Ujemna' | --NIE--> 'Zero'" },
      { "problem": "Wczytywanie liczby aż będzie dodatnia", "form": "Pętla walidacji", "representation": "Wczytaj n -> Romb [czy n <= 0?] --TAK--> (strzałka powrotna do Wczytaj n) | --NIE--> Wykonaj dalsze działania" },
      { "problem": "Sprawdzanie czy liczba jest parzysta", "form": "Romb warunkowy", "representation": "Wczytaj x -> Romb [czy x % 2 == 0?] --TAK--> Wypisz 'Parzysta' | --NIE--> Wypisz 'Nieparzysta'" },
      { "problem": "Naliczanie rabatu 10% dla zakupów powyżej 100 zł", "form": "Warunek jednostronny", "representation": "Wczytaj kwota -> Romb [kwota > 100] --TAK--> kwota = kwota * 0.9 -> Wypisz kwota | --NIE--> Wypisz kwota" },
      { "problem": "Obliczanie potęgi 2^n dla n >= 0", "form": "Pętla warunkowa", "representation": "Wczytaj n -> potega=1, i=0 -> Romb [i < n] --TAK--> potega=potega*2 -> i=i+1 -> (powrót) | --NIE--> Wypisz potega" }
    ]
  }
},
{
  "id": "ALG.FLOW.PP.ERROR.06",
  "topic": "algorytmy",
  "subtopic": "alg_schemat_blokowy",
  "curriculum_level": "PP",
  "type": "error",
  "taskSubtypes": ["error_find", "open_explain"],
  "content": {
    "definition": "",
    "raw": [
      { "bad_expr": "Romb decyzyjny z dwiema strzałkami wychodzącymi, ale bez etykiet TAK/NIE", "fix": "Należy jednoznacznie podpisać wyjścia z rombu, aby wskazać warunek przejścia danej ścieżki.", "error_type": "Niejednoznaczność decyzji" },
      { "bad_expr": "Strzałka powrotna pętli skierowana bezpośrednio do wnętrza bloku prostokątnego", "fix": "Strzałka powrotna musi wchodzić w linię główną nad rombem sprawdzającym warunek pętli.", "error_type": "Złe domknięcie cyklu" },
      { "bad_expr": "W pętli sprawdzającej 'i <= 10' brak bloku operacyjnego inkrementacji 'i = i + 1'", "fix": "Brak zmiany wartości zmiennej sterującej generuje pętlę nieskończoną. Należy dodać krok modyfikacji licznika.", "error_type": "Nieskończona pętla (Zawieszenie)" },
      { "bad_expr": "Po wyjściu ze ścieżki TAK i NIE warunku, strzałki nigdy się nie spotykają i tworzą dwa osobne zakończenia STOP", "fix": "Zgodnie z zasadami dobrej struktury, ścieżki powinny zbiegać się do jednego punktu przed blokiem STOP.", "error_type": "Nadmiarowość punktów końcowych" },
      { "bad_expr": "Wprowadzenie warunku logicznego 'X > 5' do wnętrza prostokątnego bloku procesowego", "fix": "Wszelkie testy logiczne i pytania o stan zmiennych mogą znajdować się wyłącznie w rombie.", "error_type": "Złamanie semantyki figur" },
      { "bad_expr": "Inicjalizacja licznika 'i = 1' wstawiona wewnątrz pętli (pod strzałką powrotną)", "fix": "Umieszczenie inicjalizacji wewnątrz cyklu powoduje resetowanie licznika przy każdym obrocie i zapętlenie.", "error_type": "Błąd lokalizacji resetu" },
      { "bad_expr": "Romb decyzyjny posiada trzy strzałki wychodzące dla warunku binarnego", "fix": "Dla pojedynczego warunku logicznego z rombu mogą wychodzić tylko dwie drogi (TAK i NIE).", "error_type": "Niepoprawna ematologia rombu" },
      { "bad_expr": "Zbieg linii ze ścieżki TAK wchodzi z boku do bloku wejścia, nadpisując nowo wczytywane dane", "fix": "Linie powrotne pętli nie mogą zakłócać procedur wprowadzania danych początkowych bez uzasadnienia.", "error_type": "Logiczne nadpisanie stanu" },
      { "bad_expr": "Pętla wykonuje operacje obliczeniowe, ale wyjście z niej (ścieżka NIE) prowadzi od razu do bloku START", "fix": "Wyjście z pętli powinno kierować algorytm do przodu, w stronę zakończenia STOP, a nie cofać do początku.", "error_type": "Błędny zwrot sterowania" },
      { "bad_expr": "Użycie warunku 'czy bok > 0' po obliczeniu pola 'P = bok * bok'", "fix": "Walidacja danych musi nastąpić przed operacjami wykonawczymi, aby uniknąć przetwarzania błędnych danych.", "error_type": "Zaburzenie kolejności kontroli" }
    ]
  }
},
{
  "id": "ALG.FLOW.PP.STRUCTURE.07",
  "topic": "algorytmy",
  "subtopic": "alg_schemat_blokowy",
  "curriculum_level": "PP",
  "type": "structure",
  "taskSubtypes": ["match_pair", "match_fill"],
  "content": {
    "definition": "",
    "raw": [
      { "step": "Inicjowanie pętli licznikowej", "action": "Prostokąt ustawiający wartość początkową (np. k=0) montowany bezpośrednio nad rombem pętli." },
      { "step": "Sprawdzenie kryterium wyjścia", "action": "Romb umieszczony w centralnym punkcie struktury iteracyjnej, decydujący o kontynuacji lub przerwaniu cyklu." },
      { "step": "Ciało pętli", "action": "Sekwencja bloków operacyjnych podpięta pod ścieżkę TAK rombu decyzyjnego pętli." },
      { "step": "Modyfikacja licznika pętli", "action": "Ostatni prostokąt w ciele pętli (np. k=k+1), z którego strzałka wraca przed romb decyzyjny." },
      { "step": "Alternatywa warunkowa (IF-THEN-ELSE)", "action": "Układ, w którym romb rozdziela przepływ na dwie niezależne gałęzie z własnymi blokami operacyjnymi." },
      { "step": "Selekcja jednodrogowa (IF-THEN)", "action": "Układ, w którym jedna z gałęzi rombu (zwykle NIE) jest pustą linią omijającą proces wykonawczy." },
      { "step": "Punkt scalania", "action": "Węzeł łączący linie potokowe z gałęzi warunkowych w jedną wspólną linię idącą w dół grafu." },
      { "step": "Wprowadzanie serii danych", "action": "Równoległobok umieszczony wewnątrz pętli, powtarzany przy każdej iteracji algorytmu." },
      { "step": "Wyjście awaryjne", "action": "Ścieżka warunkowa prowadząca z pominięciem reszty algorytmu wprost do bloku STOP w przypadku wykrycia błędu krytycznego." },
      { "step": "Agregacja wyniku (Sumator)", "action": "Prostokąt o konstrukcji 'Suma = Suma + nowa_wartość' umieszczony w powtarzalnym cyklu schematu." }
    ]
  }
},

// PSEUDOKOD

  {
    "id": "ALG.PSEUDO.PP.CONCEPT.01",
    "topic": "algorytmy",
    "subtopic": "alg_pseudokod",
    "curriculum_level": "PP",
    "type": "concept",
    "taskSubtypes": ["closed_single", "closed_tf", "match_fill", "open_explain"],
    "content": {
      "definition": "Pseudokod to uniwersalny, tekstowy zapis algorytmu, który łączy cechy języka naturalnego z konstrukcjami programistycznymi. Nie posiada rygorystycznej składni, co pozwala skupić się wyłącznie na logice działania.",
"tip": [
  {
    "title": "Podstawowa struktura pseudokodu",
    "text": "Instrukcje zapisuje się w kolejności wykonywania: pobranie danych, przetwarzanie oraz wyprowadzenie wyniku.",
    "code": "POCZĄTEK\n  WCZYTAJ dane\n  wynik <- wyrażenie\n  WYPISZ wynik\nKONIEC"
  },
  {
    "title": "Instrukcja warunkowa w pseudokodzie",
    "text": "Warunek rozdziela algorytm na dwie możliwe ścieżki. Wcięcia wskazują instrukcje należące do każdej gałęzi.",
    "code": "JEŻELI warunek WTEDY\n  instrukcje_dla_prawdy\nW PRZECIWNYM WYPADKU\n  instrukcje_dla_fałszu\nKONIEC JEŻELI"
  }
],

      "raw": [
        { "term": "Słowa kluczowe", "desc": "Zunifikowane wyrazy (np. WCZYTAJ, WYPISZ, JEŻELI), które zastępują instrukcje konkretnych języków programowania." },
        { "term": "Wcięcia blokowe", "desc": "Wizualne przesunięcie tekstu w prawo, określające hierarchię kodu i przynależność instrukcji do danej pętli lub warunku." },
        { "term": "Niezależność składniowa", "desc": "Cechą pseudokodu pozwalająca na jego łatwą translację na dowolny język programowania (np. Python, C++, Java)." },
        { "term": "Zmienna", "desc": "Nazwany obszar w pamięci, służący do przechowywania danych, których wartość może się zmieniać w trakcie działania algorytmu." },
        { "term": "Operator przypisania", "desc": "Symbol (najczęściej '=' lub '<-') używany do nadawania zmiennej określonej wartości lub wyniku działania." },
        { "term": "Komentarz w pseudokodzie", "desc": "Niewykonywany przez algorytm opis tekstowy, wyjaśniający działanie danego fragmentu kodu dla czytelnika." },
        { "term": "Instrukcje wejścia", "desc": "Komendy (np. POBIERZ, WCZYTAJ) odpowiedzialne za przyjmowanie danych zewnętrznych od użytkownika." },
        { "term": "Instrukcje wyjścia", "desc": "Komendy (np. WYPISZ, WYŚWIETL, ZWRÓĆ) służące do prezentacji uzyskanych wyników działania algorytmu." },
        { "term": "Blok instrukcji", "desc": "Grupa poleceń wykonywanych wspólnie w ramach jednej struktury sterującej, wydzielona za pomocą wcięć." },
        { "term": "Operatory relacyjne", "desc": "Symbole służące do porównywania wartości (np. ==, !=, <, >, <=, >=), zwracające prawdę lub fałsz." }
      ]
    }
  },
  {
    "id": "ALG.PSEUDO.PP.TASK.02",
    "topic": "algorytmy",
    "subtopic": "alg_pseudokod",
    "curriculum_level": "PP",
    "type": "task",
    "taskSubtypes": ["closed_single", "match_fill", "open_explain"],
    "content": {
      "definition": "",
      "raw": [
        { "problem": "Obliczanie pola prostokąta", "form": "Pseudokod liniowy", "representation": "WCZYTAJ a, b; pole = a * b; WYPISZ pole" },
        { "problem": "Konwersja temperatury C na F", "form": "Pseudokod liniowy", "representation": "WCZYTAJ C; F = C * 1.8 + 32; WYPISZ F" },
        { "problem": "Obliczanie ceny brutto z VAT 23%", "form": "Pseudokod liniowy", "representation": "WCZYTAJ netto; brutto = netto * 1.23; WYPISZ brutto" },
        { "problem": "Średnia arytmetyczna trzech liczb", "form": "Pseudokod liniowy", "representation": "WCZYTAJ x, y, z; suma = x + y + z; srednia = suma / 3; WYPISZ srednia" },
        { "problem": "Zamiana wartości dwóch zmiennych (z temp)", "form": "Pseudokod liniowy", "representation": "temp = a; a = b; b = temp" },
        { "problem": "Obliczanie reszty z dzielenia", "form": "Pseudokod liniowy", "representation": "WCZYTAJ a, b; reszta = a % b; WYPISZ reszta" },
        { "problem": "Droga w ruchu jednostajnym", "form": "Pseudokod liniowy", "representation": "WCZYTAJ v, t; s = v * t; WYPISZ s" },
        { "problem": "Kolejne potęgi liczby x (kwadrat, sześcian)", "form": "Pseudokod liniowy", "representation": "WCZYTAJ x; kwadrat = x * x; szescian = kwadrat * x; WYPISZ kwadrat, szescian" },
        { "problem": "Obwód koła o promieniu r", "form": "Pseudokod liniowy", "representation": "WCZYTAJ r; pi = 3.14; obwod = 2 * pi * r; WYPISZ obwod" },
        { "problem": "Zysk z lokaty rocznej (podatek 19%)", "form": "Pseudokod liniowy", "representation": "WCZYTAJ kwota, opr; zysk = (kwota * opr) * 0.81; WYPISZ zysk" }
      ]
    }
  },
  {
    "id": "ALG.PSEUDO.PP.ERROR.03",
    "topic": "algorytmy",
    "subtopic": "alg_pseudokod",
    "curriculum_level": "PP",
    "type": "error",
    "taskSubtypes": ["error_find", "closed_tf", "open_explain"],
    "content": {
      "definition": "",
      "raw": [
        { "bad_expr": "wynik = a + b; WCZYTAJ a, b; WYPISZ wynik", "fix": "Próba wykonania obliczeń przed wczytaniem wartości. Przenieś linię z obliczeniem po instrukcji WCZYTAJ.", "error_type": "Zaburzenie chronologii" },
        { "bad_expr": "WCZYTAJ r; pole = 3.14 * r * r", "fix": "Algorytm kończy pracę bez przekazania wyniku użytkownikowi. Należy na końcu dodać instrukcję WYPISZ pole.", "error_type": "Brak danych wyjściowych" },
        { "bad_expr": "brutto = netto * 1.23; WYPISZ brutto", "fix": "Zmienna 'netto' nie została nigdzie zdefiniowana ani wczytana. Dodaj na początku WCZYTAJ netto.", "error_type": "Niezainicjalizowana zmienna" },
        { "bad_expr": "WCZYTAJ a, b; WYPISZ a + b", "fix": "Choć poprawne logicznie, dobrą praktyką jest przypisanie wyniku do zmiennej, np. suma = a + b, przed wypisaniem.", "error_type": "Zła kultura zapisu" },
        { "bad_expr": "WCZYTAJ bok; pole = bok x bok", "fix": "Użyto litery 'x' jako znaku mnożenia. W pseudokodzie i programowaniu standardem jest gwiazdka '*'.", "error_type": "Błędny operator matematyczny" },
        { "bad_expr": "WCZYTAJ a; b = 5; pole = a * B; WYPISZ pole", "fix": "Wielkość liter ma znaczenie. Zmienna 'b' została zadeklarowana małą literą, a użyta wielką 'B'.", "error_type": "Literówka w nazwie zmiennej" },
        { "bad_expr": "poczatek: WCZYTAJ x; y = x * 2; idź do poczatek", "fix": "Używanie instrukcji skoku (goto) niszczy strukturę sekwencyjną. Do powtórzeń należy stosować pętle.", "error_type": "Nieustrukturyzowany skok" },
        { "bad_expr": "WCZYTAJ x; x + 1 = x; WYPISZ x", "fix": "Błędny kierunek przypisania. Zmienna modyfikowana musi być zawsze po lewej stronie operatora: x = x + 1.", "error_type": "Błąd przypisania wartości" },
        { "bad_expr": "Zapis: 'Weź dwie liczby i zrób z nich średnią'", "fix": "Zbyt potoczny opis. Zastąp matematycznym przypisaniem, np. srednia = (a + b) / 2.", "error_type": "Zbyt niski poziom sformalizowania" },
        { "bad_expr": "WCZYTAJ a; WCZYTAJ b; s = a + b / 2; WYPISZ s", "fix": "Brak nawiasów wymuszających pierwszeństwo dodawania nad dzieleniem przy średniej: s = (a + b) / 2.", "error_type": "Błąd priorytetu operatorów" }
      ]
    }
  },
  {
    "id": "ALG.PSEUDO.PP.STRUCTURE.04",
    "topic": "algorytmy",
    "subtopic": "alg_pseudokod",
    "curriculum_level": "PP",
    "type": "structure",
    "taskSubtypes": ["match_pair", "match_fill"],
    "content": {
      "definition": "",
      "raw": [
        { "step": "Deklaracja nagłówka", "action": "Opcjonalna nazwa algorytmu na samej górze zapisu, określająca jego przeznaczenie." },
        { "step": "Inicjalizacja środowiska", "action": "Ustawienie wartości początkowych dla stałych globalnych (np. pi = 3.14) przed pobraniem danych." },
        { "step": "Strumień wejściowy", "action": "Wczytanie zmiennych od użytkownika za pomocą słów kluczowych POBIERZ/WCZYTAJ." },
        { "step": "Przetwarzanie danych", "action": "Wykonanie operacji arytmetycznych i zapisanie ich rezultatów do nowych zmiennych." },
        { "step": "Strumień wyjściowy", "action": "Przekazanie obliczonego wyniku końcowego na ekran komendą WYPISZ." },
        { "step": "Kolejność linii", "action": "Zasada mówiąca, że kompilacja myślowa odbywa się wyłącznie od góry do dołu, linia po linii." },
        { "step": "Znak końca instrukcji", "action": "Opcjonalny średnik lub przejście do nowej linii, separujące dwa niezależne polecenia." },
        { "step": "Zasięg zmiennej", "action": "Zasada, według której zmienna staje się dostępna w strukturze dopiero po linii, w której została wczytana lub zdefiniowana." },
        { "step": "Skończoność opisu", "action": "Ograniczenie liczby linii kodu, zapewniające, że algorytm liniowy zawsze osiągnie koniec." },
        { "step": "Jednoznaczność instrukcji", "action": "Każda linia musi opisywać dokładnie jedną, prostą operację matematyczną lub logiczną." }
      ]
    }
  },
  {
    "id": "ALG.PSEUDO.PP.CONCEPT.05",
    "topic": "algorytmy",
    "subtopic": "alg_pseudokod",
    "curriculum_level": "PP",
    "type": "concept",
    "taskSubtypes": ["closed_single", "closed_tf", "open_explain"],
    "content": {
      "definition": "Instrukcja warunkowa (JEŻELI) wprowadza do pseudokodu mechanizm podejmowania decyzji. Pozwala na wykonanie określonych bloków instrukcji tylko wtedy, gdy dany warunek logiczny jest spełniony.",
      "raw": [
        { "term": "Warunek prosty", "desc": "Instrukcja typu 'JEŻELI ... WTEDY', która wykonuje akcję tylko dla prawdy, pomijając fałsz." },
        { "term": "Warunek pełny (alternatywa)", "desc": "Konstrukcja 'JEŻELI ... WTEDY ... W PRZECIWNYM WYPADKU', obsługująca obie ścieżki logiczne." },
        { "term": "Wartość logiczna", "desc": "Wynik sprawdzenia warunku, przyjmujący wyłącznie jedną z dwóch wartości: PRAWDA (true) lub FAŁSZ (false)." },
        { "term": "Spójnik logiczny ORAZ (AND)", "desc": "Wymaga jednoczesnego spełnienia wszystkich połączonych warunków składowych, aby wynik był prawdą." },
        { "term": "Spójnik logiczny LUB (OR)", "desc": "Wymaga spełnienia przynajmniej jednego z warunków składowych, aby całe wyrażenie było prawdziwe." },
        { "term": "Negacja NIE (NOT)", "desc": "Operator zmieniający wartość logiczną warunku na przeciwną (odwraca prawdę w fałsz)." },
        { "term": "Warunek złożony", "desc": "Wyrażenie logiczne zbudowane z kilku warunków prostych połączonych operatorami ORAZ, LUB lub NIE." },
        { "term": "Gałąź TAK", "desc": "Część instrukcji warunkowej wykonywana wtedy, gdy sprawdzany warunek logiczny jest spełniony." },
        { "term": "Gałąź NIE", "desc": "Część instrukcji warunkowej wykonywana wtedy, gdy sprawdzany warunek logiczny nie jest spełniony." },
        { "term": "Zagnieżdżona instrukcja warunkowa", "desc": "Instrukcja JEŻELI umieszczona wewnątrz innej instrukcji warunkowej, używana do sprawdzania kolejnych przypadków." }
      ]
    }
  },





/*
docelowy standard dla nazw subtopiców to: topic_subtopic (np. algorytmy_systemy_pozycyjne, programowanie_petla_while, programowanie_funkcje, programowanie_tablice)
const SUBTOPIC_IDS = {
  // algorytmy
  SYSTEMY_POZYCYJNE: "sys_pozycyjne",
  SYSTEM_BINARNY: "sys_binarny",
  KONWERSJA_BIN_DEC: "konwersja_bin_dec",
  KONWERSJA_DEC_BIN: "konwersja_dec_bin",
  ALG_REPREZENTACJE: "alg_reprezentacje",
  ALG_LISTA_KROKOW: "alg_lista_krokow",
  ALG_SCHEMAT_BLOKOWY: "alg_schemat_blokowy",
  ALG_PSEUDOKOD: "alg_pseudokod", 
};

*/













];