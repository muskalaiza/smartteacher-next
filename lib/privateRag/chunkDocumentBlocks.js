import { createHash } from "node:crypto"

/*
  SOURCE-ONLY CHUNKING

  Odpowiedzialność:
  document_blocks → document_chunks w pamięci aplikacji.

  Moduł:
  - zachowuje kolejność bloków,
  - nie parafrazuje ani nie poprawia treści,
  - zachowuje wcięcia kodu,
  - zapisuje dokładne indeksy bloków źródłowych,
  - respektuje granice sekcji,
  - tworzy deterministyczny hash każdego chunka.

  Ten moduł NIE:
  - pobiera danych z Supabase,
  - zapisuje danych do Supabase,
  - tworzy embeddingów,
  - wykonuje retrieval,
  - używa modelu AI.
*/

const DEFAULT_MAX_CHUNK_CHARS = 1600

function createContentHash(content) {
  return createHash("sha256")
    .update(String(content || ""), "utf8")
    .digest("hex")
}

function getBlockContent(block) {
  const content = String(block?.content || "")
    .replace(/\r\n?/g, "\n")

  if (block?.block_type === "code") {
    /*
      W kodzie zachowujemy spacje, tabulatory i wcięcia.
      Usuwamy wyłącznie puste linie z początku i końca.
    */
    return content.replace(/^\n+|\n+$/g, "")
  }

  /*
    Zwykła treść została już znormalizowana podczas ekstrakcji.
    Chunking nie powinien zmieniać jej ponownie.
  */
  return content.trim()
}

function estimateTokenCount(content) {
  /*
    Techniczna estymacja do metadanych.

    To nie jest dokładny tokenizer konkretnego modelu.
    Finalne limity zostaną ustalone podczas testów retrieval.
  */
  return Math.ceil(String(content || "").length / 4)
}

function isHeadingBlock(block) {
  return block?.block_type === "heading"
}

function containsOnlyHeadings(blocks) {
  return (
    Array.isArray(blocks) &&
    blocks.length > 0 &&
    blocks.every(isHeadingBlock)
  )
}

function joinBlockContents(blocks) {
  return blocks
    .map(getBlockContent)
    .filter(Boolean)
    .join("\n\n")
}

function resolveChunkHeadingPath(blocks) {
  const headingPaths = blocks
    .map((block) =>
      Array.isArray(block?.heading_path)
        ? block.heading_path
        : []
    )
    .filter((headingPath) => headingPath.length > 0)

  if (headingPaths.length === 0) {
    return []
  }

  /*
    Wybieramy najgłębszą znaną ścieżkę.

    Przykład:
    Temat
    → Przykłady
    → Deklaracja zmiennej
  */
  return [...headingPaths].sort(
    (first, second) => second.length - first.length
  )[0]
}

function assertValidBlocks(blocks) {
  if (!Array.isArray(blocks)) {
    throw new Error(
      "chunkDocumentBlocks wymaga tablicy document_blocks."
    )
  }

  if (blocks.length === 0) {
    throw new Error(
      "Nie można utworzyć chunków z pustej tablicy bloków."
    )
  }

  let previousBlockIndex = 0

  blocks.forEach((block, arrayIndex) => {
    if (!block || typeof block !== "object") {
      throw new Error(
        `Nieprawidłowy blok na pozycji ${arrayIndex + 1}.`
      )
    }

    if (
      !Number.isInteger(block.block_index) ||
      block.block_index <= 0
    ) {
      throw new Error(
        `Blok na pozycji ${arrayIndex + 1} nie ma poprawnego block_index.`
      )
    }

    if (block.block_index <= previousBlockIndex) {
      throw new Error(
        "Bloki muszą być przekazane w rosnącej kolejności block_index."
      )
    }

    if (!block.block_type) {
      throw new Error(
        `Blok ${block.block_index} nie ma block_type.`
      )
    }

    if (!getBlockContent(block)) {
      throw new Error(
        `Blok ${block.block_index} ma pustą treść.`
      )
    }

    previousBlockIndex = block.block_index
  })
}

