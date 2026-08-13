# SmartTeacher — database_architecture_v1.md

**Wersja dokumentu:** 3.3  
**Data aktualizacji:** 12.08.2026  
**Projekt:** `smartteacher-next`  
**Supabase:** `smartteacher-next-dev`  
**Status:** aktualna architektura robocza; Kreator karty pracy, kartkówki i sprawdzianu, atomowy cache, Historia, wspólny klucz, punktacja, indywidualna skala ocen, eksport DOCX, serwerowa telemetria OpenAI, Plan Free, publiczny cennik oraz pełny pakiet limitów i subskrypcji Stripe są wdrożone i zweryfikowane  
**Uwaga:** nazwa pliku pozostaje bez zmiany ze względu na ciągłość źródeł projektu.

---

## 0. CEL DOKUMENTU

Dokument opisuje aktualny model danych SmartTeacher oraz decyzje obowiązujące przy dalszym rozwoju Kreatora karty pracy, kartkówki i sprawdzianu, cache, Historii, wspólnego klucza nauczyciela, punktacji, indywidualnej skali ocen, eksportu DOCX, monitoringu użycia OpenAI, Planu Free, publicznego cennika, limitów generowania i subskrypcji Stripe.

Nie jest jedną migracją SQL. Rzeczywiste migracje znajdują się w:

```text
supabase/sql
```

Źródłem prawdy dla bieżącego stanu jest:

- aktualny schemat Supabase,
- migracje zapisane w repo,
- działający kod `smartteacher-next`,
- zakończone testy opisane w `smartteacher_etapy.md`.

Historyczna migracja albo nazwa używana w starym module nie zastępuje kontroli rzeczywistego schematu.

---

## 1. ZASADY ARCHITEKTONICZNE

### 1.1. Prywatność

Każda prywatna tabela nauczyciela musi mieć:

```text
owner_id = auth.uid()
```

oraz RLS.

Frontend może odczytywać własne dane zgodnie z polityką. Operacje wymagające klucza `service_role` odbywają się wyłącznie po stronie serwera.

### 1.2. Najmniejsze konieczne uprawnienia

- `anon` i `authenticated` nie otrzymują uprawnień do serwerowych funkcji cache,
- `authenticated` ma wyłącznie `SELECT` do `generated_materials`,
- `anon` nie ma grantu do `generated_materials`,
- `claim_generated_material` może wykonywać `service_role`,
- `service_role` ma `SELECT` na `public.subjects`, ponieważ Route Handler zapisuje snapshot nazwy przedmiotu,
- `service_role` ma `SELECT` na `public.lesson_sections`, ponieważ Sprawdzian weryfikuje prywatny dział po stronie serwera,
- `create_private_lesson_catalog_from_import(uuid, uuid, uuid, text, text, text)` może wykonywać `authenticated`,
- aktualna funkcja importu CSV nie jest wykonywalna przez `PUBLIC` ani `anon`,
- `authenticated` ma `SELECT`, `INSERT` i `UPDATE` wyłącznie do własnego rekordu w `teacher_grade_scales`,
- `anon` nie ma grantu do `teacher_grade_scales`,
- `ai_usage_events` jest tabelą wyłącznie serwerową: `PUBLIC`, `anon` i `authenticated` nie mają grantów ani polityk,
- `service_role` ma wyłącznie `SELECT` i `INSERT` do `ai_usage_events`,
- nie nadajemy dodatkowych praw zapisu, jeśli nie są potrzebne.

### 1.3. Jedna odpowiedzialność

Nie tworzymy tabel „na zapas”. Nowa tabela jest uzasadniona tylko wtedy, gdy przechowuje odrębny byt biznesowy albo usuwa realną redundancję.

### 1.4. Struktura przed promptem

```text
relacje
→ constraints
→ JSON Schema
→ parser
→ renderery
→ prompt
```

Model nie może zastępować walidacji, relacji ani reguł strukturalnych.

### 1.5. CSV i DOCX mają różne role

```text
CSV
→ katalog działów i tematów

DOCX
→ treść merytoryczna jednego tematu
```

CSV jest źródłem importu. Źródłem prawdy dla Generatora jest katalog relacyjny i przypisany dokument.

Historyczne `LearningUnits` starego MVP nie jest tabelą, bazą wiedzy ani źródłem runtime `smartteacher-next`. Może służyć wyłącznie jako materiał referencyjny do przygotowania kontrolowanych DOCX testowych i porównań regresyjnych. Starego Generatora, retrieval, coverage, `topicMapping`, UI ani API nie przenosimy do aktualnego modelu danych.

---

## 2. GŁÓWNA OŚ DANYCH

```text
auth.users
→ teacher_profiles
→ teacher_subjects
→ subjects

lesson_plan_imports
→ lesson_plan_items
→ lesson_catalogs
→ lesson_sections
→ lesson_topics

lesson_topics
→ teacher_documents
→ document_blocks
→ document_chunks
→ source_fingerprint

brakujące document_embeddings
→ rzeczywiste wywołanie OpenAI
→ ai_usage_events.operation = document_embedding

lesson_topics + teacher_documents + parametry Generatora
→ generation_fingerprint
→ claim_generated_material
→ generated_materials

cache MISS Generatora
→ rzeczywiste wywołanie OpenAI
→ ai_usage_events.operation = material_generation

lesson_sections + lesson_topics + gotowe teacher_documents
→ lesson_section_sources_v1
→ zbiorczy source_fingerprint
→ generation_fingerprint Sprawdzianu
→ claim_generated_material
→ generated_materials

generated_materials
→ lista Historii
→ pojedynczy content_json
→ GeneratedMaterial
→ materiały uczniów
→ jeden wspólny TeacherAnswerKey
→ wydruk / PDF
→ eksport DOCX na żądanie

auth.users
→ teacher_grade_scales
→ aktualna skala konta
→ TeacherAnswerKey i eksport DOCX
```

---

## 3. KATALOG LEKCJI

### `subjects`

Globalny słownik przedmiotów.

Rzeczywista kolumna nazwy przedmiotu:

```text
name
```

Nie używać nieistniejącego pola `display_name`.

Najważniejsze pola:

```text
id
subject_key
name
is_active
```

### `grade_levels`

Globalny słownik poziomów klas. Nie zapisujemy klas organizacyjnych typu `1a`, `1b`, `1c`.

### `teacher_subjects`

Relacja nauczyciela z aktywnymi przedmiotami.

### `lesson_plan_imports`

Metadane importu CSV.

### `lesson_plan_items`

Wiersze źródłowego CSV.

### `lesson_catalogs`

Prywatny katalog nauczyciela dla przedmiotu i klasy.

### `lesson_sections`

Działy w katalogu.

### `lesson_topics`

Tematy lekcji.

Klucz operacyjny Generatora:

```text
lesson_topic_id
```

Tytuł tematu jest przechowywany w:

```text
display_title
```

### 3.1. RPC tworzenia katalogu z importu CSV

Aktualna i jedyna obowiązująca sygnatura:

```text
create_private_lesson_catalog_from_import(
  p_import_id uuid,
  p_owner_id uuid,
  p_grade_level_id uuid,
  p_title text,
  p_curriculum_level text,
  p_language text
)
```

Funkcja:

- działa jako `SECURITY DEFINER`,
- wymaga jawnego `grade_level_id`,
- jest wykonywalna przez `authenticated`,
- nie jest wykonywalna przez `PUBLIC` ani `anon`.

Stare przeciążenie bez `p_grade_level_id` zostało usunięte. Nie należy go odtwarzać ani wywoływać.

---

## 4. DOKUMENTY NAUCZYCIELA

### 4.1. `teacher_documents`

Odpowiedzialność:

- metadane uploadu,
- właściciel i przedmiot,
- przypisanie do `lesson_topic_id`,
- status przetwarzania,
- ścieżka w prywatnym Storage,
- tożsamość pełnej treści źródłowej.

DOCX jest rozpoznawany przez:

```text
mime_type = application/vnd.openxmlformats-officedocument.wordprocessingml.document
```

Nie istnieje pole `doc_type`.

Wdrożone pola tożsamości:

| Kolumna | Odpowiedzialność |
|---|---|
| `source_fingerprint` | SHA-256 kanonicznego manifestu pełnej treści po chunkingu |
| `source_manifest_version` | wersja kontraktu fingerprintu, obecnie `document_chunks_v1` |
| `ready_at` | moment uzyskania kompletnej tożsamości źródła i przypisania do tematu |

`source_fingerprint` i `source_manifest_version` muszą być jednocześnie ustawione albo jednocześnie `NULL`.

### 4.2. `document_blocks`

Source-only wynik extraction.

Blok zachowuje między innymi:

```text
block_index
block_type
heading_path
content
content_hash
is_excluded
exclude_reason
```

Extraction:

- nie używa modelu,
- nie parafrazuje,
- nie dopisuje treści,
- zachowuje kolejność dokumentu.

### 4.3. `document_chunks`

Deterministyczne grupowanie bloków.

Chunk zachowuje między innymi:

```text
chunk_index
content
content_hash
heading_path
block_indices
chunking_version
```

Chunki są źródłem pełnego kontekstu Generatora.

### 4.4. `document_embeddings`

Embeddingi istnieją i pozostają w bazie.

Nie są warunkiem aktualnego generowania dla jednego krótkiego DOCX przypisanego do tematu.

Mogą zostać wykorzystane później dla:

- wielu dokumentów,
- długich źródeł,
- globalnej bazy SmartTeacher,
- retrieval potwierdzonego pomiarem jakości.

Generowanie brakujących embeddingów tworzy jedno zdarzenie `document_embedding` w `ai_usage_events` dla jednego logicznego żądania OpenAI. Pełne ponowne użycie istniejących, poprawnych wektorów nie wywołuje OpenAI i nie tworzy zdarzenia.

---

## 5. SOURCE FINGERPRINT

### 5.1. Cel

Fingerprint odpowiada na pytanie:

> Czy treść przekazywana Generatorowi jest dokładnie tą samą treścią i strukturą co wcześniej?

Nie jest hashem binarnego pliku DOCX.

### 5.2. Manifest

Obecny kontrakt:

```text
sourceManifestVersion = document_chunks_v1
chunkingVersion
chunks [
  chunkIndex
  contentHash
  headingPath
]
```

Kanoniczny JSON manifestu:

```text
SHA-256
→ source_fingerprint
```

### 5.3. Kontrola przed generowaniem

`getLessonTopicSourceContext.js`:

