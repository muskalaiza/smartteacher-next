const DEFAULT_TEACHER_DOCUMENTS_BUCKET = "teacher-documents";

const CSV_MIME_TYPES = new Set(["text/csv", "application/csv", "text/plain"]);

function isCsvDocument(document) {
  const fileName = document?.original_file_name?.toLowerCase() || "";
  const mimeType = document?.mime_type || "";

  return fileName.endsWith(".csv") || CSV_MIME_TYPES.has(mimeType);
}

const POLISH_HEADER_CHAR_MAP = {
  ą: "a",
  ć: "c",
  ę: "e",
  ł: "l",
  ń: "n",
  ó: "o",
  ś: "s",
  ź: "z",
  ż: "z",
};

function normalizeHeader(value) {
  return String(value || "")
    .replace(/^\uFEFF/, "")
    .trim()
    .toLowerCase()
    .replace(/[ąćęłńóśźż]/g, (char) => POLISH_HEADER_CHAR_MAP[char] || char)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\s-]+/g, "_")
    .replace(/^_+|_+$/g, "");
}


function detectDelimiter(text) {
  const firstLine = text.split(/\r?\n/).find((line) => line.trim().length > 0);

  if (!firstLine) {
    return ",";
  }

  const commaCount = countDelimiterOutsideQuotes(firstLine, ",");
  const semicolonCount = countDelimiterOutsideQuotes(firstLine, ";");

  return semicolonCount > commaCount ? ";" : ",";
}

function countDelimiterOutsideQuotes(line, delimiter) {
  let count = 0;
  let insideQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const nextChar = line[index + 1];

    if (char === '"' && nextChar === '"') {
      index += 1;
      continue;
    }

    if (char === '"') {
      insideQuotes = !insideQuotes;
      continue;
    }

    if (!insideQuotes && char === delimiter) {
      count += 1;
    }
  }

  return count;
}

function parseDelimitedRows(text, delimiter) {
  const rows = [];
  let currentRow = [];
  let currentValue = "";
  let insideQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const nextChar = text[index + 1];

    if (char === '"' && nextChar === '"') {
      currentValue += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      insideQuotes = !insideQuotes;
      continue;
    }

    if (!insideQuotes && char === delimiter) {
      currentRow.push(currentValue.trim());
      currentValue = "";
      continue;
    }

    if (!insideQuotes && (char === "\n" || char === "\r")) {
      currentRow.push(currentValue.trim());
      rows.push(currentRow);

      currentRow = [];
      currentValue = "";

      if (char === "\r" && nextChar === "\n") {
        index += 1;
      }

      continue;
    }

    currentValue += char;
  }

  currentRow.push(currentValue.trim());
  rows.push(currentRow);

  return rows.filter((row) =>
    row.some((value) => String(value || "").trim().length > 0)
  );
}

function findHeaderIndex(headers, acceptedNames) {
  return headers.findIndex((header) => acceptedNames.includes(header));
}

