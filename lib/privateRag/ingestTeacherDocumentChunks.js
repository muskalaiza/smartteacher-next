import { chunkDocumentBlocks } from "./chunkDocumentBlocks"

const DEFAULT_MAX_CHUNK_CHARS = 1600
const CHUNKING_VERSION = "source_only_v1"

function getErrorMessage(error) {
  if (error instanceof Error && error.message) {
    return error.message
  }

  return String(error || "Nieznany błąd chunkingu dokumentu.")
}

function assertRequiredArguments({
  supabaseAdmin,
  documentId,
  ownerId,
}) {
  if (!supabaseAdmin) {
    throw new Error("Brak serwerowego klienta Supabase.")
  }

  if (!documentId) {
    throw new Error("Brak identyfikatora dokumentu.")
  }

  if (!ownerId) {
    throw new Error(
      "Brak identyfikatora właściciela dokumentu."
    )
  }
}

function arraysEqual(first, second) {
  if (
    !Array.isArray(first) ||
    !Array.isArray(second) ||
    first.length !== second.length
  ) {
    return false
  }

  return first.every(
    (value, index) => value === second[index]
  )
}

function haveSameChunks({
  existingChunks,
  generatedChunks,
  maxChunkChars,
}) {
  if (
    existingChunks.length !== generatedChunks.length
  ) {
    return false
  }

  return existingChunks.every(
    (existingChunk, index) => {
      const generatedChunk = generatedChunks[index]

      return (
        existingChunk.chunk_index ===
          generatedChunk.chunk_index &&
        existingChunk.content_hash ===
          generatedChunk.content_hash &&
        existingChunk.start_block_index ===
          generatedChunk.start_block_index &&
        existingChunk.end_block_index ===
          generatedChunk.end_block_index &&
        existingChunk.block_count ===
          generatedChunk.block_count &&
        arraysEqual(
          existingChunk.block_indices,
          generatedChunk.block_indices
        ) &&
        existingChunk.max_chunk_chars ===
          maxChunkChars &&
        existingChunk.is_oversized ===
          generatedChunk.is_oversized &&
        existingChunk.chunking_version ===
          CHUNKING_VERSION
      )
    }
  )
}