- wymaga dokładnie jednego DOCX,
- wymaga gotowego statusu, fingerprintu, manifest version i `ready_at`,
- pobiera wszystkie chunki w kolejności,
- kontroluje wspólną wersję chunkingu,
- odtwarza tożsamość źródła,
- porównuje ją z rekordem dokumentu,
- buduje pełny `sourceContext`.

Brak dokumentu jest kontrolowanym przypadkiem biznesowym `no_sources`. Niespójność fingerprintu jest błędem integralności i zatrzymuje Generator.

---

## 6. GENERATOR — WDROŻONE PRZEPŁYWY

Dla jednego krótkiego dokumentu przypisanego do tematu:

```text
lesson_topic_id
→ teacher_documents
→ wszystkie document_chunks w kolejności
→ pełny source-only context
→ templates.js
→ buildTaskPlan dla 5 / 6 / 7 zadań
→ generation_fingerprint
→ atomowy claim cache
→ generated_materials
```

W głównym runtime nie używamy:

- semantic retrieval,
- top 3,
- progu similarity,
- task type coverage,
- `isSupported`,
- cache coverage.

Route Handler obecnie obsługuje pionowe przepływy:

```text
kartkówka
karta pracy
sprawdzian
```

Sprawdzian korzysta z osobnego zakresu:

```text
lesson_section_id
→ aktywne lesson_topics w kolejności
→ maksymalnie jeden gotowy DOCX na temat
→ weryfikacja source_fingerprint każdego dokumentu
→ zbiorczy sourceContext
→ source_fingerprint dla lesson_section_sources_v1
→ sourceTopicIds w każdym zadaniu
→ kontrola pokrycia wszystkich dostępnych tematów
→ atomowy claim cache
→ generated_materials
```

Brak gotowych źródeł dla całego działu jest przypadkiem `no_sources`. Jeżeli źródła ma tylko część tematów, Generator zwraca `partial_sources` i wymaga jawnego potwierdzenia nauczyciela przed użyciem dostępnego zakresu.

Dla karty pracy wynik zawiera:

```text
intro
tip[]
glossary[]
tasks[]
```

`glossary` jest renderowany wyłącznie dla profilu Obcojęzycznego. Wszystkie profile korzystają z tego samego bazowego zestawu `tasks`.

---

## 7. `generated_materials`

Tabela jest wdrożona i używana przez runtime. Pełni dwie funkcje:

```text
cache gotowych wyników
+
źródło Historii Generowań
```

### 7.1. Relacje i snapshoty

Najważniejsze pola:

```text
owner_id
subject_id
lesson_topic_id
source_document_id
subject_name_snapshot
topic_title_snapshot
source_file_name_snapshot
```

Snapshoty utrzymują czytelność Historii nawet po późniejszej zmianie lub usunięciu rekordu źródłowego.

Dla karty pracy i kartkówki:

```text
lesson_topic_id = wybrany temat
source_document_id = jeden DOCX
topic_title_snapshot = nazwa tematu
source_file_name_snapshot = nazwa dokumentu
```

Dla Sprawdzianu:

```text
lesson_topic_id = NULL
source_document_id = NULL
topic_title_snapshot = nazwa działu
source_file_name_snapshot = uporządkowana lista nazw gotowych DOCX
```

Nie dodano kolumny `lesson_section_id`. Identyfikator działu należy do kanonicznego `generationManifest` i wpływa na `generation_fingerprint`; zakres źródeł jest identyfikowany przez zbiorczy `source_fingerprint` oraz `source_manifest_version`.

### 7.2. Parametry materiału

```text
material_type
task_count
profiles
task_plan
```

Dopuszczalne:

```text
material_type:
- karta pracy
- kartkówka
- sprawdzian

task_count:
- 5
- 6
- 7
```

Długość `task_plan` musi odpowiadać `task_count`.

Profile:

```text
Standard
Dysleksja
ASD
ADHD
Obcojęzyczny
```

### 7.3. Tożsamość i wersje

```text
source_fingerprint
source_manifest_version
generation_fingerprint
generator_version
content_schema_version
model
```

Aktualne manifesty źródeł:

```text
karta pracy / kartkówka → document_chunks_v1
sprawdzian              → lesson_section_sources_v1
```

Aktualne wersje kontraktów:

```text
karta pracy → material_schema_v6
kartkówka    → material_schema_v5
sprawdzian  → material_schema_v6
```

Wersja jest częścią `generation_fingerprint`, dlatego zmiana kontraktu powoduje cache MISS bez zmiany schematu tabeli.

Klucz cache:

```text
unique(owner_id, generation_fingerprint)
```

### 7.4. Wynik i status

```text
status:
- generating
- ready
- failed
```

`content_json`:

- przechowuje wynik po Structured Outputs i parserze,
- nie przechowuje surowej odpowiedzi modelu,
- nie przechowuje HTML.

Spójność:

```text
generating → brak content_json i completed_at
ready      → content_json istnieje, brak error_message
failed     → brak content_json, istnieje error_message
```

### 7.5. Koszty i użycie

```text
prompt_tokens
completion_tokens
total_tokens
access_count
last_accessed_at
started_at
completed_at
created_at
updated_at
```

Cache HIT zwiększa `access_count` i aktualizuje `last_accessed_at`.

Otwarcie materiału z Historii jest operacją tylko do odczytu i nie zmienia tych pól.

Pola tokenów w `generated_materials` opisują wynik konkretnego materiału i pozostają częścią kontraktu cache. Nie zastępują osobnego rejestru `ai_usage_events`, który zapisuje rzeczywiste logiczne wywołania OpenAI, w tym próby zakończone błędem po stronie dostawcy albo parsera.

```text
cache MISS + wywołanie OpenAI
→ jedno ai_usage_events

cache HIT
→ access_count + 1
→ brak nowego ai_usage_events
```

Znaczenie dat:

```text
created_at
→ data utworzenia materiału
→ wyświetlana w Historii jako „Wygenerowano”

last_accessed_at
→ data ostatniego użycia cache przez Generator
→ używana do sortowania Historii
```

### 7.6. RLS

Nauczyciel może odczytać wyłącznie własne rekordy:

```text
owner_id = auth.uid()
```

Zapis i aktualizacja odbywają się przez serwerowy Route Handler.

Weryfikacja live Supabase z 02.08.2026 potwierdziła:

```text
RLS enabled = true
RLS forced = false

policy:
generated_materials_select_own
→ rola authenticated
→ SELECT
→ owner_id = auth.uid()

granty tabeli:
authenticated
→ SELECT

anon
→ brak grantu
```

Frontend Historii wykonuje wyłącznie odczyt. Nie otrzymuje praw `INSERT`, `UPDATE` ani `DELETE`.

---

## 8. GENERATION FINGERPRINT

Fingerprint generowania obejmuje wszystkie dane wpływające na wynik:

```text
sourceFingerprint
topicTitle
materialType
taskCount
profiles
taskPlan
generatorVersion
contentSchemaVersion
model

karta pracy / kartkówka → lessonTopicId
sprawdzian              → lessonSectionId
```

Następnie:

```text
kanoniczny JSON
→ SHA-256
→ generation_fingerprint
```

Profile są kanonizowane, dlatego inna kolejność zaznaczenia tych samych profili nie tworzy nowego fingerprintu.

Zmiana któregokolwiek elementu manifestu powoduje cache MISS.

---

## 9. ATOMOWY CLAIM CACHE

Wdrożona funkcja:

```text
public.claim_generated_material(...)
```

Migracja:

```text
supabase/sql/2026-07-29_claim_generated_material.sql
```

Funkcja działa jako `security definer` i jest wykonywana przez `service_role`.

Decyzja wykonywana jest atomowo w PostgreSQL:

```text
brak rekordu
→ INSERT generating
→ reserved

ready
→ access_count + 1
→ last_accessed_at = teraz
→ hit + content_json

świeży generating
→ in_progress

failed albo generating starszy niż 10 minut
→ reset do generating
→ reserved
```

Mechanizm:

```text
INSERT ... ON CONFLICT DO NOTHING
→ SELECT ... FOR UPDATE
→ decyzja stanu
```

To eliminuje retry loops i ręczne odtwarzanie transakcji w JavaScript.

Kolumny wyniku RPC mają prefiks `claim_` tam, gdzie nazwa mogłaby kolidować z kolumną tabeli:

```text
claim_content_json
claim_access_count
claim_started_at
```

Zapobiega to niejednoznaczności PL/pgSQL, np. dla `access_count`.

---

## 10. WARSTWA JAVASCRIPT CACHE

Plik:

```text
lib/generation/generatedMaterialsCache.js
```

Eksportuje:

```text
claimGeneratedMaterial()
markGeneratedMaterialReady()
markGeneratedMaterialFailed()
```

Odpowiedzialność:

- walidacja kontraktu RPC,
- mapowanie nazw pól SQL na kontrakt JavaScript,
- warunkowy zapis `ready`,
- warunkowy zapis `failed`.

Logika współbieżności pozostaje w PostgreSQL.

Aktualizacje `ready` i `failed` są chronione przez:

```text
id
+ owner_id
+ status = generating
+ started_at rezerwacji
```

---

## 11. CACHE HIT I MISS

### Cache HIT

```text
status = ready
→ RPC zwiększa access_count
→ odczyt content_json
→ 0 wywołań modelu
→ usage bieżącego requestu = 0 / 0 / 0
→ renderery
```

### Cache MISS

```text
status = generating
→ jedno wywołanie modelu
→ Structured Outputs
→ parser
→ content_json + usage
→ status = ready
```

Potwierdzone testy:

```text
MISS 6 zadań, Standard + ADHD:
4650 prompt + 1572 completion = 6222 total

HIT identycznego requestu:
0 prompt + 0 completion = 0 total
access_count: 1 → 2

MISS 7 zadań, Standard:
3901 prompt + 1391 completion = 5292 total
```

---

## 12. HISTORIA GENEROWAŃ — WDROŻONA

Nie utworzono osobnej tabeli `generation_requests`.

Historia korzysta bezpośrednio z rekordów:

```text
generated_materials
→ status = ready
→ owner_id = auth.uid()
→ aktywny subject_id
```

### 12.1. Warstwa kodu

Wdrożone pliki:

```text
lib/generation/generatedMaterialsHistoryApi.js
app/przedmioty/[subjectKey]/historia/page.jsx
```

Istniejący komponent podglądu:

```text
components/generator/GeneratedMaterial.jsx
```

jest ponownie używany do otwierania zapisanego materiału.

### 12.2. Lista metadanych

Pierwsze zapytanie nie pobiera `content_json`.

Lista pobiera:

```text
id
subject_id
subject_name_snapshot
topic_title_snapshot
material_type
task_count
profiles
access_count
last_accessed_at
content_schema_version
created_at
```

Warunki:

