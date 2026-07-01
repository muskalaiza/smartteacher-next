export const programowanieUnits = [


//PROGRAMOWANIE - ZMIENNE

  {
    "id": "PROG.VAR.PP.CONCEPT.01",
    "topic": "programowanie",
    "subtopic": "prog_zmienne",
    "curriculum_level": "PP",
    "language": ["C++", "Python"],
    "type": "concept",
    "taskSubtypes": ["closed_single", "closed_tf", "match_fill", "match_pair", "open_explain"],
    "content": {
      "definition": "Zmienna to nazwane miejsce w pamięci operacyjnej komputera, które służy do przechowywania danych. Każda zmienna charakteryzuje się nazwą, adresem, wartością oraz typem danych.",
      "tip":[
{ "title": "Deklaracja i inicjalizacja zmiennej w C++", 
  "text": "Deklaracja określa typ i nazwę zmiennej. Inicjalizacja dodatkowo nadaje zmiennej wartość początkową.", 
  "code": "typ nazwa_zmiennej;\ntyp nazwa_zmiennej = wartość;" 
}, 
{ "title": "Przypisanie wartości", 
  "text": "Operator przypisania zapisuje wartość pod wskazaną nazwą. Kolejne przypisanie powoduje, że zmienna otrzymuje nową wartość.", 
  "code": "nazwa_zmiennej = wartość\nnazwa_zmiennej = nowa_wartość" 
} 
      ],
      "raw": [
        { "term": "Typ zmiennej", "desc": "Określa rodzaj danych przechowywanych w zmiennej oraz zestaw operacji, jakie można na niej wykonać." },
        { "term": "Identyfikator", "desc": "Unikalna nazwa zmiennej, która pozwala na odwołanie się do przypisanej jej komórki pamięci w kodzie programu." },
        { "term": "Deklaracja", "desc": "Poinformowanie kompilatora lub interpretera o istnieniu zmiennej i jej typie przed jej pierwszym użyciem." },
        { "term": "Inicjalizacja", "desc": "Operacja polegająca na przypisaniu zmiennej jej pierwszej, początkowej wartości w momencie tworzenia." },
        { "term": "Zmienna lokalna", "desc": "Zmienna utworzona wewnątrz bloku kodu (np. funkcji), widoczna i dostępna tylko w tym konkretnym obszarze." },
        { "term": "Zmienna globalna", "desc": "Zmienna zadeklarowana poza funkcjami, do której dostęp ma każda część programu przez cały czas jego działania." },
        { "term": "Stała (const)", "desc": "Specjalny rodzaj zmiennej, której wartość po zainicjalizowaniu nie może ulec zmianie w trakcie wykonywania programu." },
        { "term": "Typowanie dynamiczne", "desc": "Cecha języka (np. Python), w którym typ zmiennej jest dopasowywany automatycznie w locie na podstawie przypisanej wartości." },
        { "term": "Typowanie statyczne", "desc": "Cecha języka (np. C++), wymagająca jawnego określenia typu zmiennej, który nie może ulec zmianie na inny typ w trakcie działania programu." },
        { "term": "Słowo kluczowe", "desc": "Zastrzeżony wyraz w języku programowania (np. int, float, global), którego nie można użyć jako własnej nazwy zmiennej." },
        { "term": "Przypisanie", "desc": "Instrukcja wiążąca nazwę zmiennej z wartością lub zapisująca nową wartość do istniejącej zmiennej." },
        { "term": "Nadpisanie wartości", "desc": "Ponowne przypisanie wartości do tej samej zmiennej, przez co poprzednia wartość przestaje być dostępna przez tę nazwę." },
        { "term": "Zasięg zmiennej", "desc": "Fragment programu, w którym nazwa zmiennej jest widoczna i może zostać użyta." },
        { "term": "Rzutowanie / konwersja typu", "desc": "Jawna lub niejawna zmiana sposobu interpretowania wartości jako innego typu danych." }
      ]
    }
  },
  {
    "id": "PROG.VAR.PP.TASK.02",
    "topic": "programowanie",
    "subtopic": "prog_zmienne",
    "curriculum_level": "PP",
    "language": ["C++", "Python"],
    "type": "task",
    "taskSubtypes": ["closed_single", "closed_tf", "match_fill", "open_explain"],
    "content": {
      "definition": "",
      "raw": [
        { "expr": "a = 3; b = a; a = 8", "base": "Python", "target": "Kopiowanie aktualnej wartości", "equation": "Zmiana wartości przypisanej później do a nie zmienia wartości wcześniej przypisanej do b."},
        { "expr": "x = 5", "base": "Python", "target": "Wartość całkowita", "equation": "Zmienna x przechowuje teraz obiekt typu int o wartości 5" },
        { "expr": "int y = 10;", "base": "C++", "target": "Deklaracja z inicjalizacją", "equation": "Rezerwacja pamięci dla liczby całkowitej y i wpisanie wartości 10" },
        { "expr": "x += 3", "base": "Uniwersalny", "target": "Inkrementacja", "equation": "Pobranie starej wartości x, dodanie do niej 3 i zapisanie nowego wyniku w x" },
        { "expr": "float g = 9.81;", "base": "C++", "target": "Liczba zmiennoprzecinkowa", "equation": "Inicjalizacja zmiennej g przechowującej precyzyjną wartość ułamkową" },
        { "expr": "czy_koniec = True", "base": "Python", "target": "Typ logiczny", "equation": "Przypisanie zmiennej logicznej (bool) stanu prawdy za pomocą słowa True" },
        { "expr": "string s = \"kod\";", "base": "C++", "target": "Ciąg znaków", "equation": "Utworzenie obiektu tekstowego zawierającego sekwencję znaków" },
        { "expr": "a, b = 1, 2", "base": "Python", "target": "Przypisanie wielokrotne", "equation": "Jednoczesne nadanie wartości 1 dla zmiennej a oraz wartości 2 dla zmiennej b" },
        { "expr": "const double PI = 3.14;", "base": "C++", "target": "Definicja stałej", "equation": "Zablokowanie możliwości modyfikacji wartości PI w dalszych liniach programu" },
        { "expr": "x += 1", "base": "Uniwersalny", "target": "Operator przypisania", "equation": "Skrócony zapis operacji x = x + 1 zwiększający wartość o jeden" },
        { "expr": "wynik = str(100)", "base": "Python", "target": "Konwersja typu", "equation": "Rzutowanie liczby całkowitej 100 na ciąg tekstowy '100' przed zapisem" },
        { 
  "expr": "a = 4; b = a; a = 9;",
  "base": "Uniwersalny",
  "target": "Kopiowanie wartości",
  "equation": "Po przypisaniu b = a zmienna b przechowuje wartość 4; późniejsza zmiana a na 9 nie zmienia wartości b."
},
{
  "expr": "licznik = 0; licznik += 1; licznik += 1",
  "base": "Python",
  "target": "Wielokrotne przypisanie",
  "equation": "Każda kolejna instrukcja przypisania oblicza nową wartość na podstawie aktualnej wartości zmiennej."
},
{
  "expr": "int a = 2; int b = 3; int temp = a; a = b; b = temp;",
  "base": "C++",
  "target": "Zamiana wartości zmiennych",
  "equation": "Zmienna pomocnicza temp przechowuje pierwotną wartość a, aby nie została utracona podczas nadpisania."
},
{
  "expr": "wiek = int(input())",
  "base": "Python",
  "target": "Pobranie i konwersja danych wejściowych",
  "equation": "Wynik input() jest konwertowany na int, aby można go było wykorzystać w obliczeniach liczbowych."
}
      ]
    }
  },

  {
    "id": "PROG.VAR.PP.ERROR.03",
    "topic": "programowanie",
    "subtopic": "prog_zmienne",
    "curriculum_level": "PP",
    "language": ["C++", "Python"],
    "type": "error",
    "taskSubtypes": ["error_find", "closed_tf", "open_explain"],
    "content": {
      "definition": "",
      "raw": [
        { "bad_expr": "int 3licznik = 10;", "fix": "Nazwa zmiennej nie może rozpoczynać się od cyfry. Powinno być: int licznik3 = 10;", "error_type": "Niepoprawny identyfikator" },
        { 
  "bad_expr": "int x = \"5\";",
  "fix": "Do zmiennej typu int nie można przypisać literału tekstowego. Poprawnie: int x = 5; albo string x = \"5\";",
  "error_type": "Niezgodność typu liczbowego i tekstowego"
},
        { "bad_expr": "x = 5 (w C++ bez wcześniejszej deklaracji)", "fix": "W C++ każda zmienna musi mieć jawnie określony typ przed użyciem, np. int x = 5;", "error_type": "Brak deklaracji zmiennej" },
        { "bad_expr": "moja zmienna = 20", "fix": "Nazwa zmiennej nie może zawierać spacji. Należy użyć zapisu moja_zmienna lub mojaZmienna.", "error_type": "Spacja w nazwie" },
        { "bad_expr": "int float = 5;", "fix": "Użyto zastrzeżonego słowa kluczowego 'float' jako nazwy zmiennej, co jest zabronione.", "error_type": "Użycie słowa kluczowego" },
        { "bad_expr": "const int MAX = 100; MAX = 200;", "fix": "Próba modyfikacji wartości stałej (const) po jej zainicjalizowaniu generuje błąd kompilacji.", "error_type": "Modyfikacja stałej" },
        { "bad_expr": "tekst = \"Wynik: \" + 5 (w Python)", "fix": "Python nie pozwala na bezpośrednie dodawanie tekstu do liczby. Wymagane jest jawne rzutowanie: \"Wynik: \" + str(5)", "error_type": "Błąd silnego typowania" },
        { "bad_expr": "int a; int b = a + 5;", "fix": "Użycie zmiennej 'a' przed przypisaniem jej wartości skutkuje operowaniem na losowych danych z pamięci (garbage values).", "error_type": "Niezainicjalizowana zmienna" },
        { "bad_expr": "Modyfikacja zmiennej lokalnej poza jej funkcją", "fix": "Zmienne lokalne przestają istnieć po zakończeniu działania funkcji i nie są dostępne w bloku nadrzędnym.", "error_type": "Błąd zasięgu zmiennej" },
        { "bad_expr": "int x = 10; x = \"Jan\"; (w C++)", "fix": "W językach statycznie typowanych nie można zmienić typu przechowywanych danych w trakcie działania programu.", "error_type": "Zmiana typu w locie" },
        {
  "bad_expr": "int suma = 0; suma + 5;",
  "fix": "Wyrażenie suma + 5 oblicza wartość, ale nie zapisuje jej w zmiennej. Poprawnie: suma = suma + 5; albo suma += 5;",
  "error_type": "Brak przypisania wyniku"
},
{
  "bad_expr": "x += 1; // gdy x nie ma wcześniejszej wartości",
  "fix": "Zmienna musi mieć wcześniejszą wartość, zanim zostanie użyta po prawej stronie przypisania. Najpierw należy ją zainicjalizować, np. x = 0;",
  "error_type": "Użycie zmiennej przed inicjalizacją"
},
{
  "bad_expr": "int cena brutto = 20;",
  "fix": "Identyfikator nie może zawierać spacji. Poprawnie: int cena_brutto = 20; albo int cenaBrutto = 20;",
  "error_type": "Niepoprawny identyfikator"
},
{
  "bad_expr": "licznik == licznik + 1;",
  "fix": "Operator == służy do porównania, a nie do przypisania. Poprawnie: licznik = licznik + 1; albo licznik += 1;",
  "error_type": "Porównanie zamiast przypisania"
}
      ]
    } 
  },
  {
    "id": "PROG.VAR.PP.STRUCTURE.04",
    "topic": "programowanie",
    "subtopic": "prog_zmienne",
    "curriculum_level": "PP",
    "language": ["C++", "Python"],
    "type": "structure",
    "taskSubtypes": ["match_pair", "match_fill", "open_explain", "open_code"],
    "content": {
      "definition": "",
      "raw": [
        { "step": "Deklaracja typu zmiennej", "action": "Wskaż typ danych w C++ (np. int) i podaj unikalną nazwę, aby zarezerwować odpowiedni obszar w pamięci RAM." },
        { "step": "Dynamiczne przypisanie", "action": "W Pythonie napisz nazwę zmiennej, postaw znak '=' i podaj wartość – interpreter sam określi typ w pamięci." },
        { "step": "Operacja zamiany (Swap)", "action": "Skorzystaj ze zmiennej pomocniczej (temp), aby tymczasowo przechować wartość przed nadpisaniem drugiej zmiennej." },
        { "step": "Inkrementacja w pętli", "action": "Zwiększ wartość zmiennej licznikowej o jeden przy każdym obrocie pętli, aby kontrolować liczbę powtórzeń." },
        { "step": "Akumulacja sumy", "action": "Zainicjalizuj zmienną wartością 0, a następnie w pętli dodawaj do niej kolejne napotkane liczby." },
        { "step": "Wyznaczanie flagi stanu", "action": "Ustaw zmienną logiczną na False i zmień ją na True tylko wtedy, gdy określony warunek zostanie spełniony." },
        { "step": "Zliczanie wystąpień", "action": "Uruchom licznik z wartością początkową 0 i wykonuj instrukcję warunkową inkrementującą go przy sukcesie." },
        { "step": "Pobieranie danych (Input)", "action": "Wywołaj funkcję wejścia (np. cin lub input()) i przypisz pobrany od użytkownika strumień bezpośrednio do zmiennej." },
        { "step": "Zwalnianie pamięci", "action": "W C++ po wyjściu z bloku pamięć zmiennej lokalnej jest zwalniana automatycznie, w Pythonie dba o to Garbage Collector." },
        { "step": "Nadpisywanie zmiennej", "action": "Wprowadź nową wartość do istniejącej zmiennej, co automatycznie wymaże jej poprzednią zawartość z pamięci." },
        {
  "step": "Śledzenie tabeli wartości",
  "action": "Zapisuj kolejne wartości zmiennych po każdej instrukcji przypisania, aby przeanalizować zmianę stanu programu."
},
{
  "step": "Rozdzielenie danych wejściowych i wyniku",
  "action": "Użyj osobnych zmiennych dla danych pobranych od użytkownika i dla wyniku obliczeń, aby uniknąć przypadkowego nadpisania wartości."
},
{
  "step": "Dobór identyfikatora do roli zmiennej",
  "action": "Nadaj zmiennej nazwę opisującą jej funkcję w programie, np. suma, licznik, cenaNetto, zamiast nazw przypadkowych typu x1."
},
{
  "step": "Konwersja przed obliczeniem",
  "action": "Przed wykonaniem działania matematycznego upewnij się, że wartość tekstowa została przekonwertowana na typ liczbowy."
}
      ]
    }
  },

  // TYPY DANYCH
  
  {
    "id": "PROG.TYPE.PP.CONCEPT.01",
    "topic": "programowanie",
    "subtopic": "prog_typy_danych",
    "curriculum_level": "PP",
    "language": ["C++", "Python"],
    "type": "concept",
    "taskSubtypes": ["closed_single", "closed_tf", "match_fill", "match_pair", "open_explain"],
    "content": {
      "definition": "Typ danych określa rodzaj wartości przechowywanej w zmiennej oraz zestaw operacji, jakie można na niej wykonywać. W C++ typ zmiennej trzeba zadeklarować jawnie, a w Pythonie jest on wykrywany automatycznie.",
"tip": [
  {
    "title": "Podstawowe typy danych w C++",
    "text": "W C++ typ danych zapisuje się przed nazwą zmiennej.",
    "code": "int nazwa_calkowitej;\nfloat nazwa_rzeczywistej;\ndouble nazwa_precyzyjnej;\nchar nazwa_znaku;\nstd::string nazwa_tekstu;\nbool nazwa_logicznej;"
  },
  {
    "title": "Sprawdzanie i konwersja typu w Pythonie",
    "text": "Funkcja type() pozwala sprawdzić typ zmiennej, a funkcje int(), float(), str() i bool() wykonują jawną konwersję wartości.",
    "code": "type(nazwa_zmiennej)\nint(wartosc)\nfloat(wartosc)\nstr(wartosc)\nbool(wartosc)"
  }
],
      "raw": [
        { "term": "Typ całkowity (int)", "desc": "Służy do przechowywania liczb całkowitych dodatnich, ujemnych oraz zera (np. 15, -3, 0) bez części ułamkowej." },
        { "term": "Typ zmiennoprzecinkowy (float)", "desc": "Reprezentuje liczby rzeczywiste posiadające część ułamkową (np. 3.14, -0.5), oddzieloną kropką." },
        { "term": "Typ znakowy (char)", "desc": "Przechowuje pojedynczy znak alfanumeryczny lub specjalny, zapisywany w C++ w apostrofach (np. 'A')." },
        { "term": "Typ tekstowy (string)", "desc": "Klasa lub typ reprezentujący sekwencję (ciąg) znaków, zapisywany w cudzysłowach (np. \"Anna\")." },
        { "term": "Typ logiczny (bool)", "desc": "Przyjmuje jedną z dwóch wartości reprezentujących stan logiczny: prawda (true/True) lub fałsz (false/False)." },
        { "term": "Typ podwójnej precyzji (double)", "desc": "Typ zmiennoprzecinkowy w C++ oferujący większą dokładność i dwa razy większy rozmiar pamięci niż standardowy float." },
        { "term": "Rzutowanie typów (casting)", "desc": "Świadoma konwersja wartości jednego typu danych na inny typ (np. zamiana liczby na tekst)." },
        { "term": "Niejawna konwersja", "desc": "Automatyczne przekształcenie typu przez kompilator lub interpreter (np. dodanie int do float daje wynik float)." },
        { "term": "Przepełnienie typu (overflow)", "desc": "Sytuacja, w której przypisana wartość przekracza maksymalny dopuszczalny limit pamięci przewidziany dla danego typu danych." },
        { "term": "Typ dynamiczny", "desc": "Mechanizm (np. w Pythonie), w którym ta sama zmienna może w trakcie działania programu zmieniać typ przechowywanych danych." }
      ]
    }
  },
  {
    "id": "PROG.TYPE.PP.TASK.02",
    "topic": "programowanie",
    "subtopic": "prog_typy_danych",
    "curriculum_level": "PP",
    "language": ["C++", "Python"],
    "type": "task",
    "taskSubtypes": ["closed_single", "closed_tf", "match_fill", "open_explain"],
    "content": {
      "definition": "",
      "raw": [
        { "expr": "Wiek użytkownika", "base": "Uniwersalny", "target": "int", "equation": "Wartość dyskretna, bez części ułamkowej – np. 16." },
        { "expr": "Cena netto produktu", "base": "Uniwersalny", "target": "float / double", "equation": "Wartość finansowa wymagająca zapisu groszy po kropce – np. 12.99." },
        { "expr": "Stan subskrypcji", "base": "Uniwersalny", "target": "bool", "equation": "Przechowuje flagę tak/nie, czyli informację czy konto jest aktywne." },
        { "expr": "5 == 5.0", "base": "Python", "target": "True (bool)", "equation": "Niejawna konwersja int do float wyrównuje wartości przed porównaniem matematycznym." },
        { "expr": "10 == \"10\"", "base": "Python", "target": "False (bool)", "equation": "Liczba całkowita i ciąg znaków są różnymi typami, więc ich porównanie daje fałsz." },
        { "expr": "True == 1", "base": "Python", "target": "True (bool)", "equation": "W strukturze logicznej Pythona wartość True jest interpretowana numerycznie jako 1." },
        { "expr": "\"Program\" + \"owanie\"", "base": "Uniwersalny", "target": "string", "equation": "Operacja konkatenacji (sklejania) łączy dwa teksty w jeden: \"Programowanie\"." },
        { "expr": "5 / 2 (w int wynik)", "base": "C++", "target": "2 (int)", "equation": "Dzielenie dwóch liczb całkowitych odrzuca część ułamkową (obcina do 2)." },
        { "expr": "float temperatura = -3.5;", "base": "C++", "target": "Deklaracja zmiennoprzecinkowa", "equation": "Zapis temperatury z uwzględnieniem znaku minus oraz wartości po kropce." },
        { "expr": "Inicjał nazwiska", "base": "C++", "target": "char", "equation": "Pojedyncza litera alfabetu zajmująca 1 bajt pamięci – np. 'K'." }
      ]
    }
  },
  {
    "id": "PROG.TYPE.PP.ERROR.03",
    "topic": "programowanie",
    "subtopic": "prog_typy_danych",
    "curriculum_level": "PP",
    "language": ["C++", "Python"],
    "type": "error",
    "taskSubtypes": ["error_find", "closed_tf", "open_explain"],
    "content": {
      "definition": "",
      "raw": [
        { "bad_expr": "int cena = 12.99;", "fix": "Użycie typu całkowitego odetnie część ułamkową. Cena zmieni się na 12. Należy użyć typu float lub double.", "error_type": "Utrata precyzji danych" },
        { "bad_expr": "float imie = 'Anna';", "fix": "Typ float służy do przechowywania liczb rzeczywistych, a nie tekstu. Powinno być: string imie = \"Anna\";", "error_type": "Przypisanie tekstu do liczby" },
        { "bad_expr": "string wiek = 16;", "fix": "Próba bezpośredniego przypisania liczby do obiektu tekstowego bez cudzysłowu w C++ generuje błąd kompilacji.", "error_type": "Niejawne naruszenie typu string" },
        { "bad_expr": "string suma = 5 + 7;", "fix": "Wynikiem dodawania 5 + 7 jest liczba int (12). Nie można przypisać jej bezpośrednio do typu string.", "error_type": "Zły typ zmiennej wynikowej" },
        { "bad_expr": "print('Wynik: ' + 5) [w Python]", "fix": "Python nie pozwala na konkatenację tekstu i liczby. Należy użyć jawnej konwersji: print('Wynik: ' + str(5))", "error_type": "Błąd silnego typowania dynamicznego" },
        { "bad_expr": "int wynik = 5 / 2;", "fix": "Operacja 5 / 2 w C++ na liczbach całkowitych da wynik 2. Jeśli oczekujemy 2.5, dzielna lub dzielnik musi być typu float (np. 5.0 / 2).", "error_type": "Niepożądane dzielenie całkowite" },
        { "bad_expr": "bool imie = \"Jan\";", "fix": "Zmienna logiczna (bool) przyjmuje tylko true lub false. Tekst \"Jan\" nie reprezentuje czystego stanu logicznego w deklaracji C++.", "error_type": "Nadpisanie typu logicznego" },
        { "bad_expr": "wiek = '16' \\n print(wiek + 1) [w Python]", "fix": "Zmienna 'wiek' zawiera tekst (str). Próba dodania do niej liczby 1 wywoła błąd TypeError. Powinno być: int(wiek) + 1", "error_type": "Operacja matematyczna na tekście" },
        { "bad_expr": "char znak = \"XYZ\";", "fix": "Typ char przechowuje wyłącznie jeden znak i wymaga apostrofów. Do ciągów znaków w cudzysłowie służy string.", "error_type": "Mylenie char ze string" },
        { "bad_expr": "cout << 'Wynik: ' + wynik; [w C++]", "fix": "Użycie apostrofów dla dłuższego tekstu 'Wynik: ' oraz operatora '+' zamiast strumienia '<<' prowadzi do błędów arytmetyki wskaźników.", "error_type": "Błędna składnia strumienia" }
      ]
    }
  },
  {
    "id": "PROG.TYPE.PP.STRUCTURE.04",
    "topic": "programowanie",
    "subtopic": "prog_typy_danych",
    "curriculum_level": "PP",
    "language": ["C++", "Python"],
    "type": "structure",
    "taskSubtypes": ["match_pair", "match_fill", "open_explain", "open_code"],
    "content": {
      "definition": "",
      "raw": [
        { "step": "Identyfikacja danych wejściowych", "action": "Analizuj strukturę informacji (obecność przecinka, liter, stanów logicznych) w celu określenia kategorii danych." },
        { "step": "Weryfikacja zakresu wartości", "action": "Sprawdź, czy dana liczba zmieści się w standardowym zakresie (int), czy wymaga użycia struktur o większej pojemności." },
        { "step": "Jawna konwersja (Rzutowanie)", "action": "Zastosuj funkcję konwertującą (np. int() w Pythonie lub static_cast w C++), aby bezpiecznie zmienić typ przed obliczeniami." },
        { "step": "Walidacja strumienia wejścia", "action": "Upewnij się, że użytkownik wprowadzający dane z klawiatury podał typ zgodny z oczekiwanym przez instrukcję pobierania." },
        { "step": "Zabezpieczenie operacji", "action": "Wprowadź warunek blokujący wykonanie dzielenia zmiennych całkowitych przed upewnieniem się, że wynik nie zostanie zniekształcony." },
        { "step": "Izolacja danych tekstowych", "action": "Otocz ciągi liter cudzysłowami (lub apostrofami w Pythonie), informując interpreter o przetwarzaniu typu str/string." },
        { "step": "Konkatenacja bezpieczna", "action": "Przekształć wszystkie składowe zmienne numeryczne na tekst przed wywołaniem operacji łączenia napisów wyjściowych." },
        { "step": "Określenie flagi warunkowej", "action": "Przypisz wynik operacji porównania (np. a > b) bezpośrednio do zmiennej typu bool jako stan czysty." },
        { "step": "Automatyczna dedukcja typu", "action": "Wykorzystaj słowo kluczowe auto w C++ (lub mechanizm Pythona), by kompilator sam dopasował typ na podstawie wyrażenia." },
        { "step": "Formatowanie wyjścia", "action": "Wymuś precyzję wyświetlania liczb zmiennoprzecinkowych za pomocą modyfikatorów, aby poprawnie prezentować ułamki." }
      ]
    }
  },

  // WARUNKI
  {
    "id": "PROG.IF.PP.CONCEPT.01",
    "topic": "programowanie",
    "subtopic": "prog_warunki",
    "curriculum_level": "PP",
    "language": ["C++", "Python"],
    "type": "concept",
    "taskSubtypes": ["closed_single", "closed_tf", "match_fill", "match_pair", "open_explain"],
    "content": {
      "definition": "Instrukcja warunkowa steruje działaniem programu w zależności od tego, czy warunek logiczny jest spełniony czy nie (TRUE/FALSE). Warunki mogą być proste lub złożone i mogą wykorzystywać operatory logiczne (AND, OR, NOT).",
       "tip": [
    {
      "title": "Instrukcja if — pojedynczy warunek",
      "text": "Wykonuje blok kodu tylko wtedy, gdy warunek jest prawdziwy.",
      "code": "if (warunek) {\n  // kod wykonany, gdy warunek jest spełniony\n}"
    },
    {
      "title": "Instrukcja if ... else — alternatywa",
      "text": "Wykonuje pierwszy blok, gdy warunek jest prawdziwy, albo drugi blok, gdy warunek jest fałszywy.",
      "code": "if (warunek) {\n  // kod A\n} else {\n  // kod B\n}"
    }
  ],
      "raw": [
        { "term": "Warunek prosty", "desc": "Wyrażenie logiczne wykorzystujące pojedynczy operator relacyjny (np. x > 5) zwracające true lub false." },
        { "term": "Warunek złożony", "desc": "Wyrażenie składające się z kilku warunków prostych połączonych operatorami logicznymi (np. AND, OR)." },
        { "term": "Operator AND (&& / and)", "desc": "Koniunkcja logiczna; cały warunek złożony jest prawdziwy tylko wtedy, gdy wszystkie jego składowe są prawdziwe." },
        { "term": "Operator OR (|| / or)", "desc": "Alternatywa logiczna; warunek złożony jest prawdziwy, jeśli co najmniej jedna z jego składowych jest prawdziwa." },
        { "term": "Operator NOT (! / not)", "desc": "Negacja logiczna; odwraca wartość logiczną wyrażenia (z prawdy robi fałsz, a z fałszu prawdę)." },
        { "term": "Instrukcja else / elif", "desc": "Słowa kluczowe definiujące alternatywne bloki kodu do wykonania, gdy główny warunek początkowy okazał się fałszywy." },
        { "term": "Zagnieżdżenie warunków", "desc": "Umieszczenie jednej instrukcji warunkowej wewnątrz bloku kodu innej instrukcji warunkowej." },
        { "term": "Zwarcie logiczne (Short-circuit)", "desc": "Optymalizacja polegająca na przerwaniu sprawdzania warunku, gdy jego końcowy wynik jest już znany (np. fałsz w AND)." },
        { "term": "Instrukcja Switch / Match", "desc": "Struktura wielokrotnego wyboru stosowana zamiast ciągu if-else przy porównywaniu jednej zmiennej z wieloma stałymi wartościami." },
        { "term": "Prawa De Morgana", "desc": "Reguły logiczne pozwalające na przekształcanie i upraszczanie zanegowanych warunków złożonych (np. zaprzeczenie koniunkcji)." }
      ]
    }
  },
  {
    "id": "PROG.IF.PP.TASK.02",
    "topic": "programowanie",
    "subtopic": "prog_warunki",
    "curriculum_level": "PP",
    "language": ["C++", "Python"],
    "type": "task",
    "taskSubtypes": ["closed_single", "closed_tf", "match_fill", "open_explain"],
    "content": {
      "definition": "",
      "raw": [
        { "expr": "Parzystość i dodatniość", "base": "Uniwersalny", "target": "x > 0 && x % 2 == 0", "equation": "Sprawdzenie, czy liczba jest jednocześnie większa od zera oraz czy jej reszta z dzielenia przez 2 wynosi 0." },
        { "expr": "Przynależność do przedziału", "base": "Uniwersalny", "target": "x >= 5 && x <= 50", "equation": "Weryfikacja zakresu domkniętego od 5 do 50 z obowiązkowym użyciem operatora AND." },
        { "expr": "Alternatywa zakresów", "base": "Uniwersalny", "target": "(x >= 1 && x <= 10) || (x >= 20 && x <= 30)", "equation": "Sprawdzenie, czy liczba wpada w pierwszy przedział LUB w drugi przedział niezależnie od siebie." },
        { "expr": "Logowanie użytkownika", "base": "Python", "target": "login == 'admin' and haslo == '123'", "equation": "Dostęp zostanie przyznany wyłącznie przy jednoczesnej poprawności obu ciągów tekstowych." },
        { "expr": "Rabat wiekowy", "base": "C++", "target": "wiek < 18 || wiek > 65", "equation": "Zniżka przysługuje, jeśli klient spełnia przynajmniej jedno z kryteriów wiekowych." },
        { "expr": "Weryfikacja braku sesji", "base": "Python", "target": "not czy_zalogowany", "equation": "Odwrócenie stanu logicznego – warunek spełniony tylko dla niezalogowanych użytkowników." },
        { "expr": "Analiza x = 7 dla (x > 10 || x < 5)", "base": "Uniwersalny", "target": "False (bool)", "equation": "Liczba 7 nie jest większa od 10 ani mniejsza od 5, więc oba człony alternatywy są fałszywe." },
        { "expr": "Największa z trzech liczb (a, b, c)", "base": "Uniwersalny", "target": "Zagnieżdżony if lub sekwencja", "equation": "Porównanie 'a' z 'b', a następnie wygranego z 'c' w celu wyznaczenia maksimum." },
        { "expr": "Złożona walidacja bankowa", "base": "Uniwersalny", "target": "kwota <= saldo && kwota <= limit", "equation": "Wypłata dozwolona tylko wtedy, gdy środki są wystarczające oraz nie przekroczono limitu." },
        { "expr": "Negacja warunku !(A && B)", "base": "Uniwersalny", "target": "!A || !B", "equation": "Zastosowanie prawa De Morgana – zaprzeczenie koniunkcji jest równoważne alternatywie zaprzeczeń." }
      ]
    }
  },
  {
    "id": "PROG.IF.PP.ERROR.03",
    "topic": "programowanie",
    "subtopic": "prog_warunki",
    "curriculum_level": "PP",
    "language": ["C++", "Python"],
    "type": "error",
    "taskSubtypes": ["error_find", "closed_tf", "open_explain"],
    "content": {
      "definition": "",
      "raw": [
        { "bad_expr": "if (x = 0) { cout << \"zero\"; }", "fix": "Użyto operatora przypisania '=' zamiast operatora porównania '=='. Warunek zawsze przypisze 0, co logicznie oznacza fałsz.", "error_type": "Przypisanie zamiast porównania" },
        { "bad_expr": "if (0 < x < 10) { cout << \"w przedziale\"; }", "fix": "W C++ taki zapis nie działa matematycznie. Należy rozbić przedział na dwa warunki: if (0 < x && x < 10)", "error_type": "Seryjny zapis relacji" },
        { "bad_expr": "if (x > 0 || x < 10) { cout << \"zawsze prawda\"; }", "fix": "Użycie OR sprawia, że każda liczba rzeczywista spełnia ten warunek. Dla sprawdzenia przedziału należy użyć && (AND).", "error_type": "Zły operator logiczny w przedziale" },
        { "bad_expr": "if liczba > 1 and < 10: [w Python]", "fix": "Każdy warunek składowy w koniunkcji musi być pełnym wyrażeniem. Poprawnie: if liczba > 1 and liczba < 10:", "error_type": "Skrót myślowy w warunku" },
        { "bad_expr": "if (punkty >= 50); { cout << \"zdane\"; }", "fix": "Średnik postawiony bezpośrednio po nawiasie zamyka instrukcję warunkową. Blok w klamrach wykona się zawsze, bez względu na wynik if.", "error_type": "Średnik po instrukcji if" },
        { "bad_expr": "if (x != 5 || x != 10) { ... }", "fix": "Ten warunek jest zawsze prawdziwy, ponieważ liczba nie może być jednocześnie równa 5 i 10. Logicznie powinno być użyte &&.", "error_type": "Zawsze prawdziwa alternatywa" },
        { "bad_expr": "if (x > 10) { ... } else if (x > 100) { ... }", "fix": "Blok else if jest nieosiągalny. Każda liczba większa od 100 złapie się już do pierwszego if (x > 10). Należy odwrócić kolejność sprawdzania.", "error_type": "Zła kolejność eliminacji" },
        { "bad_expr": "Zły else w zagnieżdżeniu (bez klamer)", "fix": "W C++ instrukcja else domyślnie paruje się z najbliższym poprzedzającym ją if, chyba że klamry jawnie wskażą inaczej.", "error_type": "Problem wiszącego else" },
        { "bad_expr": "Brak wcięć w else w Pythonie", "fix": "W Pythonie słowo kluczowe else musi znajdować się na tym samym poziomie wcięcia (identacji), co odpowiadające mu instrukcja if.", "error_type": "Błąd wcięć składniowych" },
        { "bad_expr": "if (wynik == 0.3) { ... }", "fix": "Bezpośrednie porównanie liczb float operatorem '==' bywa zawodne przez błędy zaokrągleń w pamięci. Bezpieczniej sprawdzać przybliżenie (abs(a-b) < 0.00001).", "error_type": "Porównanie precyzji zmiennoprzecinkowej" }
      ]
    }
  },
  {
    "id": "PROG.IF.PP.STRUCTURE.04",
    "topic": "programowanie",
    "subtopic": "prog_warunki",
    "curriculum_level": "PP",
    "language": ["C++", "Python"],
    "type": "structure",
    "taskSubtypes": ["match_pair", "match_fill", "open_explain", "open_code"],
    "content": {
      "definition": "",
      "raw": [
        { "step": "Sformułowanie hipotezy głównej", "action": "Zdefiniuj podstawowe kryterium decyzyjne algorytmu (np. czy wejście spełnia główną regułę biznesową)." },
        { "step": "Dekompozycja na warunki proste", "action": "Rozbij wieloaspektowy problem logiczny na pojedyncze testy relacyjne za pomocą operatorów porównania." },
        { "step": "Dobór spójnika logicznego", "action": "Zastosuj operator koniunkcji (AND) dla wymogu równoczesności lub alternatywy (OR) dla opcjonalności kryteriów." },
        { "step": "Uporządkowanie według priorytetu", "action": "Ustaw instrukcje w strukturze if-elif-else od warunków najbardziej szczegółowych (radykalnych) do najbardziej ogólnych." },
        { "step": "Zastosowanie nawiasów strukturalnych", "action": "Otocz grupy warunków nawiasami, aby jawnie wymusić pierwszeństwo wykonywania operatorów logicznych (np. AND przed OR)." },
        { "step": "Implementacja ścieżki domyślnej", "action": "Zwieńcz strukturę blokiem else, który obsłuży wszystkie pozostałe, nieprzewidziane lub skrajne przypadki danych." },
        { "step": "Wprowadzenie warunku brzegowego", "action": "Dodaj na samym początku strukturę odrzucającą dane niepoprawne (tzw. guard clause), przerywając program przed główną logiką." },
        { "step": "Zabezpieczenie przed błędem wykonania", "action": "W warunku złożonym z AND umieść test niezerowości (np. x != 0) na pierwszym miejscu, wykorzystując mechanizm zwarcia przed dzieleniem." },
        { "step": "Hermetyzacja bloków kodu", "action": "Wprowadź klamry w C++ lub rygorystyczne wcięcia w Pythonie, aby precyzyjnie przypisać instrukcje wykonawcze do danego warunku." },
        { "step": "Testowanie wartościami skrajnymi", "action": "Przeprowadź weryfikację logiki programu dla punktów granicznych przedziałów (np. dokładnie dla wartości 5 i 50)." }
      ]
    }
  },

  // PĘTLA FOR

  {
    "id": "PROG.FOR.PP.CONCEPT.01",
    "topic": "programowanie",
    "subtopic": "prog_petla_for",
    "curriculum_level": "PP",
    "language": ["C++", "Python"],
    "type": "concept",
    "taskSubtypes": ["closed_single", "closed_tf", "match_fill", "match_pair", "open_explain"],
    "content": {
      "definition": "Pętla for służy do cyklicznego wykonywania określonego bloku instrukcji z góry znaną liczbę razy, bazując na automatycznej iteracji licznika w wyznaczonym zakresie.",
     
    "tip": [
      {
    "title": "Pętla for — prosta",
    "text": "W nawiasie pętli określa się wartość początkową licznika, warunek wykonywania oraz sposób zmiany licznika po każdej iteracji.",
    "code": "for (inicjalizacja; warunek; krok) {\n  // instrukcje wykonywane w każdej iteracji\n}"
     },
    {
    "title": "Pętla for — zagnieżdżona",
    "text": "Pętla wewnętrzna wykonuje wszystkie swoje iteracje dla każdej iteracji pętli zewnętrznej. Każda pętla powinna mieć własny licznik.",
    "code": "for (inicjalizacja_i; warunek_i; krok_i) {\n  for (inicjalizacja_j; warunek_j; krok_j) {\n    // instrukcje wykonywane w pętli wewnętrznej\n  }\n}"
      }
    ],
      "raw": [
        { "term": "Licznik pętli (iterator)", "desc": "Zmienna sterująca, która przechowuje aktualny krok iteracji i zmienia swoją wartość w każdym cyklu pętli." },
        { "term": "Inicjalizacja pętli", "desc": "Wstępne ustawienie wartości początkowej licznika wykonywane dokładnie raz przed pierwszym obrotem pętli." },
        { "term": "Warunek zakończenia", "desc": "Wyrażenie logiczne sprawdzane przed każdym obrotem; pętla działa dopóki warunek ten zwraca prawdę." },
        { "term": "Krok pętli (modyfikator)", "desc": "Instrukcja określająca, o ile ma zwiększyć się lub zmniejszyć wartość licznika po każdym obrocie pętli." },
        { "term": "Inkrementacja licznika", "desc": "Zwiększanie wartości iteratora o określoną wartość (np. i++ lub i+=2) w celu zbliżenia się do warunku końca." },
        { "term": "Dekrementacja licznika", "desc": "Zmniejszanie wartości iteratora o określoną wartość (np. i--), stosowane najczęściej w pętlach odliczających w dół." },
        { "term": "Funkcja range()", "desc": "Wbudowany mechanizm Pythona generujący sekwencję liczb na podstawie podanej wartości startowej, końcowej oraz kroku." },
        { "term": "Pętla zagnieżdżona", "desc": "Konstrukcja, w której wewnątrz bloku instrukcji jednej pętli (zewnętrznej) znajduje się kolejna pętla (wewnętrzna)." },
        { "term": "Iteracja", "desc": "Jednorazowe wykonanie całego bloku instrukcji zawartych wewnątrz pętli dla bieżącej wartości licznika." },
        { "term": "Pętla nieskończona", "desc": "Błąd logiczny, w którym warunek stopu nigdy nie zostaje osiągnięty, powodując zawieszenie programu." }
      ]
    }
  },
  {
    "id": "PROG.FOR.PP.TASK.02",
    "topic": "programowanie",
    "subtopic": "prog_petla_for",
    "curriculum_level": "PP",
    "language": ["C++", "Python"],
    "type": "task",
    "taskSubtypes": ["closed_single", "closed_tf", "match_fill", "open_explain"],
    "content": {
      "definition": "",
      "raw": [
        { "expr": "Wypisywanie co drugiej liczby", "base": "Uniwersalny", "target": "Krok o wartości 2", "equation": "Zastosowanie modyfikatora i += 2 w C++ lub parametru step=2 w funkcji range() Pythona." },
        { "expr": "Akumulacja sumy elementów", "base": "Uniwersalny", "target": "suma += liczba", "equation": "Dodawanie kolejnych wartości wewnątrz pętli do zmiennej zainicjalizowanej przed pętla wartością 0." },
        { "expr": "Wyznaczanie silni liczby n", "base": "Uniwersalny", "target": "iloczyn *= i", "equation": "Mnożenie zmiennej akumulującej (start od 1) przez kolejne wartości licznika od 1 do n." },
        { "expr": "Liczba iteracji: for(int i=0; i<10; i+=2)", "base": "C++", "target": "5 powtórzeń", "equation": "Licznik przyjmie kolejno wartości: 0, 2, 4, 6, 8. Dla 10 warunek i < 10 będzie fałszywy." },
        { "expr": "Generowanie tabliczki mnożenia", "base": "Uniwersalny", "target": "Pętle zagnieżdżone", "equation": "Użycie pętli zewnętrznej dla wierszy (i) oraz wewnętrznej dla kolumn (j) i obliczanie iloczynu i * j." },
        { "expr": "Zliczanie podzielnych przez 7", "base": "Uniwersalny", "target": "Licznik warunkowy", "equation": "Inkrementacja dedykowanej zmiennej pomocniczej tylko wtedy, gdy licznik spełnia warunek i % 7 == 0." },
        { "expr": "Wyszukiwanie maksimum z n liczb", "base": "Uniwersalny", "target": "Algorytm poszukiwania", "equation": "Wczytywanie wartości w pętli i warunkowe nadpisywanie zmiennej max, gdy nowa liczba jest większa." },
        { "expr": "Odliczanie wsteczne od 10 do 1", "base": "Python", "target": "range(10, 0, -1)", "equation": "Uruchomienie pętli z ujemnym krokiem – wartość końcowa 0 jest ekskluzywna, więc pętla skończy na 1." },
        { "expr": "Rysowanie prostokąta z gwiazdek", "base": "Uniwersalny", "target": "Struktura dwuwymiarowa", "equation": "Pętla zewnętrzna kontroluje liczbę linii (wierszy), pętla wewnętrzna wypisuje znaki w danej linii." },
        { "expr": "Obliczanie średniej arytmetycznej", "base": "Uniwersalny", "target": "Suma podzielona przez n", "equation": "Zsumowanie w pętli for wszystkich pobranych ocen, a następnie jednorazowe wykonanie dzielenia poza pętlą." }
      ]
    }
  },
  {
    "id": "PROG.FOR.PP.ERROR.03",
    "topic": "programowanie",
    "subtopic": "prog_petla_for",
    "curriculum_level": "PP",
    "language": ["C++", "Python"],
    "type": "error",
    "taskSubtypes": ["error_find", "closed_tf", "open_explain"],
    "content": {
      "definition": "",
      "raw": [
        { "bad_expr": "for(int i = 0; i < 5; i--) { cout << i; }", "fix": "Licznik startuje od 0 i maleje, więc warunek i < 5 będzie zawsze prawdziwy. Należy użyć i++ zamiast i--.", "error_type": "Pętla nieskończona przez zły krok" },
        { "bad_expr": "for(int i = 1; i > 10; i++) { cout << i; }", "fix": "Warunek początkowy 1 > 10 jest fałszywy od samego początku. Pętla nie wykona się ani razu. Powinno być: i < 10.", "error_type": "Martwa pętla (błędny warunek)" },
        { "bad_expr": "for i in range(1, 5): print(tab[i])", "fix": "W Pythonie range(1, 5) pomija indeks 0 i kończy na 4. Jeśli tablica ma 5 elementów, pominiemy pierwszy element o indeksie 0.", "error_type": "Pominięcie indeksu początkowego" },
        { "bad_expr": "for(int i = 0; i <= 5; i++) { cout << tab[i]; }", "fix": "Dla tablicy 5-elementowej poprawne indeksy to 0, 1, 2, 3, 4. Użycie '<=' wywoła próbę odczytu tab[5], co narusza pamięć.", "error_type": "Wyjście poza zakres tablicy (Off-by-one)" },
        { "bad_expr": "for i in range(3):\\n  for i in range(3):", "fix": "Pętla wewnętrzna używa tej samej zmiennej sterującej 'i' co pętla zewnętrzna, co nadpisuje jej wartość i niszczy logikę.", "error_type": "Konflikt nazw liczników w zagnieżdżeniu" },
        { "bad_expr": "suma = 0\\nfor i in range(1, 6):\\n  suma = i", "fix": "Zamiast dodawać wartości (suma += i), zmienna 'suma' jest nadpisywana w każdym kroku. Po pętli zachowa tylko ostatnią wartość.", "error_type": "Nadpisanie zamiast akumulacji" },
        { "bad_expr": "for(int i = 1; i <= 20; i++) { if(i % 2 = 0) }", "fix": "Wewnątrz instrukcji warunkowej w pętli użyto znaku przypisania '=' zamiast porównania '==', co powoduje błąd kompilacji.", "error_type": "Przypisanie w warunku filtrującym" },
        { "bad_expr": "silnia = 0\\nfor i in range(1, n + 1):\\n  silnia = silnia * i", "fix": "Inicjalizacja zmiennej iloczynu wartością 0 sprawi, że każde kolejne mnożenie da wynik 0. Zmienna silnia musi wystartować od 1.", "error_type": "Błędny element neutralny mnożenia" },
        { "bad_expr": "max = 0\\nfor i in range(5):\\n  if liczba < max: max = liczba", "fix": "Szukając wartości największej (max) wśród liczb ujemnych, algorytm zawiedzie, bo 0 będzie większe od nich. Max należy zainicjalizować pierwszą liczbą.", "error_type": "Złe założenie wartości początkowej max" },
        { "bad_expr": "for(int i = 2; i < 14;) { cout << i; }", "fix": "Brak modyfikatora licznika w nagłówku pętli sprawia, że zmienna 'i' cały czas wynosi 2, co powoduje pętlę nieskończoną.", "error_type": "Brak aktualizacji iteratora" }
      ]
    }
  },
  {
    "id": "PROG.FOR.PP.STRUCTURE.04",
    "topic": "programowanie",
    "subtopic": "prog_petla_for",
    "curriculum_level": "PP",
    "language": ["C++", "Python"],
    "type": "structure",
    "taskSubtypes": ["match_pair", "match_fill", "open_explain", "open_code"],
    "content": {
      "definition": "",
      "raw": [
        { "step": "Definiowanie punktu startowego", "action": "Ustaw początkową wartość licznika (np. i = 0 dla indeksowania od zera lub i = 1 dla tradycyjnego liczenia)." },
        { "step": "Wyznaczenie granicy iteracji", "action": "Sformułuj warunek końcowy określający kryterium wyjścia, dbając o domknięcie lub otwarcie przedziału." },
        { "step": "Określenie wektora zmian", "action": "Zdefiniuj krok (kierunek i wartość zmiany licznika) gwarantujący stabilne zmierzanie w stronę granicy." },
        { "step": "Inicjalizacja zmiennych zewnętrznych", "action": "Utwórz i wyzeruj sumatory lub ustaw liczniki pomocnicze przed linią otwierającą pętlę." },
        { "step": "Izolacja bloku powtarzanego", "action": "Umieść właściwe instrukcje obliczeniowe wewnątrz struktur klamrowych lub zachowaj rygorystyczne wcięcie linii." },
        { "step": "Mapowanie elementów sekwencji", "action": "Powiąż wartość iteratora z indeksami tablicy lub przetwarzanego ciągu danych w celu ich kolejnego odczytu." },
        { "step": "Implementacja filtra wewnętrznego", "action": "Wprowadź instrukcję warunkową wewnątrz pętli, aby przetwarzać tylko te kroki, które spełniają dane kryterium." },
        { "step": "Zabezpieczenie przed nadpisaniem", "action": "Zablokuj możliwość manualnej modyfikacji wartości iteratora wewnątrz ciała pętli, co mogłoby zepsuć krok." },
        { "step": "Weryfikacja brzegów pętli", "action": "Przeanalizuj zachowanie kodu dla pierwszej (startowej) oraz ostatniej (kończącej) wartości zmiennej sterującej." },
        { "step": "Wyciągnięcie wyników na zewnątrz", "action": "Wypisz końcowe podsumowanie, średnią lub raport końcowy dopiero po całkowitym opuszczeniu bloku pętli." }
      ]
    }
  },

  // PĘTLA WHILE
  {
    "id": "PROG.WHILE.PP.CONCEPT.01",
    "topic": "programowanie",
    "subtopic": "prog_petla_while",
    "curriculum_level": "PP",
    "language": ["C++", "Python"],
    "type": "concept",
    "taskSubtypes": ["closed_single", "closed_tf", "match_fill", "match_pair", "open_explain"],
    "content": {
      "definition": "Pętla while wykonuje określony blok kodu cyklicznie tak długo, jak jej warunek logiczny jest prawdziwy. Stosuje się ją głównie wtedy, gdy liczba powtórzeń nie jest znana przed uruchomieniem pętli.",
     
"tip": [
  {
    "title": "Pętla while — schemat ogólny",
    "text": "Warunek jest sprawdzany przed każdą iteracją. Zmienna sterująca powinna zostać zainicjalizowana przed pętlą i zmieniana w jej ciele.",
    "code": "inicjalizacja_zmiennej_sterujacej;\nwhile (warunek) {\n  // instrukcje wykonywane w każdej iteracji\n  aktualizacja_zmiennej_sterujacej;\n}"
  },
  {
    "title": "Pętla while sterowana wartownikiem",
    "text": "Pętla wykonuje się do chwili pojawienia się ustalonej wartości wartownika. Kolejna wartość musi być pobierana lub wyznaczana w każdej iteracji.",
    "code": "pobranie_pierwszej_danej;\nwhile (dana != wartownik) {\n  // przetwarzanie danych\n  pobranie_kolejnej_danej;\n}"
  }
],
      "raw": [
        { "term": "Warunek wykonywania", "desc": "Wyrażenie logiczne sprawdzane przed każdą iteracją; pętla kontynuuje działanie tylko wtedy, gdy zwraca ono prawdę." },
        { "term": "Pętla sterowana wartownikiem", "desc": "Konstrukcja, w której pętla kończy działanie po napotkaniu konkretnej wartości sygnałowej (np. podanie zera przez użytkownika)." },
        { "term": "Zmienna sterująca", "desc": "Zmienna, której wartość wpływa na wynik warunku logicznego i musi być modyfikowana wewnątrz ciała pętli." },
        { "term": "Pętla nieskończona (while)", "desc": "Błąd logiczny polegający na braku modyfikacji zmiennej sterującej, przez co warunek pętli zawsze pozostaje prawdziwy." },
        { "term": "Pętla martwa", "desc": "Sytuacja, w której warunek początkowy jest fałszywy już na starcie, przez co blok instrukcji nie wykona się ani razu." },
        { "term": "Akumulator w pętli", "desc": "Zmienna służąca do zbierania sumy wartości (np. suma += liczba) wprowadzanych w kolejnych krokach pętli." },
        { "term": "Licznik powtórzeń", "desc": "Zmienna pomocnicza inkrementowana ręcznie w ciele pętli while w celu zliczania liczby wykonanych iteracji." },
        { "term": "Walidacja danych wejściowych", "desc": "Zastosowanie pętli while do ponownego wymuszania wprowadzania danych, dopóki użytkownik nie poda wartości z poprawnego zakresu." },
        { "term": "Iteracja warunkowa", "desc": "Pojedyncze wykonanie instrukcji w pętli, którego zaistnienie zależy od dynamicznie zmieniających się danych w trakcie działania programu." },
        { "term": "Instrukcja break", "desc": "Słowo kluczowe umożliwiające natychmiastowe przerwanie działania pętli i opuszczenie jej bloku niezależnie od głównego warunku." }
      ]
    }
  },
  {
    "id": "PROG.WHILE.PP.TASK.02",
    "topic": "programowanie",
    "subtopic": "prog_petla_while",
    "curriculum_level": "PP",
    "language": ["C++", "Python"],
    "type": "task",
    "taskSubtypes": ["closed_single", "closed_tf", "match_fill", "open_explain"],
    "content": {
      "definition": "",
      "raw": [
        { "expr": "Wczytywanie do napotkania zera", "base": "Uniwersalny", "target": "while (liczba != 0)", "equation": "Pętla pobiera dane w każdej iteracji i kończy pracę natychmiast, gdy użytkownik wpisze 0." },
        { "expr": "Zliczanie cyfr liczby całkowitej", "base": "Uniwersalny", "target": "liczba /= 10", "equation": "Dzielenie całkowite liczby przez 10 w pętli while (liczba > 0) połączone z inkrementacją licznika cyfr." },
        { "expr": "Odwracanie cyfr liczby", "base": "Uniwersalny", "target": "wynik = wynik * 10 + liczba % 10", "equation": "Pobieranie ostatniej cyfry operatorem modulo i budowanie odwróconego ciągu numerycznego w pętli." },
        { "expr": "Wymuszenie poprawnej oceny (1-6)", "base": "Uniwersalny", "target": "while (ocena < 1 || ocena > 6)", "equation": "Pętla powtarza zapytanie o ocenę tak długo, jak długo podana wartość leży poza legalnym zakresem szkolnym." },
        { "expr": "Generowanie potęg dwójki < 100", "base": "Uniwersalny", "target": "p() = p * 2", "equation": "Mnożenie zmiennej startowej przez 2 w pętli while (p < 100) i jednoczesne wypisywanie wyników pośrednich." },
        { "expr": "Obliczanie średniej do znaku stopu", "base": "Uniwersalny", "target": "suma / licznik", "equation": "Dodawanie liczb i zliczanie iteracji w pętli, a następnie wykonanie jednego dzielenia po wyjściu z bloku." },
        { "expr": "Symulacja spłaty zadłużenia", "base": "Uniwersalny", "target": "dlug -= rata", "equation": "Pomniejszanie zmiennej kapitału o stałą wartość w pętli while (dlug > 0) aż do całkowitego rozliczenia." },
        { "expr": "Ograniczenie prób logowania", "base": "Uniwersalny", "target": "while (haslo != '123' and proby < 3)", "equation": "Warunek złożony blokujący pętlę po podaniu dobrego hasła LUB po wyczerpaniu limitu 3 podejść." },
        { "expr": "Liczba iteracji dla x=10 przy x-=2", "base": "Uniwersalny", "target": "5 powtórzeń", "equation": "Zmienna x przyjmuje kolejno wartości 10, 8, 6, 4, 2. Przy wartości 0 warunek while (x > 0) da fałsz." },
        { "expr": "Izolacja cyfry jedności", "base": "Uniwersalny", "target": "liczba % 10", "equation": "Użycie operacji modulo 10 w pętli w celu sprawdzenia, czy badana liczba zawiera specyficzną cyfrę." }
      ]
    }
  },
  {
    "id": "PROG.WHILE.PP.ERROR.03",
    "topic": "programowanie",
    "subtopic": "prog_petla_while",
    "curriculum_level": "PP",
    "language": ["C++", "Python"],
    "type": "error",
    "taskSubtypes": ["error_find", "closed_tf", "open_explain"],
    "content": {
      "definition": "",
      "raw": [
        { "bad_expr": "int i = 0; while(i < 10) { cout << i; }", "fix": "Brak modyfikacji zmiennej 'i' wewnątrz pętli. Należy dodać instrukcję i++ lub i+=1 wewnątrz bloku.", "error_type": "Nieskończona pętla przez brak kroku" },
        { "bad_expr": "cin >> l; while(l != 0) { suma += l; }", "fix": "Pobranie liczby nastąpiło tylko przed pętlą. Program utknie w pętli, dodając w kółko tę samą liczbę. Należy dodać cin >> l wewnątrz pętli.", "error_type": "Brak ponownego odczytu strumienia" },
        { "bad_expr": "int liczba; while(liczba != 0) { cin >> liczba; }", "fix": "Zmienna 'liczba' nie ma przypisanej wartości startowej. Losowa zawartość pamięci (garbage) może sprawić, że pętla w ogóle się nie uruchomi.", "error_type": "Niezainicjalizowana zmienna sterująca" },
        { "bad_expr": "while(x = 10) { cout << x; }", "fix": "Użyto operatora przypisania '=' zamiast porównania '=='. Warunek przypisze 10, co jest zawsze traktowane jako prawda logiczna.", "error_type": "Przypisanie w warunku pętli" },
        { "bad_expr": "while(l != 0 || l != -1) { cin >> l; }", "fix": "Użycie operatora LUB (||) sprawia, że warunek jest zawsze prawdziwy – liczba nie może być jednocześnie równa 0 i -1. Należy użyć &&.", "error_type": "Zawsze prawdziwy warunek alternatywy" },
        { "bad_expr": "while(ocena < 1 && ocena > 6) { cin >> ocena; }", "fix": "Użycie operatora AND (&&) tworzy warunek sprzeczny – żadna ocena nie może być mniejsza od 1 i większa od 6 jednocześnie. Należy użyć ||.", "error_type": "Sprzeczny warunek koniunkcji zakresu" },
        { "bad_expr": "while (liczba > 0): liczba / 10 [w Python]", "fix": "Operacja 'liczba / 10' wylicza wartość, ale jej nigdzie nie zapisuje. Zmienna nie maleje. Poprawnie: liczba = liczba // 10", "error_type": "Brak zapisu wyniku operacji kroku" },
        { "bad_expr": "int i = 10; while(i < 10) { i++; }", "fix": "Warunek 10 < 10 jest fałszywy na samym starcie. Pętla stanowi martwy kod i nie wykona się ani razu.", "error_type": "Błędny warunek startowy (martwa pętla)" },
        { "bad_expr": "srednia = suma / licznik (gdy licznik = 0)", "fix": "Jeśli użytkownik wpisze 0 jako pierwszą wartość, pętla się skończy, a licznik wyniesie 0. Wywołanie dzielenia poza pętlą spowoduje błąd krytyczny.", "error_type": "Dzielenie przez zero po pustej pętli" },
        { "bad_expr": "while proby <= 3: proby += 1 [dla 3 prób]", "fix": "Jeśli licznik startuje od 0, to warunek '<=' wykona się dla wartości 0, 1, 2, 3, co daje łącznie 4 próby zamiast założonych 3.", "error_type": "Błąd przesunięcia granicy (Off-by-one)" }
      ]
    }
  },
  {
    "id": "PROG.WHILE.PP.STRUCTURE.04",
    "topic": "programowanie",
    "subtopic": "prog_petla_while",
    "curriculum_level": "PP",
    "language": ["C++", "Python"],
    "type": "structure",
    "taskSubtypes": ["match_pair", "match_fill", "open_explain", "open_code"],
    "content": {
      "definition": "",
      "raw": [
        { "step": "Definiowanie stanu początkowego", "action": "Zainicjalizuj zmienną sterującą bezpieczną wartością wyjściową lub pobierz pierwszą daną przed pętlą." },
        { "step": "Sformułowanie warunku trwania", "action": "Zapisz wyrażenie logiczne określające, w jakich okolicznościach algorytm ma kontynuować przetwarzanie cykliczne." },
        { "step": "Otwarcie bloku cyklu", "action": "Użyj słowa kluczowe while i stwórz przestrzeń wykonawczą za pomocą klamer lub odpowiedniego poziomu wcięcia." },
        { "step": "Przetwarzanie danych bieżących", "action": "Wykonaj zasadnicze operacje algorytmiczne (np. dodaj liczbę do akumulatora lub zmodyfikuj tekst)." },
        { "step": "Aktualizacja zmiennej kontrolnej", "action": "Zmień stan zmiennej sterującej pod koniec bloku (np. zainkrementuj licznik lub pobierz kolejną wartość z klawiatury)." },
        { "step": "Zabezpieczenie punktu wyjścia", "action": "Zweryfikuj, czy w ciele pętli istnieje ścieżka wykonawcza, która w każdych warunkach doprowadzi do złamania warunku trwania." },
        { "step": "Obsługa wyjścia awaryjnego", "action": "Wprowadź instrukcję warunkową z break, aby natychmiast przerwać pętlę w przypadku wykrycia anomalii lub błędu krytycznego." },
        { "step": "Test warunku przed pierwszym wykonaniem", "action": "Sprawdź, czy warunek pętli while jest oceniany przed wejściem do bloku, ponieważ przy fałszu ciało pętli nie wykona się ani razu." },
{ "step": "Przypadek zerowej liczby iteracji", "action": "Przygotuj sytuację testową, w której warunek początkowy jest fałszywy, aby sprawdzić, czy program poprawnie pomija pętlę." },
{ "step": "Aktualizacja danych wejściowych w pętli", "action": "Jeśli warunek zależy od danych pobieranych od użytkownika, umieść ponowne pobranie danych wewnątrz bloku pętli." }
      ]
    }
  },

  // FUNKCJE
  {
    "id": "PROG.FUNC.PP.CONCEPT.01",
    "topic": "programowanie",
    "subtopic": "prog_funkcje",
    "curriculum_level": "PP",
    "language": ["C++", "Python"],
    "type": "concept",
    "taskSubtypes": ["closed_single", "closed_tf", "match_fill", "match_pair", "open_explain"],
    "content": {
      "definition": "Funkcja to wydzielony, nazwany blok kodu realizujący określone zadanie podrzędne, który może przyjmować argumenty, wykonywać operacje i zwracać wynik do miejsca wywołania.",
"tip": [
  {
    "title": "Funkcja zwracająca wartość w C++",
    "text": "Nagłówek funkcji określa typ zwracanej wartości, nazwę funkcji oraz jej parametry. Instrukcja return przekazuje wynik do miejsca wywołania.",
    "code": "typ_zwracany nazwa_funkcji(typ_parametru parametr) {\n  // instrukcje\n  return wynik;\n}\n\nzmienna = nazwa_funkcji(argument);"
  },
  {
    "title": "Funkcja typu void w C++",
    "text": "Funkcja typu void wykonuje instrukcje, ale nie zwraca wartości do miejsca wywołania.",
    "code": "void nazwa_funkcji(typ_parametru parametr) {\n  // instrukcje\n}\n\nnazwa_funkcji(argument);"
  },
  {
    "title": "Funkcja w Pythonie",
    "text": "Funkcję definiuje się słowem def. Parametry zapisuje się w nawiasach, a instrukcja return może przekazać wynik do miejsca wywołania.",
    "code": "def nazwa_funkcji(parametr):\n    # instrukcje\n    return wynik\n\nzmienna = nazwa_funkcji(argument)"
  }
],
      "raw": [
        { "term": "Nagłówek funkcji", "desc": "Linia definiująca nazwę funkcji, typ zwracanej wartości (w C++) oraz listę przyjmowanych parametrów wraz z ich typami." },
        { "term": "Parametr funkcji", "desc": "Zmienna zadeklarowana w definicji funkcji, stanowiąca placeholder na dane, które zostaną przekazane podczas jej wywołania." },
        { "term": "Argument funkcji", "desc": "Faktyczna wartość lub zmienna przekazywana do funkcji w nawiasach podczas jej konkretnego wywołania w kodzie." },
        { "term": "Instrukcja return", "desc": "Słowo kluczowe przerywające działanie funkcji i przekazujące określony wynik obliczeń z powrotem do programu głównego." },
        { "term": "Typ void", "desc": "Słowo kluczowe w C++ określające funkcję proceduralną, która wykonuje zadanie (np. wypisanie tekstu), ale nie zwraca żadnej wartości." },
        { "term": "Słowo kluczowe def", "desc": "Instrukcja w języku Python służąca do rozpoczęcia definiowania nowej funkcji lub metody." },
        { "term": "Wywołanie funkcji", "desc": "Instrukcja nakazująca komputerowi przerwanie głównego nurtu programu i przejście do wykonania kodu zawartego w ciele danej funkcji." },
        { "term": "Hermetyzacja (czarna skrzynka)", "desc": "Zasada programistyczna mówiąca, że program główny nie musi znać wewnętrznej implementacji funkcji, a jedynie jej interfejs (wejście/wyjście)." },
        { "term": "Zmienna lokalna funkcji", "desc": "Zmienna utworzona wewnątrz ciała funkcji, która istnieje wyłącznie podczas jej wykonywania i jest niewidoczna na zewnątrz." },
        { "term": "Przeładowanie funkcji", "desc": "Mechanizm (np. w C++) pozwalający na definiowanie wielu funkcji o tej samej nazwie, ale różniących się liczbą lub typem parametrów." }
      ]
    }
  },
  {
    "id": "PROG.FUNC.PP.TASK.02",
    "topic": "programowanie",
    "subtopic": "prog_funkcje",
    "curriculum_level": "PP",
    "language": ["C++", "Python"],
    "type": "task",
    "taskSubtypes": ["closed_single", "closed_tf", "match_fill", "open_explain"],
    "content": {
      "definition": "",
      "raw": [
        { "expr": "Wywołanie funkcji z argumentami", "base": "Uniwersalny", "target": "wynik = suma(3, 5)", "equation": "Przekazanie stałych 3 i 5 jako argumentów i zapisanie zwróconej wartości 8 w zmiennej." },
        { "expr": "Weryfikacja parzystości liczby", "base": "Uniwersalny", "target": "return n % 2 == 0", "equation": "Funkcja zwraca wartość bool (prawda/fałsz) na podstawie wyniku operacji modulo." },
        { "expr": "Wyznaczanie maksimum z dwóch liczb", "base": "Uniwersalny", "target": "if (a > b) return a; else return b;", "equation": "Instrukcja warunkowa decydująca, która z wartości parametrów zostanie odesłana przez return." },
        { "expr": "Kalkulator pola powierzchni koła", "base": "Uniwersalny", "target": "return 3.14 * r * r", "equation": "Funkcja przyjmuje promień jako liczbę zmiennoprzecinkową i zwraca obliczone pole typu float/double." },
        { "expr": "Przelicznik jednostek czasu", "base": "Uniwersalny", "target": "return minuty * 60", "equation": "Funkcja transformuje podaną liczbę minut na sekundy, mnożąc parametr przez stałą wartość." },
        { "expr": "Obliczanie ceny po rabacie", "base": "Uniwersalny", "target": "return cena * (1 - znizka)", "equation": "Pobranie dwóch parametrów (cena, procent) i odesłanie finalnej kwoty zakupu po obniżce." },
        { "expr": "Filtrowanie podzielności", "base": "Uniwersalny", "target": "return x > 0 and x % 3 == 0", "equation": "Funkcja logiczna sprawdzająca równocześnie dwa kryteria dla przekazanego argumentu." },
        { "expr": "Sprawdzanie długości tekstu", "base": "Python", "target": "return len(tekst)", "equation": "Wykorzystanie wbudowanej funkcji pomocniczej wewnątrz własnej procedury w celu określenia rozmiaru napisu." },
        { "expr": "Zabezpieczenie przed błędnymi danymi", "base": "Uniwersalny", "target": "if (r < 0) return 0;", "equation": "Wprowadzenie instrukcji wczesnego zwrotu (guard clause) w celu odrzucenia nierealnych danych wejściowych." },
        { "expr": "Wyliczanie średniej arytmetycznej", "base": "Uniwersalny", "target": "return (a + b) / 2.0", "equation": "Zsumowanie parametrów i wymuszenie dzielenia zmiennoprzecinkowego w celu zachowania części ułamkowej." }
      ]
    }
  },
  {
    "id": "PROG.FUNC.PP.ERROR.03",
    "topic": "programowanie",
    "subtopic": "prog_funkcje",
    "curriculum_level": "PP",
    "language": ["C++", "Python"],
    "type": "error",
    "taskSubtypes": ["error_find", "closed_tf", "open_explain"],
    "content": {
      "definition": "",
      "raw": [
        { "bad_expr": "int suma(int a, int b) { int w = a + b; }", "fix": "Funkcja deklaruje, że zwraca int, ale brakuje instrukcji 'return w;'. Spowoduje to zwrócenie losowej wartości z pamięci.", "error_type": "Brak instrukcji return" },
        { "bad_expr": "def suma(a, b):\\nwynik = a + b", "fix": "W Pythonie ciało funkcji musi być bezwzględnie przesunięte w prawo za pomocą wcięcia (identacji).", "error_type": "Błąd wcięcia definicji" },
        { "bad_expr": "int suma(int a, int b) { return a; }", "fix": "Funkcja logicznie ignoruje parametr 'b' i zwraca tylko 'a'. Wynik dodawania będzie całkowicie błędny.", "error_type": "Zwrócenie złej zmiennej" },
        { "bad_expr": "print(suma(2)) [dla funkcji suma(a, b)]", "fix": "Próba wywołania funkcji z jednym argumentem, podczas gdy definicja wymaga podania dwóch (a i b). Wywoła to błąd kompilacji/wykonania.", "error_type": "Niezgodna liczba argumentów" },
        { "bad_expr": "int pole(int a, int b) { return a + b; }", "fix": "Błąd logiczny w ciele funkcji – zamiast wzoru na pole prostokąta (a * b) użyto wzoru na sumowanie (a + b).", "error_type": "Błędny wzór matematyczny" },
        { "bad_expr": "void suma(int a, int b) { return a + b; }", "fix": "Funkcja typu void nie może zwracać żadnej wartości za pomocą instrukcji return. Należy zmienić typ void na int.", "error_type": "Zwrot wartości w funkcji void" },
        { "bad_expr": "def czy_parzysta(n):\\n  n % 2 == 0", "fix": "Samo wyrażenie porównania wylicza stan logiczny, ale bez słowa kluczowego 'return' funkcja zwróci None.", "error_type": "Zgubienie słowa return w teście" },
        { "bad_expr": "def srednia(a, b):\\n  return a + b / 2", "fix": "Brak nawiasów wokół dodawania sprawia, że przez kolejność działań najpierw podzielone zostanie b, a potem dodane a. Poprawnie: (a + b) / 2", "error_type": "Błąd kolejności działań w return" },
        { "bad_expr": "int m(int a, int b) { if(a>b) return b; else return a; }", "fix": "Szukając maksimum (wartości większej), funkcja zwraca 'b' gdy 'a' jest większe, czyli wyznacza minimum.", "error_type": "Odwrócona logika warunku zwrotu" },
        { "bad_expr": "cout << sprawdz(5); [dla funkcji void sprawdz]", "fix": "Nie można przekazać wywołania funkcji typu void do strumienia cout, ponieważ funkcja ta nie produkuje żadnej wartości do wyświetlenia.", "error_type": "Próba wypisania rezultatu void" }
      ]
    }
  },
  {
    "id": "PROG.FUNC.PP.STRUCTURE.04",
    "topic": "programowanie",
    "subtopic": "prog_funkcje",
    "curriculum_level": "PP",
    "language": ["C++", "Python"],
    "type": "structure",
    "taskSubtypes": ["match_pair", "match_fill", "open_explain", "open_code"],
    "content": {
      "definition": "",
      "raw": [
        { "step": "Deklaracja intencji bloku", "action": "Określ precyzyjnie cel działania funkcji (np. czy ma coś obliczyć i zwrócić, czy jedynie wykonać operację wyjścia)." },
        { "step": "Projektowanie sygnatury", "action": "Nadaj unikalną nazwę i zdefiniuj listę parametrów, określając typy danych niezbędne do wykonania zadania." },
        { "step": "Inicjalizacja środowiska lokalnego", "action": "Utwórz wewnętrzne zmienne pomocnicze, które będą widoczne i używane wyłącznie w obrębie tego bloku kodu." },
        { "step": "Implementacja logiki głównej", "action": "Zapisz instrukcje warunkowe, pętle lub operacje matematyczne przetwarzające zmienne wejściowe." },
        { "step": "Zwieńczenie i emisja wyniku", "action": "Użyj instrukcji return, aby przesłać ostateczny rezultat obliczeń z powrotem do punktu wywołania." },
        { "step": "Zabezpieczenie typów w C++", "action": "Upewnij się, że typ danych stojący przy słowie return jest idealnie zgodny z typem zadeklarowanym w nagłówku funkcji." },
        { "step": "Wywołanie z argumentami", "action": "W programie głównym (main) podaj nazwę funkcji i w nawiasie przekaż realne wartości lub zmienne jako argumenty." },
        { "step": "Przechwycenie wartości zwrotnej", "action": "Przypisz wywołanie funkcji do nowej zmiennej lub przekaż je bezpośrednio do instrukcji wyświetlania (print/cout)." },
        { "step": "Weryfikacja niezależności pamięci", "action": "Sprawdź, czy modyfikacje zmiennych lokalnych w funkcji nie uszkodziły przypadkowo struktur danych programu głównego." },
        { "step": "Rozdzielenie definicji i wywołania funkcji", "action": "Najpierw opisz, co funkcja robi i jakie przyjmuje parametry, a następnie pokaż osobne miejsce w programie, w którym funkcja zostaje wywołana." }
      ]
    }
  },

  // TABLICE

  {
    "id": "PROG.ARR.PP.CONCEPT.01",
    "topic": "programowanie",
    "subtopic": "prog_tablice",
    "curriculum_level": "PP",
    "language": ["C++", "Python"],
    "type": "concept",
    "taskSubtypes": ["closed_single", "closed_tf", "match_fill", "match_pair", "open_explain"],
    "content": {
      "definition": "Tablica to strukturalny typ danych służący do przechowywania sekwencji wielu wartości (elementów) tego samego typu w ciągłym obszarze pamięci pod jedną wspólną nazwą.",
"tip": [
  {
    "title": "Deklaracja i inicjalizacja tablicy w C++",
    "text": "Tablica statyczna przechowuje elementy tego samego typu. Jej rozmiar określa się podczas deklaracji.",
    "code": "typ nazwa_tablicy[rozmiar];\ntyp nazwa_tablicy[] = {wartosc_1, wartosc_2, wartosc_3};"
  },
  {
    "title": "Lista w Pythonie",
    "text": "Listę tworzy się, zapisując jej elementy w nawiasach kwadratowych.",
    "code": "nazwa_listy = [wartosc_1, wartosc_2, wartosc_3]"
  },
  {
    "title": "Odczyt i zmiana elementu",
    "text": "Do elementu odwołuje się przez indeks zapisany w nawiasach kwadratowych. Pierwszy element ma indeks 0, a ostatni indeks równy rozmiarowi pomniejszonemu o jeden.",
    "code": "nazwa_tablicy[indeks]\nnazwa_tablicy[indeks] = nowa_wartosc;"
  }
],


      "raw": [
        { "term": "Indeksowanie od zera", "desc": "Zasada, według której pierwszy element tablicy ma zawsze indeks 0, drugi indeks 1, a ostatni element indeks równy rozmiarowi pomniejszonemu o jeden (n-1)." },
        { "term": "Rozmiar tablicy", "desc": "Stała wartość określająca maksymalną liczbę elementów, jaką tablica statyczna może pomieścić w pamięci RAM." },
        { "term": "Element tablicy", "desc": "Pojedyncza zmienna składowa umieszczona wewnątrz tablicy, posiadająca unikalny adres wyznaczany przez jej indeks." },
        { "term": "Operator indeksowania [ ]", "desc": "Znak graficzny służący do bezpośredniego odwoływania się do konkretnej komórki tablicy w celu zapisu lub odczytu jej wartości." },
        { "term": "Lista inicjalizacyjna", "desc": "Zestaw wartości podanych w klamrach {} lub nawiasach [] podczas tworzenia tablicy, służący do jej natychmiastowego wypełnienia." },
        { "term": "Przejście po tablicy (Traversing)", "desc": "Operacja polegająca na sekwencyjnym odwiedzeniu każdego elementu tablicy po kolei, najczęściej realizowana za pomocą pętli licznikowej." },
        { "term": "Lista (list) w Pythonie", "desc": "Dynamiczny odpowiednik tablicy, który może zmieniać swój rozmiar w trakcie działania programu i przechowywać elementy różnych typów." },
        { "term": "Wyjście poza zakres (Out of bounds)", "desc": "Krytyczny błąd wykonania lub kompilacji polegający na próbie odwołania się do indeksu, który nie istnieje w zadeklarowanej przestrzeni tablicy." },
        { "term": "Tablica statyczna", "desc": "Struktura danych, której rozmiar musi być znany na etapie kompilacji i nie może ulec zmianie w trakcie działania programu." },
        { "term": "Ciągłość pamięci", "desc": "Cecha fizycznego rozmieszczenia tablicy w pamięci komputera, gdzie wszystkie elementy leżą bezpośrednio jeden obok drugiego, co przyspiesza dostęp." }
      ]
    }
  },
  {
    "id": "PROG.ARR.PP.TASK.02",
    "topic": "programowanie",
    "subtopic": "prog_tablice",
    "curriculum_level": "PP",
    "language": ["C++", "Python"],
    "type": "task",
    "taskSubtypes": ["closed_single", "closed_tf", "match_fill", "open_explain"],
    "content": {
      "definition": "",
      "raw": [
        { "expr": "Odczyt trzeciego elementu", "base": "Uniwersalny", "target": "tab[2]", "equation": "Z uwagi na indeksowanie od zera, trzeci element w kolejności znajduje się pod indeksem o numerze 2." },
        { "expr": "Modyfikacja komórki tablicy", "base": "Uniwersalny", "target": "tab[1] = 100;", "equation": "Wpisanie nowej wartości 100 w miejsce dotychczasowego drugiego elementu struktury." },
        { "expr": "Obliczanie sumy elementów", "base": "Uniwersalny", "target": "suma += tab[i]", "equation": "Iteracyjne dodawanie wartości każdej kolejnej komórki tablicy do zewnętrznej zmiennej akumulującej." },
        { "expr": "Wyszukiwanie wartości największej", "base": "Uniwersalny", "target": "if(tab[i] > max) max = tab[i];", "equation": "Porównywanie elementów w pętli z dotychczasowym maksimum, zainicjalizowanym wartością tab[0]." },
        { "expr": "Adres ostatniego elementu", "base": "C++", "target": "tab[n-1]", "equation": "Dla tablicy o rozmiarze 'n' poprawnym indeksem końcowego elementu jest zawsze wartość n-1." },
        { "expr": "Wyznaczenie średniej ocen", "base": "Uniwersalny", "target": "suma / 5.0", "equation": "Zsumowanie w pętli for ocen z 5 sprawdzianów zapisanych w tablicy i podzielenie wyniku przez ich liczbę." },
        { "expr": "Analiza powtórzeń dla n=10", "base": "Uniwersalny", "target": "10 obrotów pętli", "equation": "Pętla sterująca przejściem od indeksu 0 do 9 wykona się dokładnie tyle razy, ile wynosi rozmiar tablicy." },
        { "expr": "Zapis temperatur z tygodnia", "base": "Uniwersalny", "target": "float temp[7];", "equation": "Deklaracja struktury przechowującej 7 wartości zmiennoprzecinkowych odpowiadających kolejnym dniom." },
        { "expr": "Wartość tab[1] dla {1, 2, 3}", "base": "Uniwersalny", "target": "2", "equation": "Zwrócenie wartości przypisanej do drugiego pola w liście inicjalizacyjnej zmiennej tablicowej." },
        { "expr": "Zliczanie cen powyżej progu", "base": "Uniwersalny", "target": "if(ceny[i] > 50) licznik++;", "equation": "Przejście pętlą for przez tablicę cen i inkrementacja licznika wyłącznie dla elementów spełniających kryterium." }
      ]
    }
  },
  {
    "id": "PROG.ARR.PP.ERROR.03",
    "topic": "programowanie",
    "subtopic": "prog_tablice",
    "curriculum_level": "PP",
    "language": ["C++", "Python"],
    "type": "error",
    "taskSubtypes": ["error_find", "closed_tf", "open_explain"],
    "content": {
    "definition": "",
      "raw": [
        { "bad_expr": "int tab[5]; tab[5] = 10;", "fix": "Dla tablicy 5-elementowej poprawne indeksy to 0, 1, 2, 3, 4. Indeks 5 leży poza zakresem i narusza strukturę pamięci.", "error_type": "Przekroczenie górnej granicy indeksu" },
        { "bad_expr": "for(int i = 1; i <= 5; i++) { cout << tab[i]; }", "fix": "Pętla pomija pierwszy element (indeks 0) oraz próbuje odczytać nieistniejący element tab[5]. Poprawnie: (int i = 0; i < 5; i++)", "error_type": "Błędny zakres pętli iterującej (Off-by-one)" },
        { "bad_expr": "int tab[5]; cout << tab[0];", "fix": "Próba odczytu wartości z tablicy, która nie została zainicjalizowana. Program wyświetli losowe dane (garbage values) z pamięci.", "error_type": "Odczyt niezainicjalizowanej komórki" },
        { "bad_expr": "int tab[4] = {1, 2, 3};", "fix": "Zadeklarowano rozmiar 4, ale podano tylko 3 elementy. W C++ czwarty element zostanie automatycznie wyzerowany, co może zepsuć np. algorytm wyznaczania minimum.", "error_type": "Niejednorodne wypełnienie rozmiaru" },
        { "bad_expr": "cout << tab; [w C++]", "fix": "Użycie samej nazwy tablicy bez operatora indeksowego [] nie spowoduje wypisania jej zawartości, lecz wyświetli adres wskaźnika początku tablicy w pamięci.", "error_type": "Brak indeksu przy wypisywaniu" },
        { "bad_expr": "int max = tab[0]; if(tab[i] < max) max = tab[i];", "fix": "Szukając wartości największej (max), użyto operatora mniejszości '<'. W efekcie algorytm znajdzie wartość najmniejszą (min).", "error_type": "Odwrócony warunek wyszukiwania ekstremum" },
        { "bad_expr": "for(int i = 0; i < 4; i++) [dla rozmiaru 5]", "fix": "Warunek i < 4 spowoduje, że pętla przetworzy tylko indeksy 0, 1, 2, 3. Ostatni element o indeksie 4 zostanie całkowicie pominięty.", "error_type": "Przedwczesne zakończenie iteracji" },
        { "bad_expr": "for(int i = 0; i > 5; i++) { cout << tab[i]; }", "fix": "Warunek początkowy 0 > 5 jest fałszywy na starcie. Pętla nie wykona się ani razu, a zawartość tablicy nie zostanie wyświetlona.", "error_type": "Martwy warunek przejścia pętli" },
        { "bad_expr": "int tab[3] = {1, 2, 'a'};", "fix": "Tablice są strukturami jednorodnymi. Umieszczenie znaku 'a' w tablicy typu int spowoduje jego niejawne przekształcenie na kod ASCII (97).", "error_type": "Niezgodność typów danych w inicjalizacji" },
        { "bad_expr": "int tab[3] = {1,2,3}; cout << tab[3];", "fix": "Ostatni element trzyelementowej tablicy ma indeks 2. Indeks 3 wskazuje na losową komórkę pamięci poza tablicą.", "error_type": "Błąd odczytu elementu granicznego" }
      ]
    }
  },
  {
    "id": "PROG.ARR.PP.STRUCTURE.04",
    "topic": "programowanie",
    "subtopic": "prog_tablice",
    "curriculum_level": "PP",
    "language": ["C++", "Python"],
    "type": "structure",
    "taskSubtypes": ["match_pair", "match_fill", "open_explain", "open_code"],
    "content": {
      "definition": "",
      "raw": [
        { "step": "Kalkulacja zapotrzebowania", "action": "Ustal dokładną lub maksymalną liczbę elementów, które będą przetwarzane w strukturze jednorodnej." },
        { "step": "Alokacja pamięci (Deklaracja)", "action": "Zadeklaruj zmienną tablicową o określonej nazwie, wskazując typ danych komórek oraz jej stały rozmiar." },
        { "step": "Inicjalizacja zawartości", "action": "Wypełnij tablicę wartościami początkowymi (ręcznie, listą inicjalizacyjną lub poprzez pętlę pobierającą dane)." },
        { "step": "Przygotowanie licznika przejścia", "action": "Skonstruuj pętlę for z iteratorem ustawionym na wartość 0, odpowiadającą początkowi sekwencji." },
        { "step": "Ustawienie warunku strażnika", "action": "Zdefiniuj warunek ostro mniejszościowy (i < rozmiar), aby zapobiec awaryjnemu wyjściu poza obszar pamięci." },
        { "step": "Adresowanie elementu bieżącego", "action": "Wykorzystaj zmienną licznikową wewnątrz operatora nawiasów kwadratowych, aby pobrać element do obliczeń." },
        { "step": "Ekstrakcja i przetwarzanie logiki", "action": "Wykonaj docelową operację algorytmiczną (porównanie, dodawanie do sumatora, modyfikacja wartości) na danej komórce." },
        { "step": "Walidacja wskaźników skrajnych", "action": "Zweryfikuj ręcznie zachowanie algorytmu dla indeksu początkowego (0) oraz indeksu końcowego (rozmiar-1)." },
        { "step": "Przejście po wszystkich elementach", "action": "Użyj pętli z indeksem lub iteracji po kolekcji, aby odczytać każdy element tablicy/listy dokładnie raz." },
        { "step": "Sprawdzenie granic indeksu", "action": "Przed odwołaniem do elementu upewnij się, że indeks należy do dozwolonego zakresu od 0 do długość minus 1." }
      ]
    }
  }

];

/*
docelowy standard dla nazw subtopiców to: topic_subtopic (np. algorytmy_systemy_pozycyjne, programowanie_petla_while, programowanie_funkcje, programowanie_tablice)
const SUBTOPIC_IDS = {
  // algorytmy
  // programowanie
  PROG_ZMIENNE: "prog_zmienne",
  PROG_TYPY_DANYCH: "prog_typy_danych",
  PROG_WARUNKI: "prog_warunki",
  PROG_PETLA_FOR: "prog_petla_for",
  PROG_PETLA_WHILE: "prog_petla_while",
  PROG_FUNKCJE: "prog_funkcje",
  PROG_TABLICE: "prog_tablice"
};






*/