async function updateDocumentStatusToChunked({
  supabaseAdmin,
  documentId,
  ownerId,
}) {
  const { error } = await supabaseAdmin
    .from("teacher_documents")
    .update({
      status: "chunked",
      error_message: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", documentId)
    .eq("owner_id", ownerId)

  if (error) {
    throw new Error(
      `Nie udało się ustawić statusu dokumentu na "chunked": ${error.message}`
    )
  }
}

export async function ingestTeacherDocumentChunks({
  supabaseAdmin,
  documentId,
  ownerId,
  maxChunkChars = DEFAULT_MAX_CHUNK_CHARS,
}) {
  assertRequiredArguments({
    supabaseAdmin,
    documentId,
    ownerId,
  })

  try {
    /*
      Najpierw potwierdzamy właściciela dokumentu
      i jego aktualny etap przetwarzania.
    */
    const {
      data: document,
      error: documentError,
    } = await supabaseAdmin
      .from("teacher_documents")
      .select(
        [
          "id",
          "owner_id",
          "original_file_name",
          "status",
        ].join(", ")
      )
      .eq("id", documentId)
      .eq("owner_id", ownerId)
      .maybeSingle()

    if (documentError) {
      throw new Error(
        `Nie udało się pobrać metadanych dokumentu: ${documentError.message}`
      )
    }

    if (!document) {
      throw new Error(
        "Nie znaleziono dokumentu należącego do aktualnego nauczyciela."
      )
    }

    /*
      Nie cofamy dokumentu z etapu embeddingów lub ready
      do wcześniejszego statusu chunked.

      Ponowny chunking takiego dokumentu będzie wymagał
      osobnego procesu reprocessing wraz z unieważnieniem
      dotychczasowych embeddingów.
    */
    if (
      document.status === "embedded" ||
      document.status === "ready"
    ) {
      throw new Error(
        "Dokument ma już embeddingi. Ponowny chunking wymaga kontrolowanego reprocessingu."
      )
    }

    /*
      Pobieramy source-only bloki w dokładnej kolejności.
    */
    const {
      data: loadedBlocks,
      error: blocksError,
    } = await supabaseAdmin
      .from("document_blocks")
      .select(
        [
          "document_id",
          "block_index",
          "block_type",
          "heading_path",
          "content",
          "content_hash",
          "is_excluded",
          "exclude_reason",
        ].join(", ")
      )
      .eq("document_id", document.id)
      .eq("owner_id", ownerId)
      .order("block_index", {
        ascending: true,
      })

    if (blocksError) {
      throw new Error(
        `Nie udało się pobrać bloków dokumentu: ${blocksError.message}`
      )
    }

    const blocks = loadedBlocks || []

    if (blocks.length === 0) {
      throw new Error(
        "Dokument nie ma bloków źródłowych. Najpierw wykonaj extraction DOCX."
      )
    }

    const chunking = chunkDocumentBlocks({
      blocks,
      documentId: document.id,
      maxChunkChars,
    })

    /*
      Sprawdzamy, czy dokument ma już zapisane chunki.
      Nie nadpisujemy istniejącego źródła automatycznie.
    */
    const {
      data: loadedExistingChunks,
      error: existingChunksError,
    } = await supabaseAdmin
      .from("document_chunks")
      .select(
        [
          "chunk_index",
          "content_hash",
          "start_block_index",
          "end_block_index",
          "block_indices",
          "block_count",
          "max_chunk_chars",
          "is_oversized",
          "chunking_version",
        ].join(", ")
      )
      .eq("document_id", document.id)
      .eq("owner_id", ownerId)
      .order("chunk_index", {
        ascending: true,
      })

    if (existingChunksError) {
      throw new Error(
        `Nie udało się sprawdzić istniejących chunków: ${existingChunksError.message}`
      )
    }

    const existingChunks =
      loadedExistingChunks || []

    let reusedExistingChunks = false

    if (existingChunks.length > 0) {
      const chunksAreIdentical = haveSameChunks({
        existingChunks,
        generatedChunks: chunking.chunks,
        maxChunkChars:
          chunking.max_chunk_chars,
      })

      if (!chunksAreIdentical) {
        throw new Error(
          "Dokument ma już zapisane chunki utworzone z innej treści albo inną wersją chunkingu. Proces został zatrzymany bez nadpisywania danych."
        )
      }

      reusedExistingChunks = true
    } else {
      const chunkRows = chunking.chunks.map(
        (chunk) => ({
          document_id: document.id,
          owner_id: ownerId,

          chunk_index: chunk.chunk_index,

          content: chunk.content,
          content_hash: chunk.content_hash,

          start_block_index:
            chunk.start_block_index,

          end_block_index:
            chunk.end_block_index,

          block_indices: chunk.block_indices,
          block_count: chunk.block_count,

          heading_path: chunk.heading_path,

          char_count: chunk.char_count,
          token_count_estimate:
            chunk.token_count_estimate,

          max_chunk_chars:
            chunking.max_chunk_chars,

          is_oversized: chunk.is_oversized,

          chunking_version:
            CHUNKING_VERSION,
        })
      )

      const { error: insertError } =
        await supabaseAdmin
          .from("document_chunks")
          .insert(chunkRows)

      if (insertError) {
        throw new Error(
          `Nie udało się zapisać chunków dokumentu: ${insertError.message}`
        )
      }
    }

    await updateDocumentStatusToChunked({
      supabaseAdmin,
      documentId: document.id,
      ownerId,
    })

    return {
      documentId: document.id,
      sourceFilename:
        document.original_file_name,
      status: "chunked",

      sourceBlockCount:
        chunking.source_block_count,

      excludedBlockCount:
        chunking.excluded_block_count,

      chunkCount: chunking.chunk_count,

      maxChunkChars:
        chunking.max_chunk_chars,

      chunkingVersion:
        CHUNKING_VERSION,

      oversizedChunkCount:
        chunking.chunks.filter(
          (chunk) => chunk.is_oversized
        ).length,

      reusedExistingChunks,
    }
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}


/*
Zachowanie funkcji:
brak chunków w bazie
→ generuje i zapisuje chunki
→ status chunked

istnieją identyczne chunki
→ nie zapisuje duplikatów
→ potwierdza status chunked

istnieją inne chunki
→ zatrzymuje proces
→ niczego nie nadpisuje

status embedded lub ready
→ zatrzymuje proces
→ chroni istniejące embeddingi

*/