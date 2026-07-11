import {
  createChunkEmbeddings,
  EMBEDDING_DIMENSIONS,
  EMBEDDING_MODEL,
} from "./createChunkEmbeddings"

function getErrorMessage(error) {
  if (error instanceof Error && error.message) {
    return error.message
  }

  return String(
    error ||
      "Nieznany błąd generowania embeddingów dokumentu."
  )
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

function createChunkKey({
  chunkId,
  contentHash,
}) {
  return `${chunkId}:${contentHash}`
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

export async function ingestTeacherDocumentEmbeddings({
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

    if (!loadedDocument) {
      throw new Error(
        "Nie znaleziono dokumentu należącego do aktualnego nauczyciela."
      )
    }

    document = loadedDocument

    /*
      Status ready oznacza, że dokument przeszedł już
      również późniejsze kontrole retrieval.

      Nie cofamy go automatycznie do embedded.
    */
    if (document.status === "ready") {
      throw new Error(
        "Dokument ma już status ready. Ponowne generowanie embeddingów wymaga kontrolowanego reprocessingu."
      )
    }

    const {
      data: loadedChunks,
      error: chunksError,
    } = await supabaseAdmin
      .from("document_chunks")
      .select(
        [
          "id",
          "document_id",
          "chunk_index",
          "content",
          "content_hash",
        ].join(", ")
      )
      .eq("document_id", document.id)
      .eq("owner_id", ownerId)
      .order("chunk_index", {
        ascending: true,
      })

    if (chunksError) {
      throw new Error(
        `Nie udało się pobrać chunków dokumentu: ${chunksError.message}`
      )
    }

    const chunks = loadedChunks || []

    if (chunks.length === 0) {
      throw new Error(
        "Dokument nie ma chunków. Najpierw wykonaj source-only chunking."
      )
    }

    const chunkIds = chunks.map(
      (chunk) => chunk.id
    )

    const {
      data: loadedEmbeddings,
      error: embeddingsError,
    } = await supabaseAdmin
      .from("document_embeddings")
      .select(
        [
          "chunk_id",
          "content_hash",
          "embedding_model",
          "embedding_dimensions",
        ].join(", ")
      )
      .eq("owner_id", ownerId)
      .in("chunk_id", chunkIds)

    if (embeddingsError) {
      throw new Error(
        `Nie udało się sprawdzić istniejących embeddingów: ${embeddingsError.message}`
      )
    }

    const existingEmbeddings =
      loadedEmbeddings || []

    /*
      Sprawdzamy kompletność istniejących embeddingów
      dla aktualnego modelu, wymiaru i content_hash.
    */
    const validExistingKeys = new Set(
      existingEmbeddings
        .filter(
          (embedding) =>
            embedding.embedding_model ===
              EMBEDDING_MODEL &&
            embedding.embedding_dimensions ===
              EMBEDDING_DIMENSIONS
        )
        .map((embedding) =>
          createChunkKey({
            chunkId: embedding.chunk_id,
            contentHash:
              embedding.content_hash,
          })
        )
    )

    const chunksWithoutEmbedding =
      chunks.filter((chunk) => {
        const key = createChunkKey({
          chunkId: chunk.id,
          contentHash: chunk.content_hash,
        })

        return !validExistingKeys.has(key)
      })

    let usage = {
      promptTokens: 0,
      totalTokens: 0,
    }

    if (chunksWithoutEmbedding.length > 0) {
      const generated =
        await createChunkEmbeddings({
          chunks: chunksWithoutEmbedding,
        })

      const embeddingRows =
        generated.embeddings.map(
          (embedding) => ({
            chunk_id: embedding.chunk_id,
            owner_id: ownerId,
            content_hash:
              embedding.content_hash,
            embedding_model:
              embedding.embedding_model,
            embedding_dimensions:
              embedding.embedding_dimensions,
            embedding:
              embedding.embedding,
          })
        )

      const { error: insertError } =
        await supabaseAdmin
          .from("document_embeddings")
          .insert(embeddingRows)

      if (insertError) {
        throw new Error(
          `Nie udało się zapisać embeddingów dokumentu: ${insertError.message}`
        )
      }

      usage = generated.usage
    }

    /*
      Kontrola końcowa: liczba poprawnych embeddingów
      po zapisie musi odpowiadać liczbie chunków.
    */
    const {
      data: verifiedEmbeddings,
      error: verificationError,
    } = await supabaseAdmin
      .from("document_embeddings")
      .select(
        [
          "chunk_id",
          "content_hash",
          "embedding_model",
          "embedding_dimensions",
        ].join(", ")
      )
      .eq("owner_id", ownerId)
      .in("chunk_id", chunkIds)

    if (verificationError) {
      throw new Error(
        `Nie udało się zweryfikować zapisanych embeddingów: ${verificationError.message}`
      )
    }

    const verifiedKeys = new Set(
      (verifiedEmbeddings || [])
        .filter(
          (embedding) =>
            embedding.embedding_model ===
              EMBEDDING_MODEL &&
            embedding.embedding_dimensions ===
              EMBEDDING_DIMENSIONS
        )
        .map((embedding) =>
          createChunkKey({
            chunkId: embedding.chunk_id,
            contentHash:
              embedding.content_hash,
          })
        )
    )

    const allChunksEmbedded =
      chunks.every((chunk) =>
        verifiedKeys.has(
          createChunkKey({
            chunkId: chunk.id,
            contentHash:
              chunk.content_hash,
          })
        )
      )

    if (!allChunksEmbedded) {
      throw new Error(
        "Nie wszystkie chunki dokumentu mają poprawne embeddingi."
      )
    }

    await updateDocumentStatus({
      supabaseAdmin,
      documentId: document.id,
      ownerId,
      status: "embedded",
      errorMessage: null,
    })

    return {
      documentId: document.id,
      sourceFilename:
        document.original_file_name,
      status: "embedded",

      chunkCount: chunks.length,
      embeddingCount: chunks.length,

      generatedEmbeddingCount:
        chunksWithoutEmbedding.length,

      reusedEmbeddingCount:
        chunks.length -
        chunksWithoutEmbedding.length,

      embeddingModel: EMBEDDING_MODEL,
      embeddingDimensions:
        EMBEDDING_DIMENSIONS,

      usage,
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
Zachowanie funkcji: 
5 chunków
→ jedno żądanie OpenAI
→ 5 embeddingów
→ zapis do document_embeddings
→ status embedded

Ponowne wykonanie:
5 poprawnych embeddingów już istnieje
→ brak nowego wywołania OpenAI
→ brak duplikatów
→ status embedded

Częściowo przerwany proces:
3 embeddingi istnieją
→ API generuje tylko brakujące 2
→ kontrola kompletności
→ status embedded
*/