```text
owner_id = aktualny użytkownik
subject_id = aktywny przedmiot
status = ready
```

Sortowanie:

```text
last_accessed_at DESC
id DESC
```

Paginacja:

```text
50 rekordów
→ „Pokaż więcej”
```

Filtr:

```text
Wszystkie typy
karta pracy
kartkówka
sprawdzian
```

### 12.3. Otwarcie materiału

Po kliknięciu „Otwórz” wykonywane jest drugie zapytanie dla jednego rekordu.

Dodatkowe pola:

```text
task_plan
content_json
```

Zapytanie ponownie filtruje po:

```text
id
owner_id
subject_id
status = ready
```

Przed renderowaniem kontrolowane są:

```text
obsługiwany material_type
obsługiwana wersja content_schema_version dla danego typu
niepusta lista profiles
content_json jako obiekt
tasks jako niepusta tablica
tasks.length = task_count
```

Historia obsługuje:

```text
karta pracy → material_schema_v2–material_schema_v6
kartkówka    → material_schema_v1–material_schema_v5
sprawdzian  → material_schema_v1–material_schema_v6
```

Starsze pole `context` w `open_explain` nie jest renderowane uczniowi.

### 12.4. Zachowanie tylko do odczytu

Otwarcie z Historii:

- nie wywołuje `/api/generate`,
- nie wywołuje modelu,
- nie wywołuje `claim_generated_material`,
- nie tworzy nowego rekordu,
- nie aktualizuje `access_count`,
- nie aktualizuje `last_accessed_at`,
- nie odczytuje ponownie DOCX ani chunków,
- nie uruchamia parsera odpowiedzi modelu.

Materiał jest renderowany z istniejącego `content_json`.

### 12.5. UI, eksport PDF i eksport DOCX

Materiał otwiera się na tej samej stronie Historii.

Dostępne są:

```text
„Wróć do historii”
„Drukuj / Zapisz PDF”
„Pobierz DOCX”
```

Historia pokazuje:

```text
created_at
→ „Wygenerowano”
```

PDF jest generowany ponownie przez przeglądarkę z zapisanego `content_json`.

DOCX jest budowany klientowo po kliknięciu przez dynamicznie załadowany `lib/export/exportDocx.js`. Eksporter otrzymuje istniejący `content_json`, profile i aktualną skalę ocen. Nie wywołuje Generatora ani modelu.

PDF i DOCX nie są przechowywane jako pliki w Storage. Treść materiału pozostaje ta sama, ale przyszłe zmiany CSS mogą zmienić wygląd PDF, a zmiany eksportera mogą zmienić wygląd ponownie pobranego DOCX.

### 12.6. Live schemat i dane

Weryfikacja live Supabase z 02.08.2026 potwierdziła wcześniejsze rekordy kartkówki `material_schema_v1`.

Test runtime z 03.08.2026 potwierdził zapis karty pracy:

```text
material_type = karta pracy
status = ready
content_schema_version = material_schema_v3
access_count = 1
content_json istnieje
prompt_tokens = 3855
completion_tokens = 1447
total_tokens = 5302
```

Historia wyświetliła i ponownie wyrenderowała ten rekord bez wywołania modelu.

Indeks Historii:

```text
generated_materials_owner_subject_history_idx
→ owner_id
→ subject_id
→ last_accessed_at DESC
→ WHERE status = ready
```

Filtry `karta pracy`, `kartkówka` i `sprawdzian` pokazują zapisane rekordy właściwego typu.

Test runtime Sprawdzianu z 05.08.2026 potwierdził:

```text
dział = 7 tematów
ready = 3 tematy / 3 dokumenty / 19 chunków
missing = 4 tematy
MISS → zapis ready
HIT → access_count = 2 i usage 0 / 0 / 0
```

Końcowy rekord Sprawdzianu korzysta z `material_schema_v6`. Historia otwiera go z nazwą działu jako zakresem i bez wywołania modelu.

Od 09.08.2026 rzeczywiste wywołania OpenAI są dodatkowo rejestrowane w `ai_usage_events`. Historia nadal korzysta z `generated_materials`; nowa tabela nie jest źródłem treści materiałów ani listy Historii.

---

### 12.7. Kontrakt treści materiałów

Aktualny parser zapisuje wyłącznie wynik po walidacji Structured Outputs.

Karta pracy:

```text
intro: string
tip: array
glossary: array
tasks: array
```

Kartkówka:

```text
intro = ""
tip = []
glossary = []
tasks: array
```

Sprawdzian:

```text
intro = ""
tip = []
glossary = []
tasks: array
sourceTopicIds: array wszystkich dostępnych tematów działu

każde tasks[]
→ sourceTopicIds: niepusta tablica tematów rzeczywiście sprawdzanych przez zadanie
```

Parser wymaga, aby suma `tasks[].sourceTopicIds` pokrywała wszystkie identyfikatory z głównego `sourceTopicIds` i nie zawierała identyfikatorów spoza zakresu.

`open_explain`:

```text
instruction
expectedAnswer
```

Pole `context` nie należy do aktualnego kontraktu ucznia. Osobne `answerExplanation` nie jest wymagane w bieżącym kontrakcie `open_explain`. Historyczne pola mogą istnieć w starszym `content_json`, ale renderer i normalizacja ignorują `context`.

Pozostałe zmienione kontrakty wspólne:

```text
error_find
→ instruction
→ codeWithError bez komentarzy ujawniających odpowiedź
→ expectedCode
→ answerExplanation

open_code
→ requirements
→ expectedCode
→ stałe instruction dodawane przez parser
→ brak wymaganego answerExplanation
```

Warstwy ASD, ADHD, Dysleksji i Obcojęzycznego są prezentacją tego samego bazowego zestawu zadań, nie osobnymi rekordami ani osobnymi wywołaniami modelu.

---

## 13. WSPÓLNY KLUCZ, PUNKTACJA I SKALA OCEN — WDROŻONE

### 13.1. Wspólny klucz nauczyciela

Wspólny klucz nie jest osobnym rekordem bazy i nie wymaga nowej tabeli.

Przepływ:

```text
generated_materials.content_json
→ components/generator/GeneratedMaterial.jsx
→ lib/generation/buildTeacherAnswerKey.js
→ components/generator/TeacherAnswerKey.jsx
```

Klucz:

- jest budowany z istniejących pól odpowiedzi i wyjaśnień siedmiu typów zadań,
- występuje jeden raz po wszystkich profilach uczniowskich,
- działa w Generatorze i Historii przez ten sam komponent,
- nie uruchamia modelu,
- nie zmienia `content_json`,
- nie tworzy nowego rekordu `generated_materials`,
- jest zawsze widoczny na wydruku i rozpoczyna się na nowej stronie.

### 13.2. Punktacja

Źródło prawdy:

```text
lib/generation/scoring.js
```

Aktualna mapa:

```text
closed_single  → 1 pkt
closed_tf      → 1 pkt
match_fill     → 2 pkt
error_find     → 2 pkt
match_pair     → 3 pkt
open_code      → 3 pkt
open_explain   → 3 pkt
```

Punkty są wyliczane w warstwie aplikacji na podstawie `taskSubtype`. Nie są generowane przez model i nie są zapisywane jako osobne pola w `generated_materials`.

Dla aktualnych `templates.js` suma zależy od typu materiału i liczby zadań:

```text
karta pracy  → 5 zadań: 11 pkt | 6 zadań: 14 pkt | 7 zadań: 17 pkt
kartkówka    → 5 zadań:  9 pkt | 6 zadań: 14 pkt | 7 zadań: 19 pkt
sprawdzian   → 5 zadań:  9 pkt | 6 zadań: 14 pkt | 7 zadań: 19 pkt
```

Test buduje każdy plan przez `buildTaskPlan()` i pobiera typy z `templates.js`. Nie istnieje jedna uniwersalna suma dla samej liczby 5 / 6 / 7. Kartkówka i sprawdzian mają obecnie takie same sumy, ponieważ ich aktualne szablony zawierają tę samą liczbę zadań o poszczególnych wagach; po zmianie szablonów sumy mogą się różnić.

Stara statyczna `GRADE_SCALE` oraz `renderGradeScale()` zostały usunięte z `scoring.js`. Nie istnieje drugi kodowy słownik progów ocen.

Korekta testu sum punktów nie zmienia schematu Supabase, `content_json`, `generated_materials`, `generation_fingerprint` ani cache. Jest wyłącznie regresją kodową opartą na aktualnym planie z `templates.js`.

### 13.3. `teacher_grade_scales`

Tabela przechowuje jeden aktywny zestaw progów dla nauczyciela.

Migracja:

```text
supabase/sql/2026-08-03_teacher_grade_scales.sql
```

Pola:

```text
owner_id uuid primary key
  → auth.users(id) on delete cascade

grade_2_min smallint not null
grade_3_min smallint not null
grade_4_min smallint not null
grade_5_min smallint not null
grade_6_min smallint not null

scale_schema_version text not null
  → teacher_grade_scale_v1

created_at timestamptz not null
updated_at timestamptz not null
```

Constraints:

```text
każdy próg: 1–100

grade_2_min
< grade_3_min
< grade_4_min
< grade_5_min
< grade_6_min

scale_schema_version = teacher_grade_scale_v1
```

Trigger aktualizuje `updated_at` przed każdym `UPDATE`.

Ocena 1 nie ma osobnej kolumny. Jej zakres zawsze rozpoczyna się od `0%`. Górne granice wszystkich ocen są wyliczane w aplikacji na podstawie kolejnego progu minimalnego.

### 13.4. RLS i granty skali

Tabela ma włączone RLS.

`authenticated`:

```text
SELECT własnego rekordu
INSERT własnego rekordu
UPDATE własnego rekordu
```

Warunek każdej polityki:

```text
owner_id = auth.uid()
```

`authenticated` nie otrzymuje `DELETE`. `anon` nie ma żadnego grantu. `service_role` ma pełne prawa techniczne.

### 13.5. Warstwa aplikacji

Logika i API:

```text
lib/gradeScale/teacherGradeScale.js
lib/gradeScale/teacherGradeScaleApi.js
```

UI:

```text
app/ustawienia/page.jsx
```

Formularz:

- zawiera pięć progów dla ocen 2–6,
- nie obsługuje importu CSV,
- waliduje liczby całkowite, zakres `1–100` i ścisłą kolejność,
- wykonuje `upsert` po `owner_id`,
- pokazuje podgląd sześciu wyliczonych zakresów.

Domyślne wartości widoczne przed pierwszym zapisem:

```text
40 / 55 / 70 / 85 / 95
```

Wartości stają się aktywną skalą dopiero po zapisie rekordu.