export function parseLessonPlanCsv(csvText) {
  const normalizedText = String(csvText || "").replace(/^\uFEFF/, "").trim();

  if (!normalizedText) {
    throw new Error("Plik CSV jest pusty.");
  }

  const delimiter = detectDelimiter(normalizedText);
  const rows = parseDelimitedRows(normalizedText, delimiter);

  if (rows.length < 2) {
    throw new Error(
      "Plik CSV musi zawierać nagłówek oraz co najmniej jeden wiersz danych."
    );
  }

  const headers = rows[0].map(normalizeHeader);

  const sectionTitleIndex = findHeaderIndex(headers, [
    "section_title",
    "section",
    "dzial",
  ]);

  const topicTitleIndex = findHeaderIndex(headers, [
    "topic_title",
    "topic",
    "temat",
    "temat_lekcji",
  ]);

  if (sectionTitleIndex === -1 || topicTitleIndex === -1) {
    throw new Error(
      'CSV musi zawierać kolumny "section_title" i "topic_title". Dopuszczalne są też nagłówki: "dzial" oraz "temat".'
    );
  }

  const items = [];

  for (let rowIndex = 1; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex];

    const sectionTitle = String(row[sectionTitleIndex] || "").trim();
    const topicTitle = String(row[topicTitleIndex] || "").trim();

    if (!sectionTitle && !topicTitle) {
      continue;
    }

    if (!sectionTitle) {
      throw new Error(`Wiersz ${rowIndex + 1}: brakuje działu lekcji.`);
    }

    if (!topicTitle) {
      throw new Error(`Wiersz ${rowIndex + 1}: brakuje tematu lekcji.`);
    }

    items.push({
      sourceRowNumber: rowIndex + 1,
      sectionTitle,
      topicTitle,
      orderIndex: items.length + 1,
    });
  }

  if (items.length === 0) {
    throw new Error("CSV nie zawiera żadnych poprawnych tematów lekcji.");
  }

  return {
    delimiter,
    rowCount: items.length,
    items,
  };
}

function hasReplacementCharacter(text) {
  return text.includes("\uFFFD");
}

function decodeCsvArrayBuffer(arrayBuffer) {
  const bytes = new Uint8Array(arrayBuffer);

  const decoders = [
    { label: "utf-8", name: "UTF-8" },
    { label: "windows-1250", name: "Windows-1250" },
    { label: "iso-8859-2", name: "ISO-8859-2" },
  ];

  for (const decoderConfig of decoders) {
    try {
      const decoder = new TextDecoder(decoderConfig.label, {
        fatal: true,
      });

      const text = decoder.decode(bytes);

      if (!hasReplacementCharacter(text)) {
        return {
          text,
          encoding: decoderConfig.name,
        };
      }
    } catch {
      // Próbujemy kolejnego kodowania.
    }
  }

  throw new Error(
    "Nie udało się odczytać kodowania pliku CSV. Zapisz plik jako CSV UTF-8 i spróbuj ponownie."
  );
}

async function downloadCsvTextFromStorage({ supabase, document }) {
  const storageBucket =
    document.storage_bucket || DEFAULT_TEACHER_DOCUMENTS_BUCKET;

  const { data, error } = await supabase.storage
    .from(storageBucket)
    .download(document.storage_path);

  if (error || !data) {
    throw new Error(
      `Nie udało się odczytać pliku CSV ze Storage: ${
        error?.message || "brak danych pliku"
      }`
    );
  }

  const arrayBuffer = await data.arrayBuffer();
  const decodedCsv = decodeCsvArrayBuffer(arrayBuffer);

  return decodedCsv.text;
}

async function createLessonPlanImport({
  supabase,
  userId,
  subjectId,
  document,
  sourceSystem,
}) {
  const { data, error } = await supabase
    .from("lesson_plan_imports")
    .insert({
      owner_id: userId,
      subject_id: subjectId,
      teacher_document_id: document.id,
      source_system: sourceSystem,
      original_file_name: document.original_file_name,
      status: "uploaded",
      row_count: 0,
      error_message: null,
    })
    .select("id, owner_id, subject_id, status, row_count, created_at")
    .single();

  if (error || !data) {
    throw new Error(
      `Nie udało się utworzyć rekordu importu CSV: ${
        error?.message || "brak danych importu"
      }`
    );
  }

  return data;
}

async function markImportAsError({ supabase, importId, errorMessage }) {
  if (!importId) return;

  await supabase
    .from("lesson_plan_imports")
    .update({
      status: "error",
      error_message: errorMessage,
      updated_at: new Date().toISOString(),
    })
    .eq("id", importId);
}

