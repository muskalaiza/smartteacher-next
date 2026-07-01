import mammoth from "mammoth";
import { parse } from "node-html-parser";
import { createHash } from "node:crypto";

/*
  SOURCE-ONLY DOCX INGESTION v1

  Odpowiedzialność pliku:
  DOCX nauczyciela → bloki źródłowe w kolejności dokumentu.

  Ten plik NIE:
  - używa modelu,
  - parafrazuje treści,
  - dopisuje przykładów,
  - korzysta z LearningUnits,
  - tworzy embeddingów,
  - zapisuje danych do Supabase.
*/

function createContentHash(content) {
  return createHash("sha256")
    .update(String(content || ""), "utf8")
    .digest("hex");
}

function normalizeText(value) {
  return String(value || "")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\s+\n/g, "\n")
    .replace(/\n\s+/g, "\n")
    .trim();
}

function getTagName(node) {
  return String(node?.rawTagName || node?.tagName || "").toLowerCase();
}

function isHeadingTag(tagName) {
  return /^h[1-6]$/.test(tagName);
}

function getHeadingLevel(tagName) {
  if (!isHeadingTag(tagName)) {
    return null;
  }

  return Number(tagName.replace("h", ""));
}

function looksLikeTopicHeading(content) {
  return /^temat\s*:/i.test(content);
}

function looksLikeCodeExample(content) {
  return (
    /\s[–-]\s/.test(content) &&
    /^(int|float|double|char|string|bool|short|long|unsigned|const|std::string)\b/.test(
      content
    )
  );
}


function looksLikeCode(content) {
  return (
    /;\s*$/.test(content) ||
    /^#include\b/.test(content) ||
    /\b(cout|cin)\b/.test(content) ||
    /^(int|float|double|char|string|bool|short|long|unsigned|const|std::string)\b/.test(
      content
    ) ||
    /^[A-Za-z_]\w*\s*=/.test(content)
  );
}

function inferParagraphType(content) {
  if (looksLikeTopicHeading(content)) {
    return "heading";
  }

  if (looksLikeCodeExample(content)) {
    return "example";
  }

  if (looksLikeCode(content)) {
    return "code";
  }

  return "paragraph";
}


function normalizeMammothMessages(messages) {
  if (!Array.isArray(messages)) {
    return [];
  }

  return messages.map((message) => ({
    type: message.type || "unknown",
    message: message.message || ""
  }));
}

export async function extractDocxToBlocks({
  filePath,
  buffer,
  documentId = null,
  sourceFilename = null
}) {
  if (!filePath && !buffer) {
    throw new Error(
      "extractDocxToBlocks wymaga filePath albo buffer."
    );
  }

  const mammothInput = buffer
    ? { buffer }
    : { path: filePath };

  const result = await mammoth.convertToHtml(mammothInput);
  const html = String(result.value || "").trim();

  if (!html) {
    throw new Error(
      "Nie udało się wydobyć treści HTML z dokumentu DOCX."
    );
  }

  const root = parse(html);
  const blocks = [];
  let headingPath = [];

  function addBlock({ blockType, content }) {
    const cleanContent = normalizeText(content);

    if (!cleanContent) {
      return;
    }

    const blockIndex = blocks.length + 1;

    blocks.push({
      document_id: documentId,
      block_index: blockIndex,
      block_type: blockType,
      heading_path: [...headingPath],
      content: cleanContent,
      content_hash: createContentHash(cleanContent),
      is_excluded: false,
      exclude_reason: null
    });
  }

  function updateHeadingPath(tagName, content) {
    const cleanContent = normalizeText(content);

    if (!cleanContent) {
      return;
    }

    if (looksLikeTopicHeading(cleanContent)) {
      headingPath = [cleanContent];
      return;
    }

    const level = getHeadingLevel(tagName);

    if (!level) {
      headingPath = [cleanContent];
      return;
    }

    headingPath = [
      ...headingPath.slice(0, level - 1),
      cleanContent
    ];
  }

  function walk(node) {
    const tagName = getTagName(node);

    if (!tagName) {
      return;
    }

    const content = normalizeText(node.textContent);

    if (isHeadingTag(tagName)) {
      updateHeadingPath(tagName, content);
      addBlock({
        blockType: "heading",
        content
      });
      return;
    }

    if (tagName === "li") {
      addBlock({
        blockType: "list_item",
        content
      });
      return;
    }

    if (tagName === "tr") {
      addBlock({
        blockType: "table_row",
        content
      });
      return;
    }

    if (tagName === "p") {
      const blockType = inferParagraphType(content);

      if (blockType === "heading") {
        updateHeadingPath(tagName, content);
      }

      addBlock({
        blockType,
        content
      });
      return;
    }

    const childNodes = Array.isArray(node.childNodes)
      ? node.childNodes
      : [];

    childNodes.forEach(walk);
  }

  root.childNodes.forEach(walk);

  return {
    document_id: documentId,
    source_filename: sourceFilename,
    source_path: filePath || null,
    extraction_status: "extracted",
    block_count: blocks.length,
    warnings: normalizeMammothMessages(result.messages),
    blocks
  };
}
