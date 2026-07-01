/* ====================================================
document_chunks
→ ragContext dla modelu
=======================================================*/

/*
  SOURCE-ONLY RAG CONTEXT v1

  Odpowiedzialność pliku:
  document_chunks → tekstowy ragContext dla modelu.

  Ten plik NIE:
  - używa modelu,
  - parafrazuje treści,
  - dopisuje przykładów,
  - korzysta z LearningUnits,
  - tworzy embeddingów,
  - zapisuje danych do Supabase.
*/

function normalizeText(value) {
  return String(value || "")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+/g, " ")
    .trim();
}

function assertValidChunks(chunks) {
  if (!Array.isArray(chunks)) {
    throw new Error(
      "buildPrivateRagContext wymaga tablicy document_chunks."
    );
  }

  if (chunks.length === 0) {
    throw new Error(
      "Nie można zbudować ragContext z pustej tablicy chunków."
    );
  }
}

export function buildPrivateRagContext({
  chunks,
  sourceFilename = null,
  maxChunks = 6
}) {
  assertValidChunks(chunks);

  const selectedChunks = chunks
    .filter((chunk) => chunk && normalizeText(chunk.content))
    .slice(0, maxChunks);

  if (selectedChunks.length === 0) {
    throw new Error(
      "Brak chunków z niepustą treścią do zbudowania ragContext."
    );
  }

  return selectedChunks
    .map((chunk) => {
      const sourceLine = sourceFilename
        ? `ŹRÓDŁO: ${sourceFilename}`
        : "ŹRÓDŁO: dokument nauczyciela";

      const blockRange =
        chunk.start_block_index && chunk.end_block_index
          ? `BLOKI: ${chunk.start_block_index}-${chunk.end_block_index}`
          : "BLOKI: brak danych";

      return [
        "==================================================",
        sourceLine,
        `CHUNK: ${chunk.chunk_index}`,
        blockRange,
        "",
        normalizeText(chunk.content)
      ].join("\n");
    })
    .join("\n\n");
}