async function markImportAsParsed({ supabase, importId, rowCount }) {
  const { error } = await supabase
    .from("lesson_plan_imports")
    .update({
      status: "parsed",
      row_count: rowCount,
      error_message: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", importId);

  if (error) {
    throw new Error(
      `Wiersze CSV zapisano, ale nie udało się zaktualizować statusu importu: ${error.message}`
    );
  }
}

async function createPrivateLessonCatalogFromImport({
  supabase,
  importId,
  userId,
  gradeLevelId,
}) {
  const { data, error } = await supabase.rpc(
    "create_private_lesson_catalog_from_import",
    {
      p_import_id: importId,
      p_owner_id: userId,
      p_grade_level_id: gradeLevelId,
    }
  );

  if (error) {
    throw new Error(
      `CSV zapisano do lesson_plan_items, ale nie udało się utworzyć katalogu lekcji: ${error.message}`
    );
  }

  const resultRow = Array.isArray(data) ? data[0] : data;

  if (!resultRow) {
    throw new Error(
      "Funkcja tworząca katalog lekcji nie zwróciła danych kontrolnych."
    );
  }

  return {
    catalogId: resultRow.catalog_id,
    sectionCount: resultRow.section_count,
    topicCount: resultRow.topic_count,
  };
}


export async function importLessonPlanCsvFromDocument({
  supabase,
  document,
  userId,
  subjectId,
  gradeLevelId,
  sourceSystem = "manual_csv",
}) {
  if (!supabase) {
    throw new Error("Brakuje klienta Supabase.");
  }

  if (!userId) {
    throw new Error("Musisz być zalogowana, aby importować CSV.");
  }

  if (!subjectId) {
    throw new Error("Nie udało się ustalić aktywnego przedmiotu.");
  }

    if (!gradeLevelId) {
    throw new Error("Wybierz klasę dla importowanego planu lekcji CSV.");
  }

  if (!document?.id || !document?.storage_path) {
    throw new Error("Brakuje danych pliku CSV do importu.");
  }

  if (document.subject_id !== subjectId) {
    throw new Error("Ten plik nie należy do aktualnie wybranego przedmiotu.");
  }

  if (!isCsvDocument(document)) {
    throw new Error("Import planu lekcji jest dostępny tylko dla plików CSV.");
  }

  const csvText = await downloadCsvTextFromStorage({
    supabase,
    document,
  });

  // Najpierw walidacja i parsowanie.
  // Jeśli CSV jest błędny, nie tworzymy rekordu lesson_plan_imports.
  const parsedCsv = parseLessonPlanCsv(csvText);

  const importRecord = await createLessonPlanImport({
    supabase,
    userId,
    subjectId,
    document,
    sourceSystem,
  });

  try {
    const rowsToInsert = parsedCsv.items.map((item) => ({
      import_id: importRecord.id,
      owner_id: userId,
      subject_id: subjectId,
      source_row_number: item.sourceRowNumber,
      section_title: item.sectionTitle,
      topic_title: item.topicTitle,
      mapped_lesson_topic_id: null,
      lesson_key: null,
      order_index: item.orderIndex,
      mapping_status: "unmapped",
    }));

    const { error: insertItemsError } = await supabase
      .from("lesson_plan_items")
      .insert(rowsToInsert);

    if (insertItemsError) {
      throw new Error(
        `Nie udało się zapisać wierszy CSV: ${insertItemsError.message}`
      );
    }

    await markImportAsParsed({
      supabase,
      importId: importRecord.id,
      rowCount: parsedCsv.rowCount,
    });



       const catalogResult = await createPrivateLessonCatalogFromImport({
      supabase,
      importId: importRecord.id,
      userId,
      gradeLevelId,
    });

    return {
      importId: importRecord.id,
      rowCount: parsedCsv.rowCount,
      delimiter: parsedCsv.delimiter,
      status: "mapped",
      catalogId: catalogResult.catalogId,
      sectionCount: catalogResult.sectionCount,
      topicCount: catalogResult.topicCount,
    };
    
  } catch (error) {
    await markImportAsError({
      supabase,
      importId: importRecord.id,
      errorMessage: error.message,
    });

    throw error;
  }
}