function resolveDocumentId({
  blocks,
  documentId,
}) {
  const blockDocumentIds = [
    ...new Set(
      blocks
        .map((block) => block.document_id)
        .filter(Boolean)
    ),
  ]

  if (blockDocumentIds.length > 1) {
    throw new Error(
      "Przekazane bloki należą do więcej niż jednego dokumentu."
    )
  }

  if (
    documentId &&
    blockDocumentIds.length === 1 &&
    blockDocumentIds[0] !== documentId
  ) {
    throw new Error(
      "documentId nie jest zgodne z document_id przekazanych bloków."
    )
  }

  return documentId || blockDocumentIds[0] || null
}

function createChunk({
  documentId,
  chunkIndex,
  blocks,
  maxChunkChars,
}) {
  const content = joinBlockContents(blocks)

  if (!content) {
    throw new Error(
      `Chunk ${chunkIndex} nie może mieć pustej treści.`
    )
  }

  const blockIndices = blocks.map(
    (block) => block.block_index
  )

  return {
    document_id: documentId,
    chunk_index: chunkIndex,

    content,
    content_hash: createContentHash(content),

    start_block_index: blockIndices[0],
    end_block_index:
      blockIndices[blockIndices.length - 1],
    block_indices: blockIndices,
    block_count: blocks.length,

    heading_path: resolveChunkHeadingPath(blocks),

    char_count: content.length,
    token_count_estimate: estimateTokenCount(content),
    is_oversized: content.length > maxChunkChars,
  }
}

export function chunkDocumentBlocks({
  blocks,
  documentId = null,
  maxChunkChars = DEFAULT_MAX_CHUNK_CHARS,
}) {
  assertValidBlocks(blocks)

  if (
    !Number.isInteger(maxChunkChars) ||
    maxChunkChars < 200
  ) {
    throw new Error(
      "maxChunkChars musi być liczbą całkowitą nie mniejszą niż 200."
    )
  }

  const usableBlocks = blocks.filter(
    (block) => block.is_excluded !== true
  )

  if (usableBlocks.length === 0) {
    throw new Error(
      "Brak bloków możliwych do użycia po odfiltrowaniu is_excluded."
    )
  }

  const resolvedDocumentId = resolveDocumentId({
    blocks: usableBlocks,
    documentId,
  })

  const chunks = []
  let currentBlocks = []

  function flushCurrentChunk() {
    if (currentBlocks.length === 0) {
      return
    }

    chunks.push(
      createChunk({
        documentId: resolvedDocumentId,
        chunkIndex: chunks.length + 1,
        blocks: currentBlocks,
        maxChunkChars,
      })
    )

    currentBlocks = []
  }

  usableBlocks.forEach((block) => {
    /*
      Nowy nagłówek rozpoczyna nową sekcję, jeśli aktualny
      chunk zawiera już treść.

      Kolejne nagłówki, np. H1 → H2 → H3, pozostają razem,
      aby nie tworzyć pustych chunków nagłówkowych.
    */
    if (
      isHeadingBlock(block) &&
      currentBlocks.length > 0 &&
      !containsOnlyHeadings(currentBlocks)
    ) {
      flushCurrentChunk()
    }

    const candidateBlocks = [
      ...currentBlocks,
      block,
    ]

    const candidateContent =
      joinBlockContents(candidateBlocks)

    const exceedsLimit =
      currentBlocks.length > 0 &&
      candidateContent.length > maxChunkChars

    /*
      Sam nagłówek nie powinien zostać oddzielony od pierwszego
      bloku treści tylko z powodu limitu znaków.

      Jeżeli pojedynczy blok jest większy od limitu, zachowujemy
      go w całości i oznaczamy później jako is_oversized.
    */
    if (
      exceedsLimit &&
      !containsOnlyHeadings(currentBlocks)
    ) {
      flushCurrentChunk()
      currentBlocks = [block]
      return
    }

    currentBlocks = candidateBlocks
  })

  flushCurrentChunk()

  if (chunks.length === 0) {
    throw new Error(
      "Nie udało się utworzyć żadnego chunka."
    )
  }

  return {
    document_id: resolvedDocumentId,
    chunk_count: chunks.length,
    max_chunk_chars: maxChunkChars,
    source_block_count: usableBlocks.length,
    excluded_block_count:
      blocks.length - usableBlocks.length,
    chunks,
  }
}
