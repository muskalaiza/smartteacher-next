import assert from "node:assert/strict"
import { createHash } from "node:crypto"
import { access } from "node:fs/promises"
import path from "node:path"
import process from "node:process"

import { extractDocxToBlocks } from "../lib/privateRag/extractDocxToBlocks.js"
import { chunkDocumentBlocks } from "../lib/privateRag/chunkDocumentBlocks.js"

const DEFAULT_MAX_CHUNK_CHARS = 1600

const TEST_DOCUMENT_ID =
  "00000000-0000-4000-8000-000000000001"

function createContentHash(content) {
  return createHash("sha256")
    .update(String(content || ""), "utf8")
    .digest("hex")
}

function getBlockContent(block) {
  const content = String(block?.content || "")
    .replace(/\r\n?/g, "\n")

  if (block?.block_type === "code") {
    return content.replace(/^\n+|\n+$/g, "")
  }

  return content.trim()
}

function joinBlockContents(blocks) {
  return blocks
    .map(getBlockContent)
    .filter(Boolean)
    .join("\n\n")
}

function formatHeadingPath(headingPath) {
  if (
    !Array.isArray(headingPath) ||
    headingPath.length === 0
  ) {
    return "(brak)"
  }

  return headingPath.join(" → ")
}

function formatPreview(content, maxLength = 180) {
  const visibleContent = String(content || "")
    .replace(/\t/g, "⇥")
    .replace(/\n/g, " ↵ ")

  if (visibleContent.length <= maxLength) {
    return visibleContent
  }

  return `${visibleContent.slice(0, maxLength - 1)}…`
}

function assertStrictlyIncreasing(values, message) {
  values.forEach((value, index) => {
    assert.ok(
      Number.isInteger(value) && value > 0,
      `${message}: wartość ${value} nie jest dodatnim indeksem.`
    )

    if (index === 0) {
      return
    }

    assert.ok(
      value > values[index - 1],
      `${message}: indeksy nie są rosnące.`
    )
  })
}

