# SmartTeacher — database_architecture_v1.md

**Wersja dokumentu:** 2.0  
**Data aktualizacji:** 26.07.2026  
**Projekt:** `smartteacher-next`  
**Supabase:** `smartteacher-next-dev`  
**Status:** aktualna architektura robocza, częściowo wdrożona  
**Uwaga:** nazwa pliku pozostaje bez zmiany ze względu na ciągłość źródeł projektu.

---

## 0. CEL DOKUMENTU

Dokument opisuje aktualny model danych SmartTeacher oraz decyzje obowiązujące przy dalszym rozwoju Generatora, cache i Historii.

Nie jest jedną migracją SQL.
Rzeczywiste migracje znajdują się w:

```text
supabase/sql
```

Źródłem prawdy dla bieżącego stanu jest:

- aktualny schemat Supabase,
- migracje zapisane w repo,
- działający kod `smartteacher-next`,
- zakończone testy opisane w `smartteacher_etapy.md`.

---

## 1. ZASADY ARCHITEKTONICZNE

### 1.1. Prywatność

Każda prywatna tabela nauczyciela musi mieć:

```text
owner_id = auth.uid()
```

oraz RLS.

Frontend może odczytywać własne dane zgodnie z polityką.
Operacje wymagające klucza `service_role` odbywają się wyłącznie po stronie serwera.

### 1.2. Jedna odpowiedzialność

Nie tworzymy tabel „na zapas”.
Nowa tabela jest uzasadniona tylko wtedy, gdy przechowuje odrębny byt biznesowy albo usuwa realną redundancję.

### 1.3. Struktura przed promptem

```text
relacje
→ constraints
→ JSON Schema
→ parser
→ renderery
→ prompt
```

Model nie może zastępować walidacji, relacji ani reguł strukturalnych.

### 1.4. CSV i DOCX mają różne role

```text
CSV
→ katalog działów i tematów

DOCX
→ treść merytoryczna jednego tematu
```

CSV jest źródłem importu.
Źródłem prawdy dla Generatora jest katalog relacyjny i przypisany dokument.

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
→ generated_materials
```

---

## 3. KATALOG LEKCJI

### `subjects`

Globalny słownik przedmiotów.

### `grade_levels`

Globalny słownik poziomów klas.

Nie zapisujemy klas organizacyjnych typu `1a`, `1b`, `1c`.

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

Nie są warunkiem docelowego generowania dla jednego krótkiego DOCX przypisanego do tematu.

Mogą zostać wykorzystane później dla:

- wielu dokumentów,
- długich źródeł,
- globalnej bazy SmartTeacher,
- retrieval potwierdzonego pomiarem jakości.

Nie usuwać ich w refactorze Generatora.

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

### 5.3. Zachowanie

```text
ta sama treść i struktura
→ ten sam source_fingerprint

zmiana treści
→ inny content_hash
→ inny source_fingerprint

