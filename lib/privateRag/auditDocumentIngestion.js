/*
  SOURCE-ONLY INGESTION AUDIT v1

  Odpowiedzialność pliku:
  sprawdzić, czy wynik:
  DOCX → blocks → chunks
  nadaje się do dalszego etapu embeddingów.

  Ten plik NIE:
  - używa modelu,
  - poprawia treści,
  - parafrazuje,
  - dopisuje przykładów,
  - tworzy embeddingów,
  - zapisuje danych do Supabase.
*/

function normalizeText(value) {
  return String(value || "")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+/g, " ")
    .trim();
}

function joinBlocksByIndices(blocks, blockIndices) {
  const blockMap = new Map(
    blocks.map((block) => [block.block_index, block])
  );

  return blockIndices
    .map((blockIndex) => blockMap.get(blockIndex))
    .filter(Boolean)
    .map((block) => normalizeText(block.content))
    .filter(Boolean)
    .join("\n\n");
}

function isBoundaryOnlyChunk(chunk) {
  const content = normalizeText(chunk?.content);

  if (!content) {
    return false;
  }

  const lines = content
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  return (
    lines.length === 1 &&
    lines[0].endsWith(":") &&
    lines[0].length <= 90
  );
}

function createIssue(level, code, message) {
  return {
    level,
    code,
    message
  };
}

export function auditDocumentIngestion({
  blocks,
  chunks,
  warnings = [],
  minContentChars = 300
}) {
  const issues = [];

  if (!Array.isArray(blocks) || blocks.length === 0) {
    issues.push(
      createIssue(
        "error",
        "NO_BLOCKS",
        "Brak bloków źródłowych po ekstrakcji dokumentu."
      )
    );
  }

  if (!Array.isArray(chunks) || chunks.length === 0) {
    issues.push(
      createIssue(
        "error",
        "NO_CHUNKS",
        "Brak chunków po podziale dokumentu."
      )
    );
  }

  const safeBlocks = Array.isArray(blocks) ? blocks : [];
  const safeChunks = Array.isArray(chunks) ? chunks : [];
  const safeWarnings = Array.isArray(warnings) ? warnings : [];

  if (safeWarnings.length > 0) {
    issues.push(
      createIssue(
        "warning",
        "EXTRACTION_WARNINGS",
        `Mammoth zgłosił ostrzeżenia podczas ekstrakcji: ${safeWarnings.length}.`
      )
    );
  }

  const totalBlockContentChars = safeBlocks.reduce(
    (sum, block) => sum + normalizeText(block.content).length,
    0
  );

  if (totalBlockContentChars < minContentChars) {
    issues.push(
      createIssue(
        "warning",
        "WEAK_CONTENT",
        `Dokument zawiera mało treści merytorycznej: ${totalBlockContentChars} znaków.`
      )
    );
  }

  safeChunks.forEach((chunk) => {
    const chunkContent = normalizeText(chunk.content);

    if (!chunkContent) {
      issues.push(
        createIssue(
          "error",
          "EMPTY_CHUNK",
          `Chunk ${chunk.chunk_index} ma pustą treść.`
        )
      );

      return;
    }

    if (
      !Array.isArray(chunk.block_indices) ||
      chunk.block_indices.length === 0
    ) {
      issues.push(
        createIssue(
          "error",
          "MISSING_BLOCK_INDICES",
          `Chunk ${chunk.chunk_index} nie ma listy block_indices.`
        )
      );

      return;
    }

    const reconstructedContent = normalizeText(
      joinBlocksByIndices(safeBlocks, chunk.block_indices)
    );

    if (!reconstructedContent) {
      issues.push(
        createIssue(
          "error",
          "MISSING_SOURCE_BLOCKS",
          `Chunk ${chunk.chunk_index} odwołuje się do bloków, których nie można odtworzyć.`
        )
      );

      return;
    }

    if (chunkContent !== reconstructedContent) {
      issues.push(
        createIssue(
          "error",
          "CHUNK_NOT_SOURCE_ONLY",
          `Chunk ${chunk.chunk_index} zawiera treść inną niż wynik połączenia wskazanych bloków.`
        )
      );
    }

    if (isBoundaryOnlyChunk(chunk)) {
      issues.push(
        createIssue(
          "warning",
          "ORPHAN_BOUNDARY_CHUNK",
          `Chunk ${chunk.chunk_index} wygląda jak osierocony nagłówek lub etykieta sekcji.`
        )
      );
    }
  });

  const hasErrors = issues.some(
    (issue) => issue.level === "error"
  );

  const hasWarnings = issues.some(
    (issue) => issue.level === "warning"
  );

  const status = hasErrors
    ? "failed"
    : hasWarnings
      ? "needs_review"
      : "ready_for_embedding";

  return {
    status,

    metrics: {
      block_count: safeBlocks.length,
      chunk_count: safeChunks.length,
      total_block_content_chars: totalBlockContentChars,
      warning_count: safeWarnings.length
    },

    issues
  };
}