function assertChunkingResult({
  extraction,
  chunking,
  maxChunkChars,
}) {
  assert.ok(
    chunking &&
      typeof chunking === "object",
    "Chunking nie zwrócił obiektu wyniku."
  )

  assert.ok(
    Array.isArray(chunking.chunks),
    "Pole chunks nie jest tablicą."
  )

  assert.ok(
    chunking.chunks.length > 0,
    "Chunking nie zwrócił żadnych chunków."
  )

  assert.equal(
    chunking.chunk_count,
    chunking.chunks.length,
    "chunk_count nie odpowiada liczbie chunków."
  )

  assert.equal(
    chunking.document_id,
    TEST_DOCUMENT_ID,
    "Nieprawidłowe document_id wyniku chunkingu."
  )

  assert.equal(
    chunking.max_chunk_chars,
    maxChunkChars,
    "Nieprawidłowe max_chunk_chars."
  )

  const sourceBlocksByIndex = new Map()

  extraction.blocks.forEach((block) => {
    assert.ok(
      !sourceBlocksByIndex.has(block.block_index),
      `Powtórzony block_index ${block.block_index}.`
    )

    sourceBlocksByIndex.set(
      block.block_index,
      block
    )
  })

  const usableBlocks = extraction.blocks.filter(
    (block) => block.is_excluded !== true
  )

  const excludedBlocks = extraction.blocks.filter(
    (block) => block.is_excluded === true
  )

  assert.equal(
    chunking.source_block_count,
    usableBlocks.length,
    "Nieprawidłowa liczba użytych bloków."
  )

  assert.equal(
    chunking.excluded_block_count,
    excludedBlocks.length,
    "Nieprawidłowa liczba wyłączonych bloków."
  )

  const expectedBlockIndices = usableBlocks.map(
    (block) => block.block_index
  )

  const actualBlockIndices = []

  chunking.chunks.forEach((chunk, arrayIndex) => {
    const expectedChunkIndex = arrayIndex + 1

    assert.equal(
      chunk.chunk_index,
      expectedChunkIndex,
      `Nieprawidłowy chunk_index dla chunka ${expectedChunkIndex}.`
    )

    assert.equal(
      chunk.document_id,
      TEST_DOCUMENT_ID,
      `Chunk ${chunk.chunk_index} ma nieprawidłowe document_id.`
    )

    assert.ok(
      typeof chunk.content === "string" &&
        chunk.content.length > 0,
      `Chunk ${chunk.chunk_index} ma pustą treść.`
    )

    assert.ok(
      Array.isArray(chunk.block_indices) &&
        chunk.block_indices.length > 0,
      `Chunk ${chunk.chunk_index} nie ma block_indices.`
    )

    assertStrictlyIncreasing(
      chunk.block_indices,
      `Chunk ${chunk.chunk_index}`
    )

    assert.equal(
      chunk.block_count,
      chunk.block_indices.length,
      `Chunk ${chunk.chunk_index} ma niezgodny block_count.`
    )

    assert.equal(
      chunk.start_block_index,
      chunk.block_indices[0],
      `Chunk ${chunk.chunk_index} ma nieprawidłowy start_block_index.`
    )

    assert.equal(
      chunk.end_block_index,
      chunk.block_indices[
        chunk.block_indices.length - 1
      ],
      `Chunk ${chunk.chunk_index} ma nieprawidłowy end_block_index.`
    )

    const sourceBlocks = chunk.block_indices.map(
      (blockIndex) => {
        const sourceBlock =
          sourceBlocksByIndex.get(blockIndex)

        assert.ok(
          sourceBlock,
          `Chunk ${chunk.chunk_index} wskazuje nieistniejący blok ${blockIndex}.`
        )

        assert.notEqual(
          sourceBlock.is_excluded,
          true,
          `Chunk ${chunk.chunk_index} zawiera wyłączony blok ${blockIndex}.`
        )

        return sourceBlock
      }
    )

    const reconstructedContent =
      joinBlockContents(sourceBlocks)

    assert.equal(
      chunk.content,
      reconstructedContent,
      `Treści chunka ${chunk.chunk_index} nie można odtworzyć z block_indices.`
    )

    assert.equal(
      chunk.content_hash,
      createContentHash(chunk.content),
      `Chunk ${chunk.chunk_index} ma nieprawidłowy content_hash.`
    )

    assert.match(
      chunk.content_hash,
      /^[0-9a-f]{64}$/,
      `Chunk ${chunk.chunk_index} nie ma poprawnego SHA-256.`
    )

    assert.equal(
      chunk.char_count,
      chunk.content.length,
      `Chunk ${chunk.chunk_index} ma nieprawidłowy char_count.`
    )

    assert.equal(
      chunk.token_count_estimate,
      Math.ceil(chunk.content.length / 4),
      `Chunk ${chunk.chunk_index} ma nieprawidłowy token_count_estimate.`
    )

    assert.equal(
      chunk.is_oversized,
      chunk.content.length > maxChunkChars,
      `Chunk ${chunk.chunk_index} ma nieprawidłowe is_oversized.`
    )

    if (!chunk.is_oversized) {
      assert.ok(
        chunk.char_count <= maxChunkChars,
        `Chunk ${chunk.chunk_index} przekracza limit bez oznaczenia is_oversized.`
      )
    }

    assert.ok(
      Array.isArray(chunk.heading_path),
      `Chunk ${chunk.chunk_index} nie ma poprawnego heading_path.`
    )

    chunk.heading_path.forEach(
      (heading, headingIndex) => {
        assert.ok(
          typeof heading === "string" &&
            heading.trim().length > 0,
          `Chunk ${chunk.chunk_index} ma pusty element heading_path na pozycji ${headingIndex}.`
        )
      }
    )

    const containsContentBlock =
      sourceBlocks.some(
        (block) => block.block_type !== "heading"
      )

    assert.ok(
      containsContentBlock,
      `Chunk ${chunk.chunk_index} zawiera wyłącznie nagłówki.`
    )

    actualBlockIndices.push(
      ...chunk.block_indices
    )
  })

  /*
    Jedno porównanie kontroluje równocześnie:
    - brak zgubionych bloków,
    - brak duplikatów,
    - brak overlapu,
    - zachowanie kolejności.
  */
  assert.deepEqual(
    actualBlockIndices,
    expectedBlockIndices,
    "Chunki nie pokrywają dokładnie wszystkich użytecznych bloków źródłowych."
  )

  assert.equal(
    new Set(actualBlockIndices).size,
    actualBlockIndices.length,
    "Ten sam blok źródłowy występuje w więcej niż jednym chunku."
  )
}

function printWarnings(warnings) {
  if (
    !Array.isArray(warnings) ||
    warnings.length === 0
  ) {
    console.log("Ostrzeżenia Mammoth: brak")
    return
  }

  console.log("Ostrzeżenia Mammoth:")

  warnings.forEach((warning, index) => {
    console.log(
      `${index + 1}. [${warning.type}] ${warning.message}`
    )
  })
}

function printChunks(chunks) {
  console.log("\nCHUNKI:")

  chunks.forEach((chunk) => {
    const oversizedLabel = chunk.is_oversized
      ? " | OVERSIZED"
      : ""

    console.log(
      `\n[${chunk.chunk_index}] ` +
        `bloki ${chunk.start_block_index}-${chunk.end_block_index} ` +
        `| ${chunk.block_count} bloków ` +
        `| ${chunk.char_count} znaków ` +
        `| ~${chunk.token_count_estimate} tokenów` +
        oversizedLabel
    )

    console.log(
      `  block_indices: [${chunk.block_indices.join(", ")}]`
    )

    console.log(
      `  heading_path: ${formatHeadingPath(
        chunk.heading_path
      )}`
    )

    console.log(
      `  content: ${formatPreview(chunk.content)}`
    )

    console.log(
      `  hash: ${chunk.content_hash.slice(0, 12)}…`
    )
  })
}

