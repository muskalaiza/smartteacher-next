import {
  createEmbeddingVectors,
  EMBEDDING_DIMENSIONS,
  EMBEDDING_MODEL,
} from "./createEmbeddingVectors.js"

export {
  EMBEDDING_DIMENSIONS,
  EMBEDDING_MODEL,
}

function assertValidChunks(chunks) {
  if (!Array.isArray(chunks)) {
    throw new Error(
      "createChunkEmbeddings wymaga tablicy chunków."
    )
  }

  if (chunks.length === 0) {
    throw new Error(
      "Nie można utworzyć embeddingów z pustej tablicy chunków."
    )
  }

  const chunkIds = new Set()

  chunks.forEach((chunk, index) => {
    if (!chunk || typeof chunk !== "object") {
      throw new Error(
        `Nieprawidłowy chunk na pozycji ${index + 1}.`
      )
    }

    if (
      typeof chunk.id !== "string" ||
      !chunk.id.trim()
    ) {
      throw new Error(
        `Chunk na pozycji ${index + 1} nie ma poprawnego id.`
      )
    }

    if (chunkIds.has(chunk.id)) {
      throw new Error(
        `Powtórzony identyfikator chunka: ${chunk.id}.`
      )
    }

    chunkIds.add(chunk.id)

    if (
      typeof chunk.content !== "string" ||
      !chunk.content.trim()
    ) {
      throw new Error(
        `Chunk ${chunk.id} ma pustą treść.`
      )
    }

    if (
      typeof chunk.content_hash !== "string" ||
      !/^[0-9a-f]{64}$/i.test(
        chunk.content_hash
      )
    ) {
      throw new Error(
        `Chunk ${chunk.id} nie ma poprawnego content_hash SHA-256.`
      )
    }
  })
}

export async function createChunkEmbeddings({
  chunks,
  apiKey,
}) {
  assertValidChunks(chunks)

  const vectorResult =
    await createEmbeddingVectors({
      inputs: chunks.map(
        (chunk) => chunk.content
      ),
      apiKey,
    })

  const embeddings = chunks.map(
    (chunk, index) => ({
      chunk_id: chunk.id,
      content_hash: chunk.content_hash,
      embedding_model: vectorResult.model,
      embedding_dimensions:
        vectorResult.dimensions,
      embedding:
        vectorResult.embeddings[index],
    })
  )

  return {
    model: vectorResult.model,
    dimensions: vectorResult.dimensions,
    embeddingCount: embeddings.length,
    usage: vectorResult.usage,
    embeddings,
  }
}
