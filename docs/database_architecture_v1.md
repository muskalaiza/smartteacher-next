# SmartTeacher — database_architecture_v1.md

**Wersja dokumentu:** 2.3  
**Data aktualizacji:** 02.08.2026  
**Projekt:** `smartteacher-next`  
**Supabase:** `smartteacher-next-dev`  
**Status:** aktualna architektura robocza; Generator, atomowy cache, cleanup i Historia Generowań są wdrożone  
**Uwaga:** nazwa pliku pozostaje bez zmiany ze względu na ciągłość źródeł projektu.

---

## 0. CEL DOKUMENTU

Dokument opisuje aktualny model danych SmartTeacher oraz decyzje obowiązujące przy dalszym rozwoju Generatora, cache, Historii i wspólnego klucza nauczyciela.

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
- `create_private_lesson_catalog_from_import(uuid, uuid, uuid, text, text, text)` może wykonywać `authenticated`,
- aktualna funkcja importu CSV nie jest wykonywalna przez `PUBLIC` ani `anon`,
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

lesson_topics + teacher_documents + parametry Generatora
→ generation_fingerprint
→ claim_generated_material
→ generated_materials

generated_materials
→ lista Historii
→ pojedynczy content_json
→ GeneratedMaterial
→ wydruk / PDF
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

## 6. GENERATOR — WDROŻONY PRZEPŁYW

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

Route Handler obecnie obsługuje pionowy przepływ `kartkówka`.

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
lessonTopicId
topicTitle
materialType
taskCount
profiles
taskPlan
generatorVersion
contentSchemaVersion
model
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
content_schema_version = material_schema_v1
obsługiwany material_type
niepusta lista profiles
content_json jako obiekt
tasks jako niepusta tablica
tasks.length = task_count
```

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

### 12.5. UI i eksport PDF

Materiał otwiera się na tej samej stronie Historii.

Dostępne są:

```text
„Wróć do historii”
„Drukuj / Zapisz PDF”
```

Historia pokazuje:

```text
created_at
→ „Wygenerowano”
```

PDF jest generowany ponownie przez przeglądarkę z zapisanego `content_json`.

PDF nie jest przechowywany jako plik w Storage. Treść materiału pozostaje ta sama, ale przyszłe zmiany CSS albo rendererów mogą zmienić wygląd ponownie wygenerowanego PDF.

### 12.6. Live schemat i dane

Weryfikacja live Supabase z 02.08.2026 potwierdziła:

```text
6 rekordów ready
material_type = kartkówka
content_schema_version = material_schema_v1
6 rekordów z content_json
0 rekordów ready bez content_json
```

Indeks Historii:

```text
generated_materials_owner_subject_history_idx
→ owner_id
→ subject_id
→ last_accessed_at DESC
→ WHERE status = ready
```

Filtry `karta pracy` i `sprawdzian` poprawnie pokazują stan pusty do czasu uruchomienia tych przepływów.

Osobną tabelę zdarzeń można dodać później wyłącznie po pojawieniu się realnej potrzeby audytu każdego kliknięcia, retry albo rozliczeń per request.

---

## 13. ELEMENTY WYCOFANE I ZACHOWANE

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

## 14. CLEANUP BAZY — ZAKOŃCZONY

Cleanup po stabilizacji Generatora wykonano w trzech oddzielnych migracjach.

### 14.1. Usunięcie coverage cache

Migracja:

```text
supabase/sql/2026-07-30_drop_private_rag_task_type_coverage_cache.sql
```

Usunięto:

```text
public.private_rag_task_type_coverage_cache
```

Operacja została wykonana bez `CASCADE`. Kontrola końcowa potwierdziła `coverage_table_exists = false`.

### 14.2. Usunięcie zduplikowanych indeksów katalogu

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

### 14.3. Cleanup przeciążenia RPC importu CSV

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

### 14.4. Elementy świadomie pozostawione

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

## 15. STORAGE

### `teacher-documents`

Prywatny bucket na źródłowe CSV i DOCX. Ścieżki muszą uwzględniać właściciela.

### Eksporty

PDF i DOCX wygenerowanych materiałów nie są przechowywane w osobnej tabeli ani bucketcie.

Pierwsza wersja generuje PDF na żądanie z `content_json`. Trwały cache eksportów zostanie zaprojektowany dopiero, gdy pojawi się realna potrzeba biznesowa.

---

## 16. ŚWIADOMIE ODŁOŻONE ELEMENTY

Nie wdrażać w najbliższym pakiecie:

- `generation_requests`,
- `generation_request_sources`,
- `generated_material_outputs`,
- `generation_usage_logs`,
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

## 17. KOLEJNOŚĆ DALSZEGO WDROŻENIA

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
```

Następnie:

```text
14. wspólny klucz nauczyciela
15. karta pracy i domknięcie profili
16. eksport DOCX
17. sprawdzian
18. WSO, limity i sprzedaż
```

## 18. DECYZJE OBOWIĄZUJĄCE

1. `lesson_topic_id` jest głównym kluczem operacyjnym tematu.
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
25. Następnym pakietem jest jeden wspólny klucz nauczyciela bez dodatkowego wywołania modelu.
