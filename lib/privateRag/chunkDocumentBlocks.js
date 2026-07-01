import { createHash } from "node:crypto";

/*
  SOURCE-ONLY CHUNKING v1

  Odpowiedzialność pliku:
  document_blocks → document_chunks.

  Ten plik NIE:
  - używa modelu,
  - parafrazuje treści,
  - dopisuje przykładów,
  - korzysta z LearningUnits,
  - tworzy embeddingów,
  - zapisuje danych do Supabase.
*/

function createContentHash(content) {
  return createHash("sha256")
    .update(String(content || ""), "utf8")
    .digest("hex");
}

function normalizeText(value) {
  return String(value || "")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+/g, " ")
    .trim();
}

function isSectionBoundary(block) {
  const content = normalizeText(block?.content);

  if (!content) {
    return false;
  }

  if (block.block_type === "heading") {
    return true;
  }

  const isShortLabel = content.length <= 90;
  const endsWithColon = content.endsWith(":");
  const hasSentencePunctuation = /[,.!?]/.test(content);

  return (
    isShortLabel &&
    endsWithColon &&
    !hasSentencePunctuation
  );
}

function isSingleBoundaryLabelChunk(blocks) {
  return (
    Array.isArray(blocks) &&
    blocks.length === 1 &&
    isSectionBoundary(blocks[0])
  );
}

function estimateTokenCount(content) {
  /*
    To jest tylko techniczna estymacja do metadanych.
    Nie używamy tu tokenizera, żeby nie dodawać kolejnej zależności.
  */
  return Math.ceil(String(content || "").length / 4);
}

function assertValidBlocks(blocks) {
  if (!Array.isArray(blocks)) {
    throw new Error(
      "chunkDocumentBlocks wymaga tablicy document_blocks."
    );
  }

  if (blocks.length === 0) {
    throw new Error(
      "Nie można utworzyć chunków z pustej tablicy bloków."
    );
  }
}

function createChunk({
  documentId,
  chunkIndex,
  blocks
}) {
  const content = blocks
    .map((block) => normalizeText(block.content))
    .filter(Boolean)
    .join("\n\n");

  if (!content) {
    throw new Error(
      `Chunk ${chunkIndex} nie może mieć pustej treści.`
    );
  }

  const blockIndices = blocks.map((block) => block.block_index);

  return {
    document_id: documentId,
    chunk_index: chunkIndex,
    content,
    start_block_index: blockIndices[0],
    end_block_index: blockIndices[blockIndices.length - 1],
    block_indices: blockIndices,
    block_count: blocks.length,
    heading_path: blocks[0]?.heading_path || [],
    token_count_estimate: estimateTokenCount(content),
    content_hash: createContentHash(content)
  };
}

export function chunkDocumentBlocks({
  blocks,
  documentId = null,
  maxChunkChars = 1600
}) {
  assertValidBlocks(blocks);

  const usableBlocks = blocks.filter(
    (block) => block && block.is_excluded !== true
  );

  if (usableBlocks.length === 0) {
    throw new Error(
      "Brak bloków możliwych do użycia po odfiltrowaniu is_excluded."
    );
  }

  const chunks = [];
  let currentBlocks = [];

  usableBlocks.forEach((block) => {
    const blockContent = normalizeText(block.content);

    if (!blockContent) {
      return;
    }

  const shouldStartNewSection =
  currentBlocks.length > 0 &&
  isSectionBoundary(block) &&
  !isSingleBoundaryLabelChunk(currentBlocks);
  
if (shouldStartNewSection) {
  chunks.push(
    createChunk({
      documentId: documentId || currentBlocks[0]?.document_id || null,
      chunkIndex: chunks.length + 1,
      blocks: currentBlocks
    })
  );

  currentBlocks = [block];
  return;
}

    const candidateBlocks = [...currentBlocks, block];

    const candidateContent = candidateBlocks
      .map((item) => normalizeText(item.content))
      .filter(Boolean)
      .join("\n\n");

    const shouldStartNewChunk =
      currentBlocks.length > 0 &&
      candidateContent.length > maxChunkChars;

    if (shouldStartNewChunk) {
      chunks.push(
        createChunk({
          documentId: documentId || currentBlocks[0]?.document_id || null,
          chunkIndex: chunks.length + 1,
          blocks: currentBlocks
        })
      );

      currentBlocks = [block];
      return;
    }

    currentBlocks = candidateBlocks;
  });

  if (currentBlocks.length > 0) {
    chunks.push(
      createChunk({
        documentId: documentId || currentBlocks[0]?.document_id || null,
        chunkIndex: chunks.length + 1,
        blocks: currentBlocks
      })
    );
  }

  return {
    document_id: documentId || usableBlocks[0]?.document_id || null,
    chunk_count: chunks.length,
    chunks
  };
}
