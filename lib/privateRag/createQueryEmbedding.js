import {
  createEmbeddingVectors,
} from "./createEmbeddingVectors.js"

function getNormalizedQuery(query) {
  if (typeof query !== "string") {
    throw new Error(
      "createQueryEmbedding wymaga tekstowego zapytania."
    )
  }

  const normalizedQuery = query.trim()

  if (!normalizedQuery) {
    throw new Error(
      "Nie można utworzyć embeddingu z pustego zapytania."
    )
  }

  return normalizedQuery
}

export async function createQueryEmbedding({
  query,
  apiKey,
}) {
  const normalizedQuery =
    getNormalizedQuery(query)

  const vectorResult =
    await createEmbeddingVectors({
      inputs: [normalizedQuery],
      apiKey,
    })

  if (
    vectorResult.embeddingCount !== 1 ||
    !Array.isArray(vectorResult.embeddings) ||
    vectorResult.embeddings.length !== 1
  ) {
    throw new Error(
      "Nie utworzono dokładnie jednego embeddingu zapytania."
    )
  }

  const embedding =
    vectorResult.embeddings[0]

  if (!Array.isArray(embedding)) {
    throw new Error(
      "Embedding zapytania nie jest tablicą."
    )
  }

  return {
    query: normalizedQuery,
    embedding_model: vectorResult.model,
    embedding_dimensions:
      vectorResult.dimensions,
    embedding,
    usage: vectorResult.usage,
  }
}
