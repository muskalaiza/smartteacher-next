import { createHash } from "node:crypto"

import mammoth from "mammoth"
import { parse } from "node-html-parser"

/*
  SOURCE-ONLY DOCX INGESTION

  Odpowiedzialność:
  DOCX nauczyciela → bloki źródłowe w kolejności dokumentu.

  Ten moduł NIE:
  - używa modelu AI,
  - parafrazuje ani poprawia treści nauczyciela,
  - dopisuje przykładów,
  - korzysta z LearningUnits,
  - tworzy chunków,
  - tworzy embeddingów,
  - zapisuje danych do Supabase.
*/

function createContentHash(content) {
  return createHash("sha256")
    .update(String(content || ""), "utf8")
    .digest("hex")
}

function normalizePlainText(value) {
  return String(value || "")
    .replace(/\r\n?/g, "\n")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/[ \t]*\n[ \t]*/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

function normalizeCodeText(value) {
  return String(value || "")
    .replace(/\r\n?/g, "\n")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+$/gm, "")
    .replace(/^\n+|\n+$/g, "")
}

function normalizeBlockContent(value, blockType) {
  if (blockType === "code") {
    return normalizeCodeText(value)
  }

  return normalizePlainText(value)
}

function getTagName(node) {
  return String(node?.rawTagName || node?.tagName || "").toLowerCase()
}

function isHeadingTag(tagName) {
  return /^h[1-6]$/.test(tagName)
}

function getHeadingLevel(tagName) {
  if (!isHeadingTag(tagName)) {
    return null
  }

  return Number(tagName.slice(1))
}

function looksLikeTopicHeading(content) {
  return /^temat\s*:/i.test(normalizePlainText(content))
}

function looksLikeSectionHeading(content) {
  const normalized = normalizePlainText(content)

  if (
    !normalized ||
    normalized.length > 90 ||
    !normalized.endsWith(":") ||
    normalized.includes("\n")
  ) {
    return false
  }

  const contentWithoutFinalColon = normalized.slice(0, -1)

  /*
    Pełne zdanie zakończone dwukropkiem nie jest automatycznie
    śródtytułem. Odrzucamy tekst zawierający interpunkcję zdaniową.
  */
  const hasSentencePunctuation =
    /[,.!?;]/.test(contentWithoutFinalColon)

  return !hasSentencePunctuation
}

function looksLikeManualListItem(content) {
  const normalized = normalizePlainText(content)

  return /^(?:[-–—•▪◦]|\d{1,3}[.)]|[a-ząćęłńóśźż][.)])\s+/i.test(
    normalized
  )
}

function looksLikeCodeExample(content) {
  const normalized = normalizePlainText(content)

  return (
    /\s[–-]\s/.test(normalized) &&
    /^(?:int|float|double|char|string|bool|short|long|unsigned|const|auto|std::string)\b/.test(
      normalized
    )
  )
}

function looksLikeCode(content) {
  const rawContent = String(content || "")
  const normalized = normalizePlainText(rawContent)

  return (
    /^[ \t]{2,}\S/m.test(rawContent) ||
    /;\s*$/.test(normalized) ||
    /^#include\b/.test(normalized) ||
    /\b(?:cout|cin|std::cout|std::cin)\b/.test(normalized) ||
    /^(?:int|float|double|char|string|bool|short|long|unsigned|const|auto|std::string)\b/.test(
      normalized
    ) ||
    /^[A-Za-z_]\w*\s*=/.test(normalized)
  )
}

function inferParagraphType(content) {
  if (looksLikeTopicHeading(content)) {
    return "heading"
  }

  /*
    Lista musi zostać rozpoznana przed heurystycznym nagłówkiem.
    Punkt listy może kończyć się dwukropkiem.
  */
  if (looksLikeManualListItem(content)) {
    return "list_item"
  }

  if (looksLikeSectionHeading(content)) {
    return "heading"
  }

  if (looksLikeCodeExample(content)) {
    return "example"
  }

  if (looksLikeCode(content)) {
    return "code"
  }

  return "paragraph"
}


function normalizeMammothMessages(messages) {
  if (!Array.isArray(messages)) {
    return []
  }

  return messages.map((message) => ({
    type: message?.type || "unknown",
    message: message?.message || "",
  }))
}

function getListItemOwnText(node) {
  const childNodes = Array.isArray(node?.childNodes)
    ? node.childNodes
    : []

  return childNodes
    .filter((child) => {
      const tagName = getTagName(child)
      return tagName !== "ul" && tagName !== "ol"
    })
    .map((child) => child?.textContent || "")
    .join("")
}

function getTableRowContent(node) {
  const cells =
    typeof node?.querySelectorAll === "function"
      ? node.querySelectorAll("th, td")
      : []

  const cellContents = cells
    .map((cell) => normalizePlainText(cell.textContent))
    .filter(Boolean)

  if (cellContents.length > 0) {
    return cellContents.join(" | ")
  }

  return normalizePlainText(node?.textContent)
}