function parseArguments(args) {
  let maxChunkChars = DEFAULT_MAX_CHUNK_CHARS
  const filePaths = []

  args.forEach((argument) => {
    if (argument.startsWith("--max-chars=")) {
      const rawValue = argument.slice(
        "--max-chars=".length
      )

      const parsedValue = Number(rawValue)

      if (
        !Number.isInteger(parsedValue) ||
        parsedValue < 200
      ) {
        throw new Error(
          "--max-chars musi być liczbą całkowitą nie mniejszą niż 200."
        )
      }

      maxChunkChars = parsedValue
      return
    }

    filePaths.push(argument)
  })

  return {
    maxChunkChars,
    filePaths,
  }
}

async function testDocument({
  inputPath,
  maxChunkChars,
}) {
  const absolutePath = path.resolve(inputPath)

  await access(absolutePath)

  console.log("\n==================================================")
  console.log(`PLIK: ${absolutePath}`)
  console.log("==================================================")

  const extraction = await extractDocxToBlocks({
    filePath: absolutePath,
    documentId: TEST_DOCUMENT_ID,
    sourceFilename: path.basename(absolutePath),
  })

  const chunking = chunkDocumentBlocks({
    blocks: extraction.blocks,
    documentId: TEST_DOCUMENT_ID,
    maxChunkChars,
  })

  assertChunkingResult({
    extraction,
    chunking,
    maxChunkChars,
  })

  /*
    Ten sam input musi dać identyczne chunki.
    Jest to ważne dla hashy i późniejszych embeddingów.
  */
  const repeatedChunking = chunkDocumentBlocks({
    blocks: extraction.blocks,
    documentId: TEST_DOCUMENT_ID,
    maxChunkChars,
  })

  assert.deepEqual(
    repeatedChunking,
    chunking,
    "Ponowne wykonanie chunkingu dało inny wynik."
  )

  console.log(
    `\nBloki źródłowe: ${extraction.block_count}`
  )

  console.log(
    `Chunki: ${chunking.chunk_count}`
  )

  console.log(
    `Limit: ${chunking.max_chunk_chars} znaków`
  )

  printWarnings(extraction.warnings)
  printChunks(chunking.chunks)

  console.log("\nTEST ODTWARZALNOŚCI: OK")
  console.log("TEST POKRYCIA BLOKÓW: OK")
  console.log("TEST BRAKU OVERLAPU: OK")
  console.log("TEST DETERMINISTYCZNOŚCI: OK")

  const chunkSizes = chunking.chunks.map(
    (chunk) => chunk.char_count
  )

  return {
    file: path.basename(absolutePath),
    blocks: extraction.block_count,
    chunks: chunking.chunk_count,
    minChars: Math.min(...chunkSizes),
    maxChars: Math.max(...chunkSizes),
    oversized: chunking.chunks.filter(
      (chunk) => chunk.is_oversized
    ).length,
    warnings: extraction.warnings.length,
  }
}

async function main() {
  let parsedArguments

  try {
    parsedArguments = parseArguments(
      process.argv.slice(2)
    )
  } catch (error) {
    console.error(
      error instanceof Error
        ? error.message
        : String(error)
    )

    process.exitCode = 1
    return
  }

  const {
    maxChunkChars,
    filePaths,
  } = parsedArguments

  if (filePaths.length === 0) {
    console.error(
      "Brak plików DOCX.\n\n" +
        "Użycie:\n" +
        "node scripts\\testPrivateRagChunking.mjs " +
        '[--max-chars=1600] "C:\\ścieżka\\plik.docx"'
    )

    process.exitCode = 1
    return
  }

  const summaries = []
  let failed = false

  for (const inputPath of filePaths) {
    try {
      const summary = await testDocument({
        inputPath,
        maxChunkChars,
      })

      summaries.push(summary)
    } catch (error) {
      failed = true

      console.error("\n==================================================")
      console.error(`BŁĄD DLA PLIKU: ${inputPath}`)
      console.error("==================================================")

      console.error(
        error instanceof Error
          ? error.stack || error.message
          : String(error)
      )
    }
  }

  if (summaries.length > 0) {
    console.log("\n==================================================")
    console.log("PODSUMOWANIE")
    console.log("==================================================")

    console.table(summaries)
  }

  if (failed) {
    process.exitCode = 1
    return
  }

  console.log(
    "\nWSZYSTKIE TESTY CHUNKINGU ZAKOŃCZONE POPRAWNIE."
  )
}

await main()