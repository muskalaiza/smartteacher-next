import OpenAI from "openai"

import {
  assertAiUsageEventListener,
  notifyAiUsageEvent,
} from "../aiUsage/notifyAiUsageEvent.js"

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

function getOptionalToken(value) {
  return Number.isInteger(value) &&
    value >= 0
    ? value
    : null
}

function getEmbeddingAiUsage(usage) {
  const inputTokens =
    getOptionalToken(
      usage?.prompt_tokens
    )

  const totalTokens =
    getOptionalToken(
      usage?.total_tokens
    )

  return {
    usageKnown:
      inputTokens !== null &&
      totalTokens === inputTokens,

    inputTokens,
    cachedInputTokens: null,
    outputTokens: null,
    totalTokens,
  }
}

export async function createEmbeddingVectors({
  inputs,
  apiKey,
  openAiClient = null,
  onAiUsageEvent = null,
}) {
  assertValidInputs(inputs)

  assertAiUsageEventListener(
    onAiUsageEvent
  )

  const resolvedOpenAiClient =
    openAiClient ||
    new OpenAI({
      apiKey: getRequiredApiKey(apiKey),
    })

  if (
    !resolvedOpenAiClient
      ?.embeddings ||
    typeof resolvedOpenAiClient
      .embeddings.create !== "function"
  ) {
    throw new Error(
      "Brak poprawnego klienta OpenAI dla embeddingów."
    )
  }

  let requestAttempted = false
  let aiUsage = null

  try {
    requestAttempted = true

    const response =
      await resolvedOpenAiClient
        .embeddings.create({
          model: EMBEDDING_MODEL,
          input: inputs,
          encoding_format: "float",
          dimensions: EMBEDDING_DIMENSIONS,
        })

    aiUsage =
      getEmbeddingAiUsage(
        response.usage
      )

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

    await notifyAiUsageEvent({
      listener:
        onAiUsageEvent,

      event: {
        model:
          EMBEDDING_MODEL,

        status:
          "succeeded",

        usage:
          aiUsage,
      },
    })

    return {
      model: EMBEDDING_MODEL,
      dimensions: EMBEDDING_DIMENSIONS,
      embeddingCount: embeddings.length,

      usage: {
        promptTokens:
          aiUsage.inputTokens,
        totalTokens:
          aiUsage.totalTokens,
      },

      embeddings,
    }
  } catch (error) {
    if (requestAttempted) {
      await notifyAiUsageEvent({
        listener:
          onAiUsageEvent,

        event: {
          model:
            EMBEDDING_MODEL,

          status:
            "failed",

          usage:
            aiUsage,
        },
      })
    }

    throw error
  }
}