const DOCX_STYLE_MAP = [
  /*
    Standardowe identyfikatory stylów Worda.
  */
  "p.Heading1 => h1:fresh",
  "p.Heading2 => h2:fresh",
  "p.Heading3 => h3:fresh",

  /*
    Identyfikatory występujące w dokumentach utworzonych
    w polskiej wersji Microsoft Word.
  */
  "p.Nagwek1 => h1:fresh",
  "p.Nagwek2 => h2:fresh",
  "p.Nagwek3 => h3:fresh",

  /*
    Dodatkowe mapowanie według nazwy stylu.
  */
  "p[style-name='heading 1'] => h1:fresh",
  "p[style-name='heading 2'] => h2:fresh",
  "p[style-name='heading 3'] => h3:fresh",

    /*
    Standardowe znakowe style wyróżnienia Worda.
    Nie zmieniają treści bloku — jedynie usuwają ostrzeżenia Mammoth
    i zachowują semantykę wyróżnienia w pośrednim HTML.
  */
  "r[style-name='Emphasis'] => em",
  "r[style-name='Subtle Emphasis'] => em",
]

export async function extractDocxToBlocks({
  filePath,
  buffer,
  documentId = null,
  sourceFilename = null,
}) {
  if (!filePath && !buffer) {
    throw new Error(
      "extractDocxToBlocks wymaga filePath albo buffer."
    )
  }

  const mammothInput = buffer
    ? { buffer }
    : { path: filePath }

  const result = await mammoth.convertToHtml(
  mammothInput,
  {
    styleMap: DOCX_STYLE_MAP,
  }
)
  const html = String(result?.value || "").trim()

  if (!html) {
    throw new Error(
      "Nie udało się wydobyć treści HTML z dokumentu DOCX."
    )
  }

  const root = parse(html)
  const blocks = []

  let headingPath = []

  function updateHeadingPath(tagName, content) {
    const cleanContent = normalizePlainText(content)

    if (!cleanContent) {
      return
    }

    if (looksLikeTopicHeading(cleanContent)) {
      headingPath = [cleanContent]
      return
    }

    const headingLevel = getHeadingLevel(tagName)

    if (headingLevel) {
      headingPath = [
        ...headingPath.slice(0, headingLevel - 1),
        cleanContent,
      ]
      return
    }

    /*
      Nagłówek rozpoznany heurystycznie w zwykłym akapicie.
      Traktujemy go jako podsekcję aktualnego tematu.
    */
    if (headingPath.length > 0) {
      headingPath = [
        headingPath[0],
        cleanContent,
      ]
      return
    }

    headingPath = [cleanContent]
  }

  function addBlock({ blockType, content }) {
    const cleanContent = normalizeBlockContent(
      content,
      blockType
    )

    if (!cleanContent) {
      return
    }

    blocks.push({
      document_id: documentId,
      block_index: blocks.length + 1,
      block_type: blockType,
      heading_path: [...headingPath],
      content: cleanContent,
      content_hash: createContentHash(cleanContent),
      is_excluded: false,
      exclude_reason: null,
    })
  }

  function walk(node) {
    const tagName = getTagName(node)

    if (!tagName) {
      return
    }

    if (isHeadingTag(tagName)) {
      const content = node.textContent

      updateHeadingPath(tagName, content)

      addBlock({
        blockType: "heading",
        content,
      })

      return
    }

    if (tagName === "pre") {
      addBlock({
        blockType: "code",
        content: node.textContent,
      })

      return
    }

    if (tagName === "li") {
      addBlock({
        blockType: "list_item",
        content: getListItemOwnText(node),
      })

      const nestedLists = node.childNodes.filter((child) => {
        const childTagName = getTagName(child)
        return childTagName === "ul" || childTagName === "ol"
      })

      nestedLists.forEach(walk)
      return
    }

    if (tagName === "tr") {
      addBlock({
        blockType: "table_row",
        content: getTableRowContent(node),
      })

      return
    }

    if (tagName === "p") {
      const content = node.textContent
      const blockType = inferParagraphType(content)

      if (blockType === "heading") {
        updateHeadingPath(tagName, content)
      }

      addBlock({
        blockType,
        content,
      })

      return
    }

    const childNodes = Array.isArray(node.childNodes)
      ? node.childNodes
      : []

    childNodes.forEach(walk)
  }

  root.childNodes.forEach(walk)

  if (blocks.length === 0) {
    throw new Error(
      "Dokument DOCX nie zawiera bloków możliwych do przetworzenia."
    )
  }

  return {
    document_id: documentId,
    source_filename: sourceFilename,
    source_path: filePath || null,
    extraction_status: "extracted",
    block_count: blocks.length,
    warnings: normalizeMammothMessages(result.messages),
    blocks,
  }
}