### 13.6. Relacja z `teacher_profiles`

Weryfikacja live Supabase z 03.08.2026 potwierdziła istniejącą tabelę `teacher_profiles` z polami:

```text
id
user_id
display_name
email
role
is_active
created_at
updated_at
```

Skala nie została dopisana do `teacher_profiles`. `teacher_grade_scales` jest odrębnym bytem biznesowym i jest powiązana bezpośrednio z `auth.users` przez `owner_id`.

### 13.7. Semantyka Historii i cache

Zatwierdzona reguła:

```text
jedna aktywna skala konta
→ aktualna skala jest używana także przy wcześniejszych materiałach z Historii
```

Skala jest pobierana klientowo przez `GeneratedMaterial` podczas renderowania. Ten sam przepływ działa bezpośrednio po generowaniu oraz po otwarciu zapisanego `content_json` z Historii.

Skala nie jest snapshotem materiału i nie należy do:

- `content_json`,
- `content_schema_version`,
- `generation_fingerprint`,
- `claim_generated_material`,
- tożsamości cache,
- usage tokenów.

Zmiana progów:

- nie uruchamia `/api/generate`,
- nie tworzy nowego rekordu `generated_materials`,
- nie zwiększa `access_count`,
- nie aktualizuje `last_accessed_at`,
- jest widoczna przy ponownym otwarciu także starszego materiału.

Przy braku zapisanego rekordu materiał pozostaje dostępny. UI pokazuje odnośnik do `/ustawienia`, a sekcja skali nie jest drukowana.

### 13.8. Regresja

Potwierdzono:

- zapis i aktualizację jednego rekordu skali,
- odczyt skali po odświeżeniu,
- działanie skali w Generatorze,
- działanie skali dla wcześniejszego materiału z Historii,
- poprawny układ dwóch kolumn w wydruku / PDF,
- poprawne zakresy dla `40 / 55 / 70 / 85 / 95`,
- poprawne testy `testTeacherGradeScale.mjs` i `testTeacherAnswerKey.mjs`,
- czysty lint i build.

## 14. EKSPORT DOCX — WDROŻONY

### 14.1. Warstwa kodu

```text
components/generator/GeneratedMaterial.jsx
→ przycisk „Pobierz DOCX”
→ dynamiczny import eksportera

lib/export/exportDocx.js
→ buildMaterialDocx()
→ exportMaterialToDocx()

scripts/testExportDocx.mjs
→ test rzeczywistej serializacji i treści DOCX
```

Zależność klienta:

```text
docx = 9.5.1
```

`file-saver` nie jest używany. Blob jest pobierany przez natywny, tymczasowy link przeglądarki.

### 14.2. Kontrakt wejścia

Eksporter otrzymuje:

```text
materialTypeValue
materialTypeLabel
topicTitle
profiles [{ value, label }]
material = sparsowany content_json
gradeScale = aktualna skala konta albo null
```

Nie odczytuje ponownie:

- `teacher_documents`,
- `document_blocks`,
- `document_chunks`,
- modelu,
- cache claimu.

### 14.3. Źródła prawdy

```text
getTaskProfilePresentation()
→ prezentacja ASD i ADHD

getTaskPoints()
→ punktacja zadań ucznia

buildTeacherAnswerKey()
→ jeden wspólny klucz

buildTeacherGradeScaleRanges()
→ aktualna skala ocen
```

Eksporter nie utrzymuje równoległej mapy punktów, skali ani reguł profili.

### 14.4. Budowa dokumentu

```text
aktualny content_json
→ sekcja ucznia dla każdego profilu
→ każdy kolejny profil od nowej strony
→ jeden wspólny klucz na końcu
→ A4
→ Packer.toBlob()
→ pobranie pliku
```

Karta pracy zawiera `intro`, `tip` i słowniczek tylko dla profilu Obcojęzycznego. Bloki kodu używają czcionki monospace i zachowują podziały wierszy oraz wcięcia.

### 14.5. Relacja z bazą i Historią

Eksport DOCX:

- nie tworzy tabeli ani migracji,
- nie zapisuje rekordu `material_exports`,
- nie tworzy nowego `generated_materials`,
- nie aktualizuje `access_count` ani `last_accessed_at`,
- nie zmienia `content_json`,
- nie wpływa na `generation_fingerprint`,
- nie zapisuje pliku w Storage,
- działa także po otwarciu istniejącego materiału z Historii.

### 14.6. Regresja

Automatyczny test obejmuje kartę pracy 7 zadań × 5 profili, jeden słowniczek, jeden klucz, sumę 17 pkt, skalę ocen, wielowierszowy kod oraz kartkówkę z `closed_tf` i sumą 9 pkt.

Runtime w Microsoft Word potwierdził eksport kart pracy i kartkówek z Historii, nową stronę dla profili, jeden klucz, prawidłowe sumy 9 / 11 / 14 pkt oraz zachowanie operatorów i wcięć kodu. Testy Node, lint i build są czyste; pakiet został zatwierdzony w repozytorium.

---

## 15. SPRAWDZIAN DLA CAŁEGO DZIAŁU — WDROŻONY

### 15.1. Warstwa kodu

```text
app/przedmioty/[subjectKey]/generator/page.jsx
→ wybór działu
→ modal partial_sources

app/api/generate/route.js
→ walidacja lessonSectionId
→ kontrola prywatnego katalogu i działu
→ wybór kontekstu tematu albo działu

lib/generation/getLessonSectionSourceContext.js
→ agregacja i integralność wielu źródeł

lib/generation/buildMaterialResponseSchema.js
→ sourceTopicIds tylko dla Sprawdzianu

lib/generation/parseGeneratedMaterial.js
→ kontrola zakresu i pełnego pokrycia tematów
```

### 15.2. Manifest źródeł działu

`lesson_section_sources_v1` zawiera:

```text
lessonSectionId
ordered topics[]
→ lessonTopicId
→ title
→ sourceFingerprint albo null
→ sourceManifestVersion albo null
```

Fingerprint jest SHA-256 kanonicznego JSON manifestu. Obejmuje kolejność i pełny katalog aktywnych tematów, dlatego zmienia się również po dodaniu gotowego dokumentu do wcześniej brakującego tematu.

Każdy dokument jest najpierw weryfikowany przez istniejący `buildVerifiedDocumentSourceContext()`. Agregator nie omija kontroli integralności pojedynczych DOCX.

### 15.3. Częściowe źródła

```text
0 gotowych tematów
→ LessonSectionSourceNotFoundError
→ HTTP 422 / no_sources

co najmniej 1 brakujący temat bez potwierdzenia
→ HTTP 409 / partial_sources

acceptPartialSources = true
→ generowanie wyłącznie z gotowych tematów
```

`acceptPartialSources` jest dopuszczone wyłącznie dla `material_type = sprawdzian`. Potwierdzenie nie jest częścią `generation_fingerprint`, ponieważ nie zmienia użytego zestawu źródeł; zestaw identyfikuje `source_fingerprint`.

### 15.4. Relacja z `generated_materials`

Istniejące kolumny `lesson_topic_id` i `source_document_id` są nullable. Sprawdzian zapisuje w nich `NULL`, ponieważ nie ma jednego tematu ani jednego dokumentu.

Nie dodano:

```text
lesson_section_id w generated_materials
generation_request_sources
material_sources
```

Aktualna potrzeba cache i Historii jest pokryta przez:

```text
topic_title_snapshot
source_file_name_snapshot
source_fingerprint
source_manifest_version
generation_fingerprint
content_json.sourceTopicIds
```

### 15.5. Uprawnienia

Migracja:

```text
supabase/sql/2026-08-05_generator_lesson_sections_service_role_select.sql
```

Nadaje `service_role` wyłącznie `SELECT` na `public.lesson_sections`. Nie zmienia polityk RLS ani grantów `anon` i `authenticated`.

### 15.6. Regresja

Potwierdzono dział z 7 tematami, 3 gotowymi dokumentami i 4 brakującymi źródłami. Zbiorczy kontekst obejmował 3 dokumenty i 19 chunków. MISS utworzył gotowy rekord, a HIT zwiększył `access_count` do 2 bez nowych tokenów.

Końcowy materiał `material_schema_v6` zawierał 7 zadań, profil Standard i 19 pkt. Historia, PDF i DOCX zadziałały. Lint i build są czyste.

## 16. ELEMENTY WYCOFANE I ZACHOWANE

### Coverage

Wycofany mechanizm coverage został usunięty z aktywnego projektu:

- sześć modułów coverage usunięto z `lib/privateRag`,
- testy wycofanej architektury usunięto lub zastąpiono aktualnymi,
- tabela `private_rag_task_type_coverage_cache` została usunięta,
- Route Handler nie używa `coverage`, `isSupported` ani `buildSafeTaskPlan`.

Coverage pozostaje wyłącznie w historycznych checkpointach `smartteacher_etapy.md`.

### Semantic retrieval

Funkcje semantic search, chunki i embeddingi pozostają w bazie.

Nie są używane przez aktualny Route Handler dla jednego krótkiego DOCX, ale nie należy ich usuwać bez osobnej decyzji dotyczącej długich albo wielu dokumentów.

## 17. CLEANUP BAZY — ZAKOŃCZONY

Cleanup po stabilizacji Generatora wykonano w trzech oddzielnych migracjach.

### 17.1. Usunięcie coverage cache

Migracja:

```text
supabase/sql/2026-07-30_drop_private_rag_task_type_coverage_cache.sql
```

Usunięto:

```text
public.private_rag_task_type_coverage_cache
```

Operacja została wykonana bez `CASCADE`. Kontrola końcowa potwierdziła `coverage_table_exists = false`.

### 17.2. Usunięcie zduplikowanych indeksów katalogu

Migracja:

```text
supabase/sql/2026-07-31_drop_duplicate_catalog_indexes.sql
```

Zachowano indeksy kanoniczne:

```text
lesson_sections_catalog_order_idx
lesson_topics_catalog_section_order_idx
```

Usunięto strukturalnie identyczne duplikaty:

```text
lesson_sections_catalog_active_order_idx
lesson_topics_catalog_section_active_order_idx
```

Migracja przed usunięciem sprawdzała równoważność strukturalną i brak powiązania z constraintem.

### 17.3. Cleanup przeciążenia RPC importu CSV

Migracja:

```text
supabase/sql/2026-07-31_cleanup_lesson_catalog_rpc_overload.sql
```

Usunięto stare przeciążenie:

```text
create_private_lesson_catalog_from_import(uuid, uuid, text, text, text)
```

Pozostawiono:

```text
create_private_lesson_catalog_from_import(uuid, uuid, uuid, text, text, text)
```

