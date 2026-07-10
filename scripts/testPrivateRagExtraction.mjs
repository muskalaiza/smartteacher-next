import { access } from "node:fs/promises"
import path from "node:path"
import process from "node:process"

import { extractDocxToBlocks } from "../lib/privateRag/extractDocxToBlocks.js"

const ALLOWED_BLOCK_TYPES = new Set([
  "heading",
  "paragraph",
  "list_item",
  "code",
  "example",
  "table_row",
])

function countBlockTypes(blocks) {
  return blocks.reduce((counts, block) => {
    const blockType = block.block_type || "unknown"

    counts[blockType] = (counts[blockType] || 0) + 1

    return counts
  }, {})
}

function formatPreview(content, maxLength = 160) {
  const visibleContent = String(content || "")
    .replace(/\t/g, "⇥")
    .replace(/\n/g, " ↵ ")

  if (visibleContent.length <= maxLength) {
    return visibleContent
  }

  return `${visibleContent.slice(0, maxLength - 1)}…`
}

function formatHeadingPath(headingPath) {
  if (!Array.isArray(headingPath) || headingPath.length === 0) {
    return "(brak)"
  }

  return headingPath.join(" → ")
}

function assertExtractionResult(result) {
  if (!result || typeof result !== "object") {
    throw new Error("Extractor nie zwrócił obiektu wyniku.")
  }

  if (!Array.isArray(result.blocks)) {
    throw new Error("Pole result.blocks nie jest tablicą.")
  }

  if (result.blocks.length === 0) {
    throw new Error("Extractor nie zwrócił żadnych bloków.")
  }

  if (result.block_count !== result.blocks.length) {
    throw new Error(
      `Niezgodny block_count: ${result.block_count} zamiast ${result.blocks.length}.`
    )
  }

  result.blocks.forEach((block, arrayIndex) => {
    const expectedBlockIndex = arrayIndex + 1

    if (block.block_index !== expectedBlockIndex) {
      throw new Error(
        `Nieprawidłowy block_index: oczekiwano ${expectedBlockIndex}, otrzymano ${block.block_index}.`
      )
    }

    if (!ALLOWED_BLOCK_TYPES.has(block.block_type)) {
      throw new Error(
        `Nieobsługiwany block_type w bloku ${block.block_index}: ${block.block_type}.`
      )
    }

    if (typeof block.content !== "string" || !block.content.trim()) {
      throw new Error(
        `Blok ${block.block_index} ma pustą treść.`
      )
    }

    if (!Array.isArray(block.heading_path)) {
      throw new Error(
        `Blok ${block.block_index} nie ma poprawnego heading_path.`
      )
    }

    if (
      typeof block.content_hash !== "string" ||
      !/^[a-f0-9]{64}$/i.test(block.content_hash)
    ) {
      throw new Error(
        `Blok ${block.block_index} nie ma poprawnego SHA-256.`
      )
    }

    if (block.is_excluded !== false) {
      throw new Error(
        `Blok ${block.block_index} ma nieoczekiwane is_excluded.`
      )
    }
  })
}

function printBlocks(blocks) {
  console.log("\nBLOKI:")

  blocks.forEach((block) => {
    const index = String(block.block_index).padStart(2, "0")

    console.log(`\n[${index}] ${block.block_type}`)
    console.log(
      `  heading_path: ${formatHeadingPath(block.heading_path)}`
    )
    console.log(
      `  content: ${formatPreview(block.content)}`
    )
    console.log(
      `  hash: ${block.content_hash.slice(0, 12)}…`
    )
  })
}

function printWarnings(warnings) {
  if (!Array.isArray(warnings) || warnings.length === 0) {
    console.log("\nOstrzeżenia Mammoth: brak")
    return
  }

  console.log("\nOstrzeżenia Mammoth:")

  warnings.forEach((warning, index) => {
    console.log(
      `${index + 1}. [${warning.type}] ${warning.message}`
    )
  })
}

async function testDocument(inputPath) {
  const absolutePath = path.resolve(inputPath)

  await access(absolutePath)

  console.log("\n==================================================")
  console.log(`PLIK: ${absolutePath}`)
  console.log("==================================================")

  const result = await extractDocxToBlocks({
    filePath: absolutePath,
    sourceFilename: path.basename(absolutePath),
  })

  assertExtractionResult(result)

  const blockTypeCounts = countBlockTypes(result.blocks)

  console.log(`\nStatus: ${result.extraction_status}`)
  console.log(`Liczba bloków: ${result.block_count}`)
  console.log("Typy bloków:", blockTypeCounts)

  printWarnings(result.warnings)
  printBlocks(result.blocks)

  console.log("\nTEST STRUKTURALNY: OK")

  return {
    file: path.basename(absolutePath),
    blocks: result.block_count,
    headings: blockTypeCounts.heading || 0,
    paragraphs: blockTypeCounts.paragraph || 0,
    listItems: blockTypeCounts.list_item || 0,
    code: blockTypeCounts.code || 0,
    examples: blockTypeCounts.example || 0,
    tableRows: blockTypeCounts.table_row || 0,
    warnings: result.warnings.length,
  }
}

async function main() {
  const inputPaths = process.argv.slice(2)

  if (inputPaths.length === 0) {
    console.error(
      "Brak plików DOCX.\n\n" +
      "Użycie:\n" +
      'node scripts\\testPrivateRagExtraction.mjs "C:\\ścieżka\\plik.docx"'
    )

    process.exitCode = 1
    return
  }

  const summaries = []
  let failed = false

  for (const inputPath of inputPaths) {
    try {
      const summary = await testDocument(inputPath)
      summaries.push(summary)
    } catch (error) {
      failed = true

      console.error("\n==================================================")
      console.error(`BŁĄD DLA PLIKU: ${inputPath}`)
      console.error("==================================================")
      console.error(
        error instanceof Error
          ? error.message
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

  console.log("\nWSZYSTKIE TESTY ZAKOŃCZONE POPRAWNIE.")
}

await main()
