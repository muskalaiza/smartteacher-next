import OpenAI from "openai"

export const EMBEDDING_MODEL =
  "text-embedding-3-small"

export const EMBEDDING_DIMENSIONS = 1536

function getRequiredApiKey(apiKey) {
  const resolvedApiKey =
    apiKey || process.env.OPENAI_API_KEY

  if (!resolvedApiKey) {
    throw new Error(
      "Brak wymaganej zmiennej środowiskowej OPENAI_API_KEY."
    )
  }

  return resolvedApiKey
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

function assertValidEmbedding({
  embedding,
  responseIndex,
}) {
  if (!Array.isArray(embedding)) {
    throw new Error(
      `Embedding ${responseIndex} nie jest tablicą.`
    )
  }

  if (
    embedding.length !== EMBEDDING_DIMENSIONS
  ) {
    throw new Error(
      `Embedding ${responseIndex} ma ${embedding.length} wymiarów zamiast ${EMBEDDING_DIMENSIONS}.`
    )
  }

  embedding.forEach((value, valueIndex) => {
    if (
      typeof value !== "number" ||
      !Number.isFinite(value)
    ) {
      throw new Error(
        `Embedding ${responseIndex} zawiera nieprawidłową wartość na pozycji ${valueIndex}.`
      )
    }
  })
}

export async function createChunkEmbeddings({
  chunks,
  apiKey,
}) {
  assertValidChunks(chunks)

  const openai = new OpenAI({
    apiKey: getRequiredApiKey(apiKey),
  })

  const response =
    await openai.embeddings.create({
      model: EMBEDDING_MODEL,

      /*
        Wysyłamy dokładną treść source-only
        zapisaną w document_chunks.
      */
      input: chunks.map(
        (chunk) => chunk.content
      ),

      /*
        Jawnie wymagamy tablic liczb zmiennoprzecinkowych.
      */
      encoding_format: "float",

      /*
        Wymiar musi odpowiadać:
        extensions.vector(1536)
        w document_embeddings.
      */
      dimensions: EMBEDDING_DIMENSIONS,
    })

  if (!Array.isArray(response.data)) {
    throw new Error(
      "OpenAI nie zwróciło tablicy embeddingów."
    )
  }

  if (response.data.length !== chunks.length) {
    throw new Error(
      `OpenAI zwróciło ${response.data.length} embeddingów dla ${chunks.length} chunków.`
    )
  }

  const embeddingsByIndex = new Map()

  response.data.forEach((item) => {
    if (
      !Number.isInteger(item?.index) ||
      item.index < 0 ||
      item.index >= chunks.length
    ) {
      throw new Error(
        "OpenAI zwróciło nieprawidłowy indeks embeddingu."
      )
    }

    if (embeddingsByIndex.has(item.index)) {
      throw new Error(
        `OpenAI zwróciło powtórzony indeks embeddingu: ${item.index}.`
      )
    }

    assertValidEmbedding({
      embedding: item.embedding,
      responseIndex: item.index,
    })

    embeddingsByIndex.set(
      item.index,
      item.embedding
    )
  })

  const embeddings = chunks.map(
    (chunk, index) => {
      const embedding =
        embeddingsByIndex.get(index)

      if (!embedding) {
        throw new Error(
          `Brak embeddingu dla chunka ${chunk.id}.`
        )
      }

      return {
        chunk_id: chunk.id,
        content_hash: chunk.content_hash,
        embedding_model: EMBEDDING_MODEL,
        embedding_dimensions:
          EMBEDDING_DIMENSIONS,
        embedding,
      }
    }
  )

  return {
    model: EMBEDDING_MODEL,
    dimensions: EMBEDDING_DIMENSIONS,
    embeddingCount: embeddings.length,

    usage: {
      promptTokens:
        response.usage?.prompt_tokens ?? null,
      totalTokens:
        response.usage?.total_tokens ?? null,
    },

    embeddings,
  }
}