Dla aktualnej funkcji potwierdzono:

```text
SECURITY DEFINER = true
PUBLIC EXECUTE   = false
anon EXECUTE     = false
authenticated    = true
```

Ponowny import CSV po migracji potwierdził utworzenie katalogu przypisanego do wybranej klasy.

### 17.4. Elementy świadomie pozostawione

Nie usunięto:

- `document_blocks`,
- `document_chunks`,
- `document_embeddings`,
- funkcji semantic search,
- `generated_materials`,
- `claim_generated_material`,
- danych katalogu CSV,
- polityk RLS wyglądających na nakładające się.

Polityki RLS wymagają osobnego audytu pełnej macierzy ról i nie były częścią cleanupu przed startem sprzedaży.

## 18. `ai_usage_events` — TELEMETRIA OPENAI WDROŻONA

### 18.1. Odpowiedzialność

Tabela jest append-only rejestrem rzeczywistych logicznych wywołań OpenAI dla:

```text
material_generation
document_embedding
```

Nie przechowuje:

- treści promptu ani odpowiedzi modelu,
- cenników,
- wyliczonego kosztu pieniężnego,
- kosztów Supabase, Vercel, Storage, transferu ani płatności,
- zdarzeń cache HIT,
- danych uzupełnionych wstecz dla historycznych generowań.

Migracja:

```text
supabase/sql/2026-08-06_ai_usage_events.sql
```

### 18.2. Kolumny

| Kolumna | Typ | Odpowiedzialność |
|---|---|---|
| `id` | `uuid` | klucz główny, domyślnie `gen_random_uuid()` |
| `owner_id` | `uuid` | właściciel wywołania, `auth.users(id) ON DELETE CASCADE` |
| `generated_material_id` | `uuid NULL` | relacja operacji Generatora, `ON DELETE SET NULL` |
| `source_document_id` | `uuid NULL` | relacja operacji embeddingów, `ON DELETE SET NULL` |
| `operation` | `text` | `material_generation` albo `document_embedding` |
| `model` | `text` | rzeczywisty model dostawcy |
| `status` | `text` | `succeeded` albo `failed` |
| `usage_known` | `boolean` | kompletność i spójność usage wymaganego dla operacji |
| `input_tokens` | `integer NULL` | tokeny wejściowe |
| `cached_input_tokens` | `integer NULL` | tokeny wejściowe z cache promptu OpenAI; dotyczy Generatora |
| `output_tokens` | `integer NULL` | tokeny wyjściowe; dotyczy Generatora |
| `total_tokens` | `integer NULL` | łączna liczba tokenów zwrócona przez dostawcę |
| `created_at` | `timestamptz` | czas zapisu zdarzenia, domyślnie `now()` |

`cached_input_tokens` nie opisuje cache `generated_materials`. Jest to informacja o cache promptu po stronie OpenAI.

### 18.3. Relacje i constraints

Przy zapisie obowiązuje dokładnie jedna relacja operacyjna:

```text
material_generation
→ generated_material_id istnieje
→ source_document_id = NULL

document_embedding
→ source_document_id istnieje
→ generated_material_id = NULL
```

Usunięcie materiału lub dokumentu ustawia relację na `NULL`, ale zachowuje historyczne zdarzenie. Usunięcie użytkownika usuwa jego zdarzenia przez `ON DELETE CASCADE`.

Tokeny muszą być nieujemnymi liczbami całkowitymi. Jeżeli `cached_input_tokens` istnieje, nie może przekraczać `input_tokens`.

Gdy `usage_known = true`:

```text
material_generation
→ input_tokens istnieje
→ output_tokens istnieje
→ total_tokens = input_tokens + output_tokens

document_embedding
→ input_tokens istnieje
→ total_tokens = input_tokens
→ cached_input_tokens = NULL
→ output_tokens = NULL
```

Gdy dostawca nie zwróci kompletnego usage:

```text
usage_known = false
→ brakujące wartości pozostają NULL
→ nie zapisujemy fikcyjnych zer
```

### 18.4. Indeksy

```text
ai_usage_events_pkey
→ id

ai_usage_events_created_at_idx
→ created_at DESC

ai_usage_events_owner_created_at_idx
→ owner_id, created_at DESC

ai_usage_events_generated_material_idx
→ generated_material_id
→ WHERE generated_material_id IS NOT NULL

ai_usage_events_source_document_idx
→ source_document_id
→ WHERE source_document_id IS NOT NULL
```

### 18.5. RLS i granty

Tabela ma:

```text
RLS enabled = true
RLS forced = false
brak polityk frontendowych
```

Granty:

```text
PUBLIC        → brak
anon          → brak
authenticated → brak
service_role  → SELECT, INSERT
```

Frontend nie odczytuje i nie zapisuje telemetrii. Aktywny kod nie ma uprawnień `UPDATE` ani `DELETE`, dlatego rejestr jest append-only.

### 18.6. Warstwa aplikacji

```text
lib/aiUsage/notifyAiUsageEvent.js
→ bezpieczne powiadomienie listenera

lib/aiUsage/recordAiUsageEvent.js
→ walidacja i mapowanie kontraktu
→ INSERT do ai_usage_events
→ recordAiUsageEventSafely() nie propaguje błędu zapisu

app/api/generate/route.js
→ owner_id z uwierzytelnionego użytkownika
→ generated_material_id z atomowego claimu cache
→ operacja material_generation wyłącznie po MISS

app/api/private-rag/extract/route.js
→ owner_id z uwierzytelnionego użytkownika
→ source_document_id z przetwarzanego dokumentu
→ operacja document_embedding wyłącznie przy wywołaniu OpenAI
```

Instrumentowane funkcje dostawcy:

```text
generateMaterialFromContext.js
createEmbeddingVectors.js
```

Jedna podjęta próba wywołania tworzy najwyżej jedno zdarzenie:

```text
poprawna odpowiedź i dalsza walidacja
→ succeeded

błąd dostawcy
albo nieprawidłowa odpowiedź
albo błąd parsera po odpowiedzi
→ failed
→ zachowanie dostępnego usage

błąd walidacji przed wywołaniem OpenAI
→ brak zdarzenia
```

Zapis telemetrii działa w trybie best effort. Błąd `INSERT` jest widoczny w logach serwera, ale nie może zmienić wyniku poprawnego generowania materiału ani embeddingów.

### 18.7. Relacja z cache i Historią

```text
cache MISS
→ jedno wywołanie OpenAI
→ jedno ai_usage_events

cache HIT
→ access_count + 1 w generated_materials
→ 0 nowych tokenów
→ brak nowego ai_usage_events

otwarcie z Historii
→ tylko content_json
→ brak wywołania OpenAI
→ brak nowego ai_usage_events
```

`generated_materials` pozostaje źródłem cache i Historii oraz zachowuje usage gotowego materiału. `ai_usage_events` jest odrębnym rejestrem prób wywołania dostawcy, również tych zakończonych błędem.

### 18.8. Testy i dane live

Testy kontraktowe:

```text
scripts/testAiUsageEvents.mjs
scripts/testOpenAiUsageInstrumentation.mjs
```

Smoke test Generatora z 09.08.2026:

```text
operation = material_generation
status = succeeded
model = gpt-4o-mini
usage_known = true
input_tokens = 3247
cached_input_tokens = 0
output_tokens = 666
total_tokens = 3913
source_document_id = NULL
dokładnie jedno zdarzenie dla cache MISS
```

Smoke test embeddingów z 09.08.2026:

```text
operation = document_embedding
status = succeeded
model = text-embedding-3-small
usage_known = true
input_tokens = 1757
cached_input_tokens = NULL
output_tokens = NULL
total_tokens = 1757
generated_material_id = NULL
6 nowych embeddingów, 0 użytych ponownie
dokładnie jedno zdarzenie
```

Migracja, live schema, constraints, indeksy, RLS, granty, instrumentacja, lint i build zostały potwierdzone. Pakiet został zatwierdzony w repozytorium.

## 19. LIMITY, PLAN FREE, CENNIK I SUBSKRYPCJE — WDROŻONE

### 19.1. Obowiązujące kontrakty planów

W `subscription_plans` istnieją dwa aktywne plany produktu.

Plan Free:

```text
plan_key = smartteacher_free_v1
display_name = SmartTeacher — Plan Free
currency = PLN
price_gross_minor = 0
billing_interval = one_time
billing_interval_count = 1
generation_limit = 2
access_model = one_time
worksheet_generation_limit = 1
quiz_generation_limit = 1
test_generation_limit = 0
lesson_topic_limit = 1
billing_provider = internal
provider_price_id = NULL
is_active = true
```

Plan płatny:

```text
plan_key = smartteacher_monthly_pln_v1
display_name = SmartTeacher — plan miesięczny
currency = PLN
price_gross_minor = 2900
billing_interval = month
billing_interval_count = 1
generation_limit = 20
access_model = recurring
worksheet_generation_limit = 20
quiz_generation_limit = 20
test_generation_limit = 20
lesson_topic_limit = NULL
billing_provider = stripe
provider_price_id = price_1U31CvIkqkfu7eeDNuEEBxj9
is_active = true
```

Dla planu miesięcznego jedna jednostka limitu oznacza jeden poprawnie zakończony cache MISS Kreatora, niezależnie od liczby profili w komplecie.

```text
cache HIT
→ brak rezerwacji i brak zużycia limitu

cache MISS
→ atomowa rezerwacja jednej jednostki

sukces generowania
→ reserved_count - 1
→ used_count + 1

błąd generowania
→ reserved_count - 1
→ used_count bez zmiany
```

Plan Free używa tego samego atomowego śladu rezerwacji, ale dodatkowo egzekwuje regułę produktową:

```text
1 × karta pracy
+ 1 × kartkówka
+ ten sam lesson_topic_id
+ sprawdzian niedostępny
+ cache HIT nie zużywa kolejnej jednostki
```

`ai_usage_events` nie jest licznikiem planu. Telemetria OpenAI i limit produktu mają oddzielne odpowiedzialności.

### 19.2. `subscription_plans`

Tabela przechowuje wersjonowany kontrakt planów oferowanych klientom:

