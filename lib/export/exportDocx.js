import {
  Document,
  Packer,
  Paragraph,
  TextRun,

} from "docx";

import { saveAs } from "file-saver";


/* =========================
   CZYSZCZENIE MARKDOWN
========================= */

function cleanMarkdownLine(line) {
  return String(line || "")
    .replace(/^#{1,6}\s+/, "")

    // Pogrubiona etykieta na początku linii.
    .replace(/^\*\*([^*\n]+)\*\*(?=\s|$)/, "$1")

    // Kursywa obejmująca etykietę na początku linii.
    .replace(/^\*([^*\n]+:)\*(?=\s|$)/, "$1")

    // Kursywa obejmująca całą linię.
    .replace(/^\*([^*\n]+)\*$/, "$1")

    .trim();
}


/* =========================
   MARKDOWN → AKAPITY DOCX
========================= */

function markdownToParagraphs(
  markdownText,
  { keepTogether = false } = {}
) {
  const sourceLines = String(markdownText || "").split("\n");
  const contentLines = [];

  let isCodeBlock = false;

  sourceLines.forEach((line) => {
    const trimmedLine = line.trim();

    if (trimmedLine.startsWith("```")) {
      isCodeBlock = !isCodeBlock;
      return;
    }

    if (!isCodeBlock && /^-{3,}$/.test(trimmedLine)) {
      return;
    }

    contentLines.push({
      text: isCodeBlock ? line : cleanMarkdownLine(line),
      isCodeBlock
    });
  });

  while (
    contentLines.length > 0 &&
    !contentLines[contentLines.length - 1].text.trim()
  ) {
    contentLines.pop();
  }

  return contentLines.map((entry, index) => {
    const isLastParagraph = index === contentLines.length - 1;

    const paragraphOptions = {
      keepLines: keepTogether,
      keepNext: keepTogether && !isLastParagraph
    };

    if (!entry.text) {
      return new Paragraph({
        ...paragraphOptions,
        text: ""
      });
    }

    return new Paragraph({
      ...paragraphOptions,

      children: [
        new TextRun({
          text: entry.text,
          size: entry.isCodeBlock ? 22 : 24,
          ...(entry.isCodeBlock
            ? { font: "Courier New" }
            : {})
        })
      ],

      spacing: {
        after: entry.isCodeBlock ? 0 : 120
      }
    });
  });
}
  
/* =========================
   PROFIL UCZNIA
========================= */

function createStudentDocumentParagraphs(
  studentDocument,
  profileIndex
) {
  const paragraphs = [];

  /*
    Pierwszy profil rozpoczyna dokument.
    Każdy następny otrzymuje wymuszone rozpoczęcie od nowej strony.
  */
  paragraphs.push(
    new Paragraph({
      pageBreakBefore: profileIndex > 0,
      keepNext: true,

      children: [
        new TextRun({
          text: studentDocument.profileTitle || "Profil ucznia",
          size: 24
        })
      ],

      spacing: {
        after: 120
      }
    })
  );

  paragraphs.push(
    ...markdownToParagraphs(
      studentDocument.metaText
    )
  );

  paragraphs.push(
    ...markdownToParagraphs(
      studentDocument.studentHeader
    )
  );

  const taskBlocks = Array.isArray(
    studentDocument.studentTaskBlocks
  )
    ? studentDocument.studentTaskBlocks
    : [];

  taskBlocks.forEach((taskBlock) => {
    paragraphs.push(
      ...markdownToParagraphs(taskBlock, {
        keepTogether: true
      })
    );
  });

  return paragraphs;
}

/* =========================
   EKSPORT DOCX
========================= */

export async function exportMaterialToDocx({
  studentDocuments,
  teacherText,
  fileName
}) {
  if (
    !Array.isArray(studentDocuments) ||
    studentDocuments.length === 0
  ) {
    throw new Error(
      "Brak dokumentów ucznia do eksportu DOCX."
    );
  }

  const studentParagraphs =
    studentDocuments.flatMap(
      (studentDocument, profileIndex) =>
        createStudentDocumentParagraphs(
          studentDocument,
          profileIndex
        )
    );

  const doc = new Document({
    sections: [
      {
        properties: {},

        children: [
             ...studentParagraphs,

          /*
            Klucz nauczyciela zawsze rozpoczyna się
            na nowej stronie i jest dodawany tylko raz.
          */
          new Paragraph({
            pageBreakBefore: true,
            keepNext: true,

            children: [
              new TextRun({
                text: "Klucz odpowiedzi dla nauczyciela",
                bold: true,
                size: 32
              })
            ],

            spacing: {
              after: 300
            }
          }),

          ...markdownToParagraphs(teacherText)
        ]
      }
    ]
  });

  const blob = await Packer.toBlob(doc);

  saveAs(
    blob,
    `${fileName || "material-smartteacher"}.docx`
  );
}
