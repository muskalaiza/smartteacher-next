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

function assertValidInputs(inputs) {
  if (!Array.isArray(inputs)) {
    throw new Error(
      "createEmbeddingVectors wymaga tablicy tekstów."
    )
  }

  if (inputs.length === 0) {
    throw new Error(
      "Nie można utworzyć embeddingów z pustej tablicy tekstów."
    )
  }

  inputs.forEach((input, index) => {
    if (
      typeof input !== "string" ||
      !input.trim()
    ) {
      throw new Error(
        `Tekst na pozycji ${index + 1} jest pusty lub nieprawidłowy.`
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

export async function createEmbeddingVectors({
  inputs,
  apiKey,
}) {
  assertValidInputs(inputs)

  const openai = new OpenAI({
    apiKey: getRequiredApiKey(apiKey),
  })

  const response =
    await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: inputs,
      encoding_format: "float",
      dimensions: EMBEDDING_DIMENSIONS,
    })

  if (!Array.isArray(response.data)) {
    throw new Error(
      "OpenAI nie zwróciło tablicy embeddingów."
    )
  }

  if (response.data.length !== inputs.length) {
    throw new Error(
      `OpenAI zwróciło ${response.data.length} embeddingów dla ${inputs.length} tekstów.`
    )
  }

  const embeddingsByIndex = new Map()

  response.data.forEach((item) => {
    if (
      !Number.isInteger(item?.index) ||
      item.index < 0 ||
      item.index >= inputs.length
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

  const embeddings = inputs.map(
    (_, index) => {
      const embedding =
        embeddingsByIndex.get(index)

      if (!embedding) {
        throw new Error(
          `Brak embeddingu dla tekstu na pozycji ${index + 1}.`
        )
      }

      return embedding
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