| Kolumna | Odpowiedzialność |
|---|---|
| `id` | klucz techniczny planu |
| `plan_key` | stabilny klucz biznesowy |
| `display_name` | nazwa wyświetlana |
| `currency` | waluta ISO |
| `price_gross_minor` | cena w najmniejszej jednostce waluty |
| `billing_interval` | `one_time` albo `month` zgodnie z modelem dostępu |
| `billing_interval_count` | obecnie `1` |
| `generation_limit` | łączny limit techniczny używany przez okres dostępu |
| `access_model` | `one_time` albo `recurring` |
| `worksheet_generation_limit` | limit kart pracy |
| `quiz_generation_limit` | limit kartkówek |
| `test_generation_limit` | limit sprawdzianów |
| `lesson_topic_limit` | ograniczenie liczby tematów; `1` dla Planu Free, `NULL` dla płatnego |
| `billing_provider` | `internal` albo `stripe` |
| `provider_price_id` | identyfikator Stripe Price dla planu płatnego, `NULL` dla wewnętrznego |
| `is_active` | dostępność planu |
| `created_at`, `updated_at` | metadane czasu |

Constraints rozdzielają kontrakt:

```text
internal + one_time + 0 PLN + provider_price_id NULL
albo
stripe + recurring + cena > 0
```

Plan płatny przed Checkout jest dodatkowo weryfikowany względem rzeczywistego obiektu Stripe Price: aktywność, tryb Sandbox / Live, identyfikator, waluta, kwota i interwał.

Publiczny cennik nie odczytuje tabeli z frontendu. `GET /api/billing/plans` korzysta serwerowo z `service_role`, zwraca wyłącznie oczyszczony kontrakt obu aktywnych planów i wymaga obecności dokładnie `smartteacher_free_v1` oraz `smartteacher_monthly_pln_v1`.

### 19.3. `internal_entitlements`

Tabela przechowuje wewnętrzne uprawnienia, które nie są subskrypcją Stripe. Obsługiwane typy:

```text
project_owner
free_plan
```

Konto ma najwyżej jeden rekord identyfikowany przez `owner_id`.

Uprawnienie właścicielskie:

- korzysta z planu i limitu bez tworzenia Stripe Customer,
- ma pierwszeństwo przy ustalaniu dostępu,
- blokuje Checkout dla tego samego konta,
- nie używa pól stanu Planu Free.

Plan Free jest przyznawany przez:

```text
public.ensure_free_plan_entitlement(uuid)
```

Funkcja:

- jest `SECURITY DEFINER`,
- ma `EXECUTE` wyłącznie dla `service_role`,
- używa blokady właściciela,
- wymaga istniejącego i potwierdzonego użytkownika `auth.users`,
- nie przyznaje Planu Free, jeśli istnieje już `internal_entitlement` innego typu albo jakakolwiek historia `teacher_subscriptions`,
- tworzy jednorazowy aktywny `free_plan` tylko raz.

Pola Planu Free:

```text
lesson_topic_id
provisional_lesson_topic_id
worksheet_used
worksheet_reserved
quiz_used
quiz_reserved
converted_at
```

`lesson_topic_id` jest utrwalany dopiero po pierwszym udanym generowaniu. `provisional_lesson_topic_id` chroni spójność tematu w trakcie aktywnej rezerwacji, zanim sukces zostanie sfinalizowany.

Po aktywacji płatnej subskrypcji trigger `teacher_subscriptions_end_free_plan` zmienia aktywny `free_plan` na `revoked` i zapisuje `converted_at`. Plan Free nie wraca po późniejszym anulowaniu płatnej subskrypcji.

### 19.4. `teacher_subscriptions` i `billing_customers`

`billing_customers` przechowuje trwałe mapowanie:

```text
auth.users.id
↔ Stripe Customer cus_...
```

`owner_id` oraz `provider_customer_id` są unikalne. Jeden klient Stripe nie może zostać przypisany do dwóch kont SmartTeacher.

`teacher_subscriptions` przechowuje lokalny snapshot subskrypcji Stripe:

```text
owner_id
plan_id
provider_customer_id
provider_subscription_id
provider_subscription_created_at
provider_event_created_at
provider_event_id
status
cancel_at_period_end
cancel_at
current_period_start
current_period_end
canceled_at
ended_at
```

Semantyka anulowania:

```text
cancel_at_period_end
→ surowy boolean Stripe zachowany dla kompatybilności

cancel_at
→ nullable timestamptz z Stripe subscription.cancel_at
→ rzeczywisty przyszły termin zaplanowanego anulowania w flexible billing

canceled_at
→ moment anulowania / żądania anulowania według Stripe
→ nie jest automatycznie datą końca dostępu

ended_at
→ rzeczywiste zakończenie subskrypcji, jeśli nastąpiło
```

Nie wykonano historycznego backfillu `cancel_at`, ponieważ `canceled_at` i `current_period_end` nie są równoważne temu polu.

Obsługiwane statusy:

```text
incomplete
incomplete_expired
trialing
active
past_due
unpaid
paused
canceled
```

Jedno konto może mieć najwyżej jedną nieterminalną subskrypcję. Statusy terminalne to `canceled` i `incomplete_expired`.

### 19.5. `subscription_usage_periods`

Tabela przechowuje snapshot limitu dla konkretnego okresu użycia:

```text
owner_id
plan_id
subscription_id XOR internal_entitlement_id
period_start
period_end
generation_limit
used_count
reserved_count
```

Dokładnie jedno źródło okresu musi być ustawione: subskrypcja Stripe albo wewnętrzne uprawnienie. Obowiązuje constraint:

```text
used_count >= 0
reserved_count >= 0
used_count + reserved_count <= generation_limit
```

`generation_limit` jest snapshotem okresu. Zakończone okresy zachowują historyczny limit nawet po zmianie planu.

Dla Planu Free ogólny `generation_limit = 2` jest dodatkowo zawężany przez atomowe pola `worksheet_*`, `quiz_*` i wspólny `lesson_topic_id`. Sam licznik `2` nie zastępuje reguły `1 + 1`.

### 19.6. `generation_quota_reservations`

Tabela łączy konkretną próbę cache MISS z okresem użycia i materiałem:

```text
owner_id
usage_period_id
generated_material_id
reservation_started_at
state = reserved | consumed | released
reserved_at
consumed_at
released_at
release_reason
```

Jedna próba materiału może mieć najwyżej jedną aktywną rezerwację. Relacja do `generated_materials` używa `ON DELETE SET NULL`, aby usunięcie materiału nie niszczyło śladu operacji limitu.

Plan Free korzysta dodatkowo z triggerów:

```text
generation_quota_reservations_free_guard
→ BEFORE INSERT
→ blokuje sprawdzian, drugi materiał tego samego typu i inny temat
→ ustawia rezerwację typu oraz provisional_lesson_topic_id

generation_quota_reservations_free_finalize
→ AFTER UPDATE OF state
→ przy consumed utrwala użyty typ i lesson_topic_id
→ przy released zwalnia slot bez zużycia
```

Funkcje triggerów są `SECURITY DEFINER` i nie są wykonywalne przez `PUBLIC`, `anon` ani `authenticated`.

### 19.7. Atomowe RPC Kreatora

Rozszerzone `claim_generated_material` wykonuje pod wspólną blokadą właściciela:

```text
ustalenie aktywnego internal_entitlement albo subskrypcji
→ utworzenie lub odczyt okresu użycia
→ sprawdzenie cache
→ sprawdzenie limitu
→ rezerwacja jednej jednostki dla MISS
```

Obsługiwane stany claimu obejmują:

```text
hit
miss
in_progress
subscription_required
limit_exhausted
free_material_not_allowed
free_material_type_exhausted
free_topic_mismatch
```

Route Handler mapuje stany Planu Free do wspólnego kontraktu frontendowego `free_plan_restriction` z różnymi komunikatami i statusami HTTP. Atomowa odpowiedź claimu pozostaje rozstrzygająca w chwili generowania.

Finalizacja odbywa się przez:

```text
finalize_generated_material_success
→ zapis ready
→ consumed
→ reserved_count - 1
→ used_count + 1

finalize_generated_material_failure
→ zapis failed
→ released
→ reserved_count - 1
```

Wszystkie krytyczne operacje limitu są wykonywane w PostgreSQL. Warstwa JavaScript pozostaje cienkim adapterem.

### 19.8. `billing_webhook_events` i synchronizacja Stripe

Tabela zapisuje stan przetwarzania zweryfikowanych zdarzeń:

```text
provider_event_id UNIQUE
event_type
livemode
status = processing | processed | failed
error_message
received_at
processed_at
updated_at
```

Webhook przyjmuje surowe body, weryfikuje podpis `stripe-signature`, pobiera aktualną subskrypcję ze Stripe i normalizuje jej dane. Obsługiwane są:

```text
checkout.session.completed
customer.subscription.created
customer.subscription.updated
customer.subscription.deleted
customer.subscription.paused
customer.subscription.resumed
invoice.paid
invoice.payment_failed
```

`normalizeStripeSubscription` zachowuje zarówno:

```text
cancelAtPeriodEnd
cancelAt
```

`sync_stripe_subscription_event` atomowo:

- blokuje operacje dla jednego `owner_id`,
- zapewnia idempotencję po `provider_event_id`,
- sprawdza zgodność trybu, planu, ceny, klienta i subskrypcji,
- aktualizuje snapshot `teacher_subscriptions`, w tym `cancel_at`,
- tworzy albo zachowuje okres użycia dla aktywnej subskrypcji,
- zwraca `applied` albo `duplicate`.

Aktualna i jedyna sygnatura RPC ma 17 parametrów i zawiera:

```text
p_cancel_at timestamptz DEFAULT NULL
```

Default służy wyłącznie bezpiecznej kolejności wdrożenia; aktualny backend przekazuje `p_cancel_at` jawnie.

Ponowne dostarczenie już przetworzonego `provider_event_id` poprawnie zwraca `duplicate` i nie mutuje danych. Nie osłabiamy idempotencji w celu backfillu historycznych pól.

### 19.9. RLS i granty

Wszystkie prywatne tabele pakietu mają włączone RLS i nie mają polityk frontendowych. `PUBLIC`, `anon` i `authenticated` nie otrzymują bezpośrednich grantów do danych billingowych.

Minimalne granty `service_role` obejmują między innymi:

```text
subscription_plans              → SELECT
teacher_subscriptions           → SELECT, INSERT, UPDATE
internal_entitlements           → SELECT
subscription_usage_periods      → SELECT
generation_quota_reservations   → SELECT
billing_webhook_events          → SELECT, INSERT, UPDATE
billing_customers               → SELECT, INSERT
```

Publiczny cennik jest udostępniany wyłącznie przez Route Handler, a nie przez grant `anon` do `subscription_plans`.

Funkcje `ensure_free_plan_entitlement` i `sync_stripe_subscription_event` są `SECURITY DEFINER` oraz mają `EXECUTE` wyłącznie dla `service_role`. Triggery Planu Free nie są bezpośrednio wykonywane przez role frontendowe.

### 19.10. Warstwa aplikacji i konfiguracja