zmiana kolejności albo heading_path
→ inny source_fingerprint
```

Fingerprint jest obliczany po chunkingu i zapisywany raz w `teacher_documents`.

---

## 6. GENERATOR — DOCELOWY PRZEPŁYW

Dla jednego krótkiego dokumentu przypisanego do tematu:

```text
lesson_topic_id
→ teacher_documents
→ wszystkie document_chunks w kolejności
→ pełny source-only context
→ templates.js
→ taskPlan dla 5 / 6 / 7 zadań
→ generation_fingerprint
→ generated_materials
```

Nie używamy w głównym runtime:

- semantic retrieval,
- top 3,
- progu similarity,
- task type coverage,
- `isSupported`,
- cache coverage.

Warstwy te pozostają historycznym eksperymentem i mogą być wykorzystane później tylko po osobnej decyzji.

---

## 7. `generated_materials`

Tabela jest wdrożona i ma pełnić dwie funkcje:

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

### 7.6. RLS

Nauczyciel może odczytać wyłącznie własne rekordy:

```text
owner_id = auth.uid()
```

Zapis i aktualizacja odbywają się przez serwerowy Route Handler.

---

## 8. GENERATION FINGERPRINT

Fingerprint generowania musi obejmować wszystkie dane wpływające na wynik:

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

Zmiana któregokolwiek elementu powoduje cache MISS.

### Cache HIT

```text
status = ready
→ odczyt content_json
→ 0 wywołań modelu
→ renderery
```

### Cache MISS

```text
status = generating
→ jedno wywołanie modelu
→ Structured Outputs
→ parser
→ content_json
→ status = ready
```

Unikalność chroni przed równoczesnym podwójnym generowaniem identycznego materiału.

---

## 9. HISTORIA GENEROWAŃ

W aktualnej wersji nie tworzymy osobnej tabeli `generation_requests`.

Historia czyta rekordy `generated_materials` ze statusem `ready`.

UI może otrzymać:

```text
material_type
subject_name_snapshot
topic_title_snapshot
task_count
profiles
last_accessed_at
status
content_json
```

Ponowne użycie tego samego cache nie tworzy duplikatu materiału.
Aktualizuje `access_count` i `last_accessed_at`.

Osobną tabelę zdarzeń można dodać później, gdy pojawi się realna potrzeba audytu każdego kliknięcia, retry albo rozliczeń per request.

---

## 10. ELEMENTY WYCOFYWANE

### `private_rag_task_type_coverage_cache`

Tabela nadal istnieje fizycznie, ale zostanie usunięta po:

1. odłączeniu coverage z runtime,
2. pełnym teście uproszczonego Generatora,
3. commicie stabilnego checkpointu.

Nie usuwać jej wcześniej.

### Moduły coverage

Kod coverage zostanie usunięty albo zarchiwizowany podczas osobnego cleanupu po ustabilizowaniu route.

---

## 11. CLEANUP BAZY

Cleanup nie jest częścią refactoru Generatora.

Planowany zakres:

- usunięcie coverage cache,
- usunięcie potwierdzonych identycznych indeksów,
- konsolidacja potwierdzonych zdublowanych polityk RLS,
- audyt nakładających się polityk katalogu lekcji.

Każdą operację należy oprzeć na aktualnym snapshotcie schematu.

Nie usuwać bez osobnej decyzji:

- bloków,
- chunków,
- embeddingów,
- funkcji semantic search,
- danych katalogu CSV,
- `generated_materials`.

---

## 12. STORAGE

### `teacher-documents`

Prywatny bucket na źródłowe CSV i DOCX.

Ścieżki muszą uwzględniać właściciela.

### Eksporty

PDF i DOCX wygenerowanych materiałów nie są jeszcze przechowywane w osobnej tabeli ani bucketcie.

Pierwsza wersja może generować eksport na żądanie z `content_json`.
Trwały cache eksportów zostanie zaprojektowany dopiero, gdy funkcja eksportu będzie podłączana.

---

## 13. ŚWIADOMIE ODŁOŻONE ELEMENTY

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

## 14. KOLEJNOŚĆ WDROŻENIA

```text
1. pełny odczyt dokumentu
2. taskPlan z templates.js dla 5 / 6 / 7
3. generation_fingerprint
4. cache generated_materials
5. refactor route Generatora
6. testy i commit
7. cleanup bazy
8. test regresji i commit
9. podłączenie Historii
10. eksporty
```

---

## 15. DECYZJE OBOWIĄZUJĄCE

1. `lesson_topic_id` jest głównym kluczem operacyjnym tematu.
2. Jeden krótki DOCX opisuje jeden temat.
3. Pełny dokument jest kontekstem Generatora dla tego przypadku.
4. Liczba zadań wynosi 5, 6 albo 7.
5. Typy zadań wynikają z `templates.js`.
6. Struktura wynika z JSON Schema i parsera.
7. Model nie wybiera ani nie ocenia typów.
8. Coverage nie należy do docelowego runtime.
9. Cache przechowuje gotowy wynik po parserze.
10. `generated_materials` zasila cache i Historię.
11. Semantic retrieval pozostaje opcją dla większej skali źródeł.
12. Cleanup bazy następuje po stabilnym Generatorze.
