import { extractDocxToBlocks } from "./extractDocxToBlocks"

const DOCX_MIME_TYPE =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document"

function getErrorMessage(error) {
  if (error instanceof Error && error.message) {
    return error.message
  }

  return String(error || "Nieznany błąd ingestion DOCX.")
}

function assertRequiredArguments({
  supabaseAdmin,
  documentId,
  ownerId,
}) {
  if (!supabaseAdmin) {
    throw new Error(
      "Brak serwerowego klienta Supabase."
    )
  }

  if (!documentId) {
    throw new Error(
      "Brak identyfikatora dokumentu."
    )
  }

  if (!ownerId) {
    throw new Error(
      "Brak identyfikatora właściciela dokumentu."
    )
  }
}

function haveSameBlocks(existingBlocks, extractedBlocks) {
  if (existingBlocks.length !== extractedBlocks.length) {
    return false
  }

  return existingBlocks.every((existingBlock, index) => {
    const extractedBlock = extractedBlocks[index]

    return (
      existingBlock.block_index === extractedBlock.block_index &&
      existingBlock.content_hash === extractedBlock.content_hash
    )
  })
}

async function updateDocumentStatus({
  supabaseAdmin,
  documentId,
  ownerId,
  status,
  errorMessage = null,
}) {
  const { error } = await supabaseAdmin
    .from("teacher_documents")
    .update({
      status,
      error_message: errorMessage,
      updated_at: new Date().toISOString(),
    })
    .eq("id", documentId)
    .eq("owner_id", ownerId)

  if (error) {
    throw new Error(
      `Nie udało się ustawić statusu dokumentu na "${status}": ${error.message}`
    )
  }
}

async function tryMarkDocumentAsError({
  supabaseAdmin,
  documentId,
  ownerId,
  errorMessage,
}) {
  if (!supabaseAdmin || !documentId || !ownerId) {
    return
  }

  await supabaseAdmin
    .from("teacher_documents")
    .update({
      status: "error",
      error_message: errorMessage,
      updated_at: new Date().toISOString(),
    })
    .eq("id", documentId)
    .eq("owner_id", ownerId)
}

export async function ingestTeacherDocumentBlocks({
  supabaseAdmin,
  documentId,
  ownerId,
}) {
  assertRequiredArguments({
    supabaseAdmin,
    documentId,
    ownerId,
  })

  let document = null

  try {
    const {
      data: loadedDocument,
      error: documentError,
    } = await supabaseAdmin
      .from("teacher_documents")
      .select(
        [
          "id",
          "owner_id",
          "storage_bucket",
          "storage_path",
          "original_file_name",
          "mime_type",
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

    if (!loadedDocument) {
      throw new Error(
        "Nie znaleziono dokumentu należącego do aktualnego nauczyciela."
      )
    }

    document = loadedDocument

    if (document.mime_type !== DOCX_MIME_TYPE) {
      throw new Error(
        "Source-only extraction obsługuje obecnie wyłącznie dokumenty DOCX."
      )
    }

    const {
      data: downloadedFile,
      error: downloadError,
    } = await supabaseAdmin.storage
      .from(document.storage_bucket)
      .download(document.storage_path)

    if (downloadError || !downloadedFile) {
      throw new Error(
        `Nie udało się pobrać dokumentu ze Storage: ${
          downloadError?.message || "brak danych pliku"
        }`
      )
    }

    const arrayBuffer = await downloadedFile.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const extraction = await extractDocxToBlocks({
      buffer,
      documentId: document.id,
      sourceFilename: document.original_file_name,
    })

    const {
      data: existingBlocks,
      error: existingBlocksError,
    } = await supabaseAdmin
      .from("document_blocks")
      .select("block_index, content_hash")
      .eq("document_id", document.id)
      .eq("owner_id", ownerId)
      .order("block_index", { ascending: true })

    if (existingBlocksError) {
      throw new Error(
        `Nie udało się sprawdzić istniejących bloków: ${existingBlocksError.message}`
      )
    }

    const currentBlocks = existingBlocks || []
    let reusedExistingBlocks = false

    if (currentBlocks.length > 0) {
      if (
        !haveSameBlocks(
          currentBlocks,
          extraction.blocks
        )
      ) {
        throw new Error(
          "Dokument ma już zapisane bloki o innej treści. Ingestion został zatrzymany bez nadpisywania źródła."
        )
      }

      reusedExistingBlocks = true
    } else {
      const blockRows = extraction.blocks.map((block) => ({
        document_id: block.document_id,
        owner_id: ownerId,
        block_index: block.block_index,
        block_type: block.block_type,
        heading_path: block.heading_path,
        content: block.content,
        content_hash: block.content_hash,
        is_excluded: block.is_excluded,
        exclude_reason: block.exclude_reason,
      }))

      const { error: insertError } = await supabaseAdmin
        .from("document_blocks")
        .insert(blockRows)

      if (insertError) {
        throw new Error(
          `Nie udało się zapisać bloków dokumentu: ${insertError.message}`
        )
      }
    }

    await updateDocumentStatus({
      supabaseAdmin,
      documentId: document.id,
      ownerId,
      status: "extracted",
      errorMessage: null,
    })

    return {
      documentId: document.id,
      sourceFilename: document.original_file_name,
      status: "extracted",
      blockCount: extraction.block_count,
      warnings: extraction.warnings,
      reusedExistingBlocks,
    }
  } catch (error) {
    const errorMessage = getErrorMessage(error)

    if (document?.id) {
      await tryMarkDocumentAsError({
        supabaseAdmin,
        documentId: document.id,
        ownerId,
        errorMessage,
      })
    }

    throw new Error(errorMessage)
  }
}

/*
funkcje nie usuwa bloków, bo:
brak bloków
→ zapisuje wynik ekstrakcji

istnieją identyczne bloki
→ nie duplikuje ich
→ tylko potwierdza status extracted

istnieją inne bloki
→ zatrzymuje proces
→ niczego nie nadpisuje
To chroni źródło nauczyciela przed cichym zastąpieniem inną wersją dokumentu.

*/