```text
GET  /api/billing/plans
→ publiczny, oczyszczony kontrakt dwóch aktywnych planów

GET  /api/billing/status
→ dostęp, status subskrypcji, plan, użycie, stan Planu Free i dozwolone akcje

POST /api/billing/checkout
→ walidacja płatnego planu i utworzenie albo ponowne użycie sesji Checkout

POST /api/billing/portal
→ sesja Stripe Customer Portal dla istniejącego klienta

POST /api/billing/webhook
→ weryfikacja podpisu i synchronizacja zdarzenia
```

Warstwa UI korzysta z tego kontraktu przez:

```text
app/cennik/page.jsx
app/cennik/layout.jsx
app/subskrypcja/page.jsx
app/subskrypcja/layout.jsx
lib/billing/billingApi.js
components/layout/Topbar.jsx
components/auth/registerForm.jsx
```

`/cennik` nie ma własnej kopii danych cenowych. Wyświetla dwa plany zwrócone przez `/api/billing/plans`.

`/subskrypcja` nie odczytuje tabel billingowych bezpośrednio. Dla Planu Free pokazuje osobno wykorzystanie karty pracy i kartkówki oraz informację o przypisaniu tematu. Dla Stripe pokazuje okres, użycie limitu, Checkout albo portal zgodnie z backendem.

Backend zwraca semantyczne pole:

```text
subscription.scheduledCancellationAt
```

Wyliczenie:

```text
subscription.cancel_at
albo
subscription.current_period_end,
gdy cancel_at_period_end = true
```

Dzięki temu UI nie musi rozpoznawać trybu `classic` ani `flexible` Stripe. Gdy `scheduledCancellationAt` istnieje i dostęp Stripe jest nadal aktywny, UI pokazuje komunikat o anulowaniu z dostępem do konkretnej daty.

Kreator zachowuje kontrakt blokad przez:

```text
lib/generation/generationApi.js
app/przedmioty/[subjectKey]/generator/page.jsx
scripts/testGenerationAccessUiContract.mjs
```

Frontendowe kody obejmują:

```text
subscription_required
generation_limit_exhausted
free_plan_restriction
```

Inne błędy pozostają czerwone i nie otrzymują CTA billingowego.

Wymagane zmienne serwerowe:

```text
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
SMARTTEACHER_APP_URL
```

Aktualny przepływ używa hostowanego Stripe Checkout i serwerowego przekierowania, dlatego kod nie wymaga `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`.

### 19.11. Migracje i potwierdzony stan

```text
2026-08-09_subscription_quota_foundation.sql
→ tabele limitu i atomowe RPC Kreatora

2026-08-09_subscription_quota_stripe_backend.sql
→ billing_customers i atomowa synchronizacja webhooka

2026-08-10_subscription_plan_launch_price.sql
→ korekta historycznej ceny planu z 39 zł do 29 zł

2026-08-10_subscription_plan_generation_limit.sql
→ korekta limitu z 50 do 20

2026-08-11_subscription_plan_stripe_price_id.sql
→ przypisanie zatwierdzonego price_id Stripe Sandbox

2026-08-12_free_plan_and_pricing.sql
→ Plan Free, kolumny kontraktu planów, atomowa reguła 1 + 1, konwersja do płatnego planu i fundament publicznego cennika

2026-08-12_stripe_flexible_cancel_at.sql
→ teacher_subscriptions.cancel_at i 17-parametrowa synchronizacja Stripe flexible billing
```

Historyczne wartości `39 zł / 50` pozostają w wcześniejszych migracjach jako część historii zmian, ale nie opisują aktualnego planu.

Kontrole po migracji `cancel_at` potwierdziły:

```text
cancel_at timestamptz NULL
sync_stripe_subscription_event = jedna 17-parametrowa sygnatura
SECURITY DEFINER = true
EXECUTE PUBLIC = false
EXECUTE anon = false
EXECUTE authenticated = false
EXECUTE service_role = true
```

Test flexible billing 12.08.2026 potwierdził rzeczywisty stan subskrypcji:

```text
status = active
cancel_at_period_end = false
cancel_at = 2026-09-12 17:35:52+00
current_period_end = 2026-09-12 17:35:52+00
ended_at = NULL
```

UI poprawnie pokazało:

```text
„Subskrypcja została anulowana, ale dostęp pozostaje aktywny do 12 września 2026.”
```

Plan Free i cennik przeszły test kontraktowy, testy UI / przepływu, ESLint i build. Poprawka `cancel_at` przeszła test Stripe, ESLint, build, deployment Vercel i ręczny test end-to-end.

Po testach konto testowe zostało usunięte kontrolowanie:

```text
Stripe Customer usunięty
→ customer.subscription.deleted = HTTP 200
→ 2 obiekty Storage teacher-documents usunięte
→ Supabase Auth user usunięty
→ auth_user_remaining = 0
→ storage_objects_remaining = 0
→ billing_customers = 0
→ teacher_subscriptions = 0
→ subscription_usage_periods = 0
→ generation_quota_reservations = 0
→ internal_entitlements = 0
```

`billing_webhook_events` nie ma relacji właścicielskiej do `auth.users` i pozostaje jako techniczny rejestr oraz mechanizm idempotencji.

### 19.12. Zamknięcie pakietu

Fundament limitu, backend Stripe, Plan Free, publiczny cennik, pełny test Sandbox, obsługa zaplanowanego anulowania w flexible billing, cleanup danych testowych, strona `/subskrypcja`, komunikaty Kreatora i końcowa regresja są zakończone.

Plan Free i `/cennik` zostały dodane 12.08.2026 poza wcześniejszą roadmapą. Są traktowane jako zakończone rozszerzenie istniejącego pakietu, a nie jako nowy bieżący priorytet.

Pakiet nie powinien być ponownie otwierany bez wykrytej regresji albo nowej decyzji biznesowej. Następny planowany obszar pozostaje zgodny z `plan.md`: audyt hostingu i własnego SMTP.

## 20. STORAGE

### `teacher-documents`

Prywatny bucket na źródłowe CSV i DOCX. Ścieżki muszą uwzględniać właściciela.

### Eksporty

PDF i DOCX wygenerowanych materiałów nie są przechowywane w osobnej tabeli ani bucketcie.

PDF jest tworzony przez aktualny renderer i mechanizm wydruku przeglądarki. DOCX jest budowany klientowo przez `lib/export/exportDocx.js` z `content_json` i aktualnej skali ocen. Trwały cache eksportów zostanie zaprojektowany dopiero, gdy pojawi się realna potrzeba biznesowa.

---

## 21. ŚWIADOMIE ODŁOŻONE ELEMENTY

Nie wdrażać w najbliższym pakiecie:

- `generation_requests`,
- `generation_request_sources`,
- `generated_material_outputs`,
- drugi rejestr usage równoległy do `ai_usage_events`,
- `material_exports`,
- `knowledge_units`,
- wiele dokumentów dla jednego tematu,
- hybrid search,
- reranking,
- HNSW,
- grupy A/B,
- shuffle.

Każdy element wymaga osobnej potrzeby biznesowej i testu.

---

## 22. KOLEJNOŚĆ DALSZEGO WDROŻENIA

Aktualizacja 12.08.2026: poza wcześniejszą kolejnością wdrożono i zamknięto Plan Free, publiczny `/cennik` oraz poprawkę Stripe flexible billing dla `cancel_at`. Nie zmienia to następnego planowanego obszaru: hostingu i SMTP.

Zakończone:

```text
1. pełny odczyt dokumentu
2. taskPlan z templates.js dla 5 / 6 / 7
3. generation_fingerprint
4. atomowy cache generated_materials
5. refactor Route Handlera
6. testy MISS / HIT / no_sources
7. cleanup coverage
8. usunięcie zduplikowanych indeksów
9. cleanup starego przeciążenia RPC importu CSV
10. regresja lokalna i na Vercel
11. podłączenie Historii do generated_materials
12. odczyt jednego content_json bez wywołania modelu
13. ponowny wydruk / PDF z Historii
14. jeden wspólny klucz nauczyciela
15. punktacja siedmiu typów zadań
16. indywidualna skala ocen nauczyciela
17. aktualna skala także dla wcześniejszych materiałów z Historii
```

Zakończone dodatkowo:

```text
18. cleanup nieużywanych modułów starego projektu
19. karta pracy dla wszystkich profili
20. intro, tip i słowniczek w jednym wywołaniu modelu
21. material_schema_v3 dla karty pracy
22. open_explain bez context dla ucznia
23. ponowny wydruk karty pracy z Historii
24. końcowa regresja karty pracy 6 / 7 + HIT / no_sources
25. regresja punktacji: 3 typy materiałów × 5 / 6 / 7
26. audyt i eksport DOCX
27. regresja kartkówki i wspólnego kontraktu zadań
28. Sprawdzian dla całego działu
29. lesson_section_sources_v1 i pokrycie sourceTopicIds
30. częściowe źródła z jawnym potwierdzeniem nauczyciela
31. Historia, PDF i DOCX Sprawdzianu
32. audyt rzeczywistych wywołań OpenAI i kontraktu usage
33. migracja ai_usage_events
34. instrumentacja Generatora i embeddingów
35. testy kontraktowe oraz smoke testy telemetrii
36. fundament limitów i atomowa rezerwacja cache MISS
37. finalizacja sukcesu i błędu Generatora powiązana z licznikiem okresu
38. backend Stripe: status, Checkout, portal i webhook
39. końcowy plan 29 zł / 20 kompletów oraz przypisanie Stripe price_id
40. konfiguracja sekretów, webhooka i kontrolowany test Stripe Sandbox
41. strona /subskrypcja oraz komunikaty limitu i dostępu w UI Generatora
42. pełna regresja i zamknięcie pakietu limitów i subskrypcji
43. Plan Free 1 + 1 na jednym temacie — poza wcześniejszą roadmapą
44. publiczny /cennik oparty na subscription_plans — poza wcześniejszą roadmapą
45. Stripe flexible billing: cancel_at + scheduledCancellationAt + test E2E
```

Następnie:

```text
46. audyt hostingu, wybór własnego SMTP i testy procesów konta
47. kontrolowany start sprzedaży i pierwsi płacący klienci
48. Monitoring kosztów — Pakiet 2 po osobnym audycie kontraktu
```

## 23. DECYZJE OBOWIĄZUJĄCE

Aktualizacja 12.08.2026:

```text
Plan Free = jednorazowe 1 × karta pracy + 1 × kartkówka na jednym temacie
→ przyznawany wyłącznie potwierdzonemu kontu bez historii Stripe
→ cache HIT nie zużywa kolejnej jednostki
→ płatna aktywacja kończy go bezpowrotnie

/cennik
→ dane z subscription_plans przez GET /api/billing/plans
→ brak drugiej ręcznie utrzymywanej kopii cen w UI

Stripe flexible billing
→ przechowujemy surowe cancel_at
→ UI korzysta z scheduledCancellationAt
→ nie odtwarzamy cancel_at z canceled_at ani current_period_end
→ idempotencji webhooków nie omijamy dla backfillu
```

1. `lesson_topic_id` jest głównym kluczem operacyjnym karty pracy i kartkówki; `lesson_section_id` wyznacza zakres Sprawdzianu.
2. Jeden krótki DOCX opisuje jeden temat.
3. Pełny dokument jest kontekstem Generatora dla tego przypadku.
4. Liczba zadań wynosi 5, 6 albo 7.
5. Typy zadań wynikają z `templates.js`.
6. Struktura wynika z JSON Schema i parsera.
7. Model nie wybiera ani nie ocenia typów.
8. Coverage nie należy do runtime i zostało usunięte z kodu oraz bazy.
9. Cache przechowuje gotowy wynik po parserze.
10. `generated_materials` zasila cache i Historię.
11. Claim cache jest atomowy i wykonywany w PostgreSQL.
12. JavaScript pozostaje cienkim adapterem do RPC i aktualizacji statusów.
13. Cache HIT nie uruchamia modelu i zwraca usage `0 / 0 / 0` dla bieżącego requestu.
14. Semantic retrieval pozostaje opcją dla większej skali źródeł.
15. W katalogu pozostają wyłącznie kanoniczne indeksy kolejności sekcji i tematów.
16. Import CSV używa wyłącznie funkcji z `p_grade_level_id`.
17. Aktualne RPC importu CSV jest dostępne dla `authenticated`, nie dla `PUBLIC` ani `anon`.
18. Rzeczywiste nazwy kolumn, funkcji i uprawnień należy weryfikować na aktualnym schemacie Supabase.
19. Migracji destrukcyjnych nie wykonujemy z `CASCADE`, jeśli nie ma osobnej, jawnie uzasadnionej decyzji.
20. Historia jest wdrożona i opiera się bezpośrednio na `generated_materials`.
21. Lista Historii pobiera metadane bez `content_json`; treść jest pobierana dopiero po kliknięciu „Otwórz”.
22. Otwarcie Historii jest tylko do odczytu i nie zmienia `access_count` ani `last_accessed_at`.
23. Historia pokazuje `created_at` jako datę „Wygenerowano”, a sortuje według `last_accessed_at DESC`.
24. Historia ponownie używa `GeneratedMaterial` i istniejącego wydruku / PDF.
25. Jeden wspólny klucz nauczyciela jest budowany z istniejącego `content_json` bez dodatkowego wywołania modelu.
26. Punkty wynikają z `taskSubtype` i `lib/generation/scoring.js`, a nie z decyzji modelu.
27. Skala ocen jest osobnym ustawieniem w `teacher_grade_scales`, nie polem `teacher_profiles`.
28. Jedna osoba ma jeden aktywny rekord skali identyfikowany przez `owner_id`.
29. Skala nie jest zapisywana w `generated_materials` i nie wpływa na `generation_fingerprint` ani cache.
30. Aktualna skala konta jest używana również przy wcześniejszych materiałach z Historii.
31. Import skali ocen z CSV nie jest częścią aktualnego produktu.
32. Karta pracy dla wszystkich profili jest aktywna i korzysta z `material_schema_v6`.
33. `intro`, `tip`, `glossary` i `tasks` karty pracy powstają w jednym wywołaniu modelu.
34. `open_explain` nie zawiera `context` pokazywanego uczniowi ani wymaganego osobnego `answerExplanation`.
35. Historia obsługuje wersje kontraktów per `material_type`, nie jeden globalny string.
36. Zmiana CSS lub renderera zmienia ponownie wygenerowany PDF z Historii bez zmiany `content_json` i bez wywołania modelu.
37. Końcowa regresja karty pracy i macierz punktacji 3 × 3 są zakończone.
38. Eksport DOCX jest budowany na żądanie z istniejącego `content_json`, profili i aktualnej skali ocen.
39. Eksport DOCX działa w Generatorze i Historii przez `GeneratedMaterial`; nie wywołuje modelu ani Route Handlera Generatora.
40. DOCX nie jest przechowywany w Storage ani w osobnej tabeli i nie zmienia `access_count`, `last_accessed_at`, `content_json` ani `generation_fingerprint`.
41. Eksporter używa istniejących źródeł prawdy: `getTaskProfilePresentation`, `getTaskPoints`, `buildTeacherAnswerKey` i `buildTeacherGradeScaleRanges`.
42. Pakiet eksportu DOCX jest zakończony.
43. Aktualne wersje kontraktów to: karta pracy `material_schema_v6`, kartkówka `material_schema_v5`, Sprawdzian `material_schema_v6`.
44. `error_find` przechowuje pełny `codeWithError`, pełny `expectedCode` i `answerExplanation`; wariant mechanicznej zamiany fragmentów został wycofany.
45. `open_code` przechowuje `requirements` i `expectedCode`; stałe polecenie dodaje parser, a `answerExplanation` nie jest wymagane.
46. Źródła nauczyciela wyznaczają zakres pytań i wymagań; wiedza przedmiotowa modelu służy wyłącznie do poprawnego rozwiązania, sprawdzenia i wyjaśnienia odpowiedzi.
47. Sprawdzian obejmuje cały dział i korzysta ze wszystkich aktywnych tematów posiadających gotowy DOCX.
48. Jeden temat może mieć maksymalnie jeden dokument źródłowy; wiele dokumentów Sprawdzianu oznacza po jednym dokumencie dla wielu tematów.
49. Zbiorczy manifest Sprawdzianu ma wersję `lesson_section_sources_v1` i uwzględnia również brakujące tematy z wartościami `null`.
50. Częściowy zakres Sprawdzianu wymaga jawnego potwierdzenia nauczyciela; brak wszystkich źródeł zatrzymuje Generator przed wywołaniem modelu.
51. Każde zadanie Sprawdzianu ma `sourceTopicIds`, a parser wymaga pokrycia wszystkich dostępnych tematów.
52. Sprawdzian zapisuje `lesson_topic_id = NULL` i `source_document_id = NULL`; nie dodano kolumny `lesson_section_id` do `generated_materials`.
53. `service_role` ma wyłącznie wymagany odczyt `public.lesson_sections`; granty `anon`, `authenticated` i polityki RLS nie zostały rozszerzone.
54. Pakiet Sprawdzianu jest zakończony.
55. Stare MVP pozostaje wzorcem referencyjnym; `LearningUnits` nie jest źródłem danych ani mechanizmem runtime `smartteacher-next`.
56. `ai_usage_events` jest jedynym serwerowym rejestrem rzeczywistych logicznych wywołań OpenAI.
57. Rejestr obsługuje operacje `material_generation` i `document_embedding` oraz statusy `succeeded` i `failed`.
58. Cache MISS Generatora tworzy jedno zdarzenie, a cache HIT nie tworzy zdarzenia i nadal aktualizuje wyłącznie `generated_materials.access_count` oraz `last_accessed_at`.
59. Generowanie brakujących embeddingów tworzy jedno zdarzenie na jedno żądanie OpenAI; pełne ponowne użycie wektorów nie tworzy zdarzenia.
60. `cached_input_tokens` oznacza cache promptu OpenAI, nie cache materiałów SmartTeacher.
61. `usage_known = false` oznacza niekompletne usage dostawcy; brakujących tokenów nie zastępujemy zerami.
62. Błąd po podjęciu próby wywołania OpenAI tworzy zdarzenie `failed` i zachowuje dostępne usage; walidacja zakończona przed wywołaniem nie tworzy zdarzenia.
63. Telemetria jest best effort: błąd jej zapisu jest logowany, ale nie może zmienić wyniku operacji biznesowej.
64. `ai_usage_events` ma RLS bez polityk frontendowych; `service_role` ma tylko `SELECT` i `INSERT`, a `PUBLIC`, `anon` i `authenticated` nie mają grantów.
65. Usunięcie materiału albo dokumentu ustawia odpowiednią relację telemetrii na `NULL`, bez usuwania zdarzenia.
66. Pakiet 1 monitoringu kosztów nie oblicza kosztu pieniężnego, nie zawiera cenników i nie wykonuje backfillu wcześniejszych wywołań.
67. Dokładny kontrakt kolejnego pakietu kosztowego wymaga osobnego audytu i zatwierdzenia przed implementacją.
68. Plan startowy SmartTeacher kosztuje 29,00 PLN brutto miesięcznie i obejmuje 20 nowych kompletów materiałów w okresie rozliczeniowym.
69. Jedna jednostka limitu to jeden poprawnie zakończony cache MISS, niezależnie od liczby profili; cache HIT nie zużywa limitu.
70. Jednostka jest najpierw rezerwowana, po sukcesie zużywana, a po błędzie zwalniana atomowo w PostgreSQL.
71. `subscription_usage_periods.generation_limit` jest snapshotem okresu; zakończonych okresów nie aktualizujemy po zmianie planu.
72. `ai_usage_events` pozostaje rejestrem wywołań OpenAI i nie zastępuje licznika limitu produktu.
73. Konto właścicielskie używa `internal_entitlement`, nie fikcyjnej subskrypcji Stripe, i ma ten sam miesięczny limit planu.
74. Tabele billingowe są serwerowe: RLS jest włączone, frontend nie ma bezpośrednich grantów, a operacje krytyczne wykonuje `service_role`.
75. `billing_customers` jest kanonicznym mapowaniem `auth.users.id` do jednego Stripe Customer.
76. Webhook weryfikuje podpis na surowym body, pobiera aktualną subskrypcję ze Stripe i synchronizuje ją idempotentnie przez `provider_event_id`.
77. Backend sprawdza cenę Stripe względem planu w Supabase przed utworzeniem Checkout; sama migracja SQL nie weryfikuje zdalnego obiektu Stripe.
78. Pełny test Stripe Sandbox, portal klienta, audyt RLS i cleanup danych testowych są zakończone.
79. Pakiet limitów i subskrypcji jest zakończony: obejmuje fundament limitu, backend Stripe, pełny test Sandbox, cleanup danych testowych, stronę `/subskrypcja`, komunikaty Generatora i końcową regresję.
80. RPC używa wewnętrznego stanu `limit_exhausted`, natomiast kontrakt frontendowy `/api/generate` używa kodu `generation_limit_exhausted`; `subscription_required` pozostaje wspólną nazwą obu warstw.
