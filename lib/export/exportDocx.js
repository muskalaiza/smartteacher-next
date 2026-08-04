import {
  BorderStyle,
  Document,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableLayoutType,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType,
} from "docx";

import { buildTeacherGradeScaleRanges } from "../gradeScale/teacherGradeScale.js";
import { buildTeacherAnswerKey } from "../generation/buildTeacherAnswerKey.js";
import { getTaskProfilePresentation } from "../generation/getTaskProfilePresentation.js";
import { getTaskPoints } from "../generation/scoring.js";

const A4_WIDTH = 11906;
const A4_HEIGHT = 16838;
const PAGE_MARGIN = 850;
const CONTENT_WIDTH = A4_WIDTH - 2 * PAGE_MARGIN;
const DEFAULT_FONT = "Arial";
const CODE_FONT = "Courier New";
const HINT_LABELS = ["A", "B", "C", "D"];

const COLORS = {
  border: "B8BEC8",
  lightBorder: "D9DEE6",
  heading: "111827",
  muted: "4B5563",
  support: "F3F4F6",
  code: "F7F7F8",
};

const TABLE_BORDERS = {
  top: { style: BorderStyle.SINGLE, size: 4, color: COLORS.border },
  bottom: { style: BorderStyle.SINGLE, size: 4, color: COLORS.border },
  left: { style: BorderStyle.SINGLE, size: 4, color: COLORS.border },
  right: { style: BorderStyle.SINGLE, size: 4, color: COLORS.border },
  insideHorizontal: {
    style: BorderStyle.SINGLE,
    size: 2,
    color: COLORS.lightBorder,
  },
  insideVertical: {
    style: BorderStyle.SINGLE,
    size: 2,
    color: COLORS.lightBorder,
  },
};

function requireText(value, fieldName) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`Eksport DOCX wymaga pola ${fieldName}.`);
  }

  return value.trim();
}

function requireProfiles(profiles) {
  if (!Array.isArray(profiles) || profiles.length === 0) {
    throw new Error("Eksport DOCX wymaga co najmniej jednego profilu ucznia.");
  }

  return profiles.map((profile, index) => ({
    value: requireText(profile?.value, `profiles[${index}].value`),
    label: requireText(profile?.label, `profiles[${index}].label`),
  }));
}

function createParagraph({
  text = "",
  children,
  bold = false,
  size = 20,
  font = DEFAULT_FONT,
  color = COLORS.heading,
  alignment,
  before = 0,
  after = 80,
  keepNext = false,
  keepLines = true,
  pageBreakBefore = false,
  indent,
  bullet,
  border,
  shading,
} = {}) {
  return new Paragraph({
    children:
      children ||
      [
        new TextRun({
          text: String(text),
          bold,
          size,
          font,
          color,
        }),
      ],
    alignment,
    keepNext,
    keepLines,
    pageBreakBefore,
    indent,
    bullet,
    border,
    shading,
    spacing: {
      before,
      after,
      line: 240,
    },
  });
}

function createLabelValueParagraph(label, value, options = {}) {
  return createParagraph({
    ...options,
    children: [
      new TextRun({
        text: `${label}: `,
        bold: true,
        size: options.size || 20,
        font: DEFAULT_FONT,
      }),
      new TextRun({
        text: String(value ?? ""),
        size: options.size || 20,
        font: DEFAULT_FONT,
      }),
    ],
  });
}

function createSectionHeading(text, { pageBreakBefore = false } = {}) {
  return createParagraph({
    text,
    bold: true,
    size: 28,
    after: 180,
    keepNext: true,
    pageBreakBefore,
  });
}

function createSubheading(text, { before = 100, after = 80 } = {}) {
  return createParagraph({
    text,
    bold: true,
    size: 22,
    before,
    after,
    keepNext: true,
  });
}

function createCodeParagraph(code, { keepNext = false } = {}) {
  const lines = String(code || "").split("\n");
  const children = [];

  lines.forEach((line, index) => {
    children.push(
      new TextRun({
        text: line,
        font: CODE_FONT,
        size: 18,
      })
    );

    if (index < lines.length - 1) {
      children.push(new TextRun({ break: 1 }));
    }
  });

  return new Paragraph({
    children,
    keepLines: true,
    keepNext,
    shading: {
      fill: COLORS.code,
    },
    border: {
      top: { style: BorderStyle.SINGLE, size: 2, color: COLORS.lightBorder },
      bottom: { style: BorderStyle.SINGLE, size: 2, color: COLORS.lightBorder },
      left: { style: BorderStyle.SINGLE, size: 2, color: COLORS.lightBorder },
      right: { style: BorderStyle.SINGLE, size: 2, color: COLORS.lightBorder },
    },
    indent: {
      left: 120,
      right: 120,
    },
    spacing: {
      before: 40,
      after: 100,
      line: 220,
    },
  });
}

function createAnswerArea(label, lineCount) {
  const paragraphs = [
    createParagraph({
      text: label,
      bold: true,
      size: 18,
      color: COLORS.muted,
      after: 40,
      keepNext: true,
    }),
  ];

  for (let index = 0; index < lineCount; index += 1) {
    paragraphs.push(
      createParagraph({
        text: " ",
        size: 18,
        after: 70,
        border: {
          bottom: {
            style: BorderStyle.DOTTED,
            size: 4,
            color: COLORS.border,
          },
        },
      })
    );
  }

  return paragraphs;
}

function createInfoTable() {
  const field = (label, width, { columnSpan } = {}) =>
    new TableCell({
      width: { size: width, type: WidthType.DXA },
      columnSpan,
      verticalAlign: VerticalAlign.CENTER,
      margins: { top: 80, bottom: 80, left: 90, right: 90 },
      children: [
        createParagraph({
          children: [
            new TextRun({ text: `${label}: `, bold: true, size: 18 }),
            new TextRun({ text: "____________________", size: 18 }),
          ],
          after: 0,
        }),
      ],
    });

  return new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    layout: TableLayoutType.FIXED,
    borders: TABLE_BORDERS,
    rows: [
      new TableRow({
        cantSplit: true,
        children: [
          field("Imię i nazwisko", CONTENT_WIDTH, { columnSpan: 4 }),
        ],
      }),
      new TableRow({
        cantSplit: true,
        children: [
          field("Klasa", Math.floor(CONTENT_WIDTH / 4)),
          field("Data", Math.floor(CONTENT_WIDTH / 4)),
          field("Suma punktów", Math.floor(CONTENT_WIDTH / 4)),
          field("Ocena", CONTENT_WIDTH - 3 * Math.floor(CONTENT_WIDTH / 4)),
        ],
      }),
    ],
  });
}

function createSupportBlock(paragraphs) {
  if (paragraphs.length === 0) {
    return [];
  }

  return [
    new Table({
      width: { size: CONTENT_WIDTH - 360, type: WidthType.DXA },
      layout: TableLayoutType.FIXED,
      borders: {
        top: { style: BorderStyle.SINGLE, size: 2, color: COLORS.lightBorder },
        bottom: { style: BorderStyle.SINGLE, size: 2, color: COLORS.lightBorder },
        left: { style: BorderStyle.SINGLE, size: 2, color: COLORS.lightBorder },
        right: { style: BorderStyle.SINGLE, size: 2, color: COLORS.lightBorder },
        insideHorizontal: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
        insideVertical: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      },
      rows: [
        new TableRow({
          cantSplit: true,
          children: [
            new TableCell({
              shading: { fill: COLORS.support },
              margins: { top: 100, bottom: 80, left: 120, right: 120 },
              children: paragraphs,
            }),
          ],
        }),
      ],
    }),
    createParagraph({ text: "", after: 60 }),
  ];
}

function createWorksheetSupport({ intro, tips, glossary, showGlossary }) {
  const children = [];

  children.push(createSubheading("Wstęp"));
  children.push(createParagraph({ text: intro || "", after: 100 }));

  children.push(createSubheading("Mini-ściągawka"));

  (Array.isArray(tips) ? tips : []).forEach((tip) => {
    children.push(
      createLabelValueParagraph(tip?.title || "Wskazówka", tip?.text || "", {
        after: tip?.code ? 40 : 80,
      })
    );

    if (tip?.code) {
      children.push(createCodeParagraph(tip.code));
    }
  });

  if (showGlossary) {
    children.push(createSubheading("Słowniczek polsko-ukraiński"));

    (Array.isArray(glossary) ? glossary : []).forEach((item) => {
      children.push(
        createParagraph({
          children: [
            new TextRun({
              text: `${item?.term || ""} — ${item?.translation || ""}: `,
              bold: true,
              size: 19,
            }),
            new TextRun({
              text: item?.explanation || "",
              size: 19,
            }),
          ],
          after: 60,
        })
      );
    });
  }

  return children;
}

function createProfileSupport({ task, profileValue, materialTypeValue }) {
  const presentation = getTaskProfilePresentation({
    task,
    profileValue,
    materialTypeValue,
  });
  const paragraphs = [];

  if (presentation.objective) {
    paragraphs.push(
      createLabelValueParagraph("Cel", presentation.objective, {
        size: 18,
        after: presentation.answerHint ? 30 : 0,
      })
    );
  }

  if (presentation.answerHint) {
    paragraphs.push(
      createLabelValueParagraph("Sposób odpowiedzi", presentation.answerHint, {
        size: 18,
        after: 0,
      })
    );
  }

  if (presentation.plan) {
    if (presentation.plan.focus) {
      paragraphs.push(
        createLabelValueParagraph("Plan działania", presentation.plan.focus, {
          size: 18,
          after: 30,
        })
      );
    }

    presentation.plan.steps.forEach((step, index) => {
      paragraphs.push(
        createParagraph({
          text: `${index + 1}. ${step}`,
          size: 18,
          after: 20,
          indent: { left: 180 },
        })
      );
    });

    if (presentation.plan.checkpoint) {
      paragraphs.push(
        createLabelValueParagraph("Sprawdź", presentation.plan.checkpoint, {
          size: 18,
          after: 0,
        })
      );
    }
  }

  return createSupportBlock(paragraphs);
}

function createMatchPairTable(task) {
  const leftItems = Array.isArray(task.leftItems) ? task.leftItems : [];
  const rightItems = Array.isArray(task.rightItems) ? task.rightItems : [];
  const rowCount = Math.max(leftItems.length, rightItems.length);
  const rows = [
    new TableRow({
      cantSplit: true,
      children: [
        new TableCell({
          shading: { fill: COLORS.support },
          margins: { top: 70, bottom: 70, left: 80, right: 80 },
          children: [createParagraph({ text: "Elementy", bold: true, after: 0 })],
        }),
        new TableCell({
          shading: { fill: COLORS.support },
          margins: { top: 70, bottom: 70, left: 80, right: 80 },
          children: [createParagraph({ text: "Opisy", bold: true, after: 0 })],
        }),
      ],
    }),
  ];

  for (let index = 0; index < rowCount; index += 1) {
    const left = leftItems[index];
    const right = rightItems[index];

    rows.push(
      new TableRow({
        cantSplit: true,
        children: [
          new TableCell({
            margins: { top: 70, bottom: 70, left: 80, right: 80 },
            children: [
              createParagraph({
                text: left ? `${left.id}. ${left.text}` : "",
                after: 0,
              }),
            ],
          }),
          new TableCell({
            margins: { top: 70, bottom: 70, left: 80, right: 80 },
            children: [
              createParagraph({
                text: right ? `${right.id}) ${right.text}` : "",
                after: 0,
              }),
            ],
          }),
        ],
      })
    );
  }

  return new Table({
    width: { size: CONTENT_WIDTH - 360, type: WidthType.DXA },
    layout: TableLayoutType.FIXED,
    borders: TABLE_BORDERS,
    rows,
  });
}

function createTaskContent(task) {
  switch (task.taskSubtype) {
    case "closed_single":
      return [
        createParagraph({ text: task.question, after: 60 }),
        ...task.options.map((option) =>
          createParagraph({ text: `${option.id}) ${option.text}`, after: 30, indent: { left: 160 } })
        ),
      ];

    case "closed_tf":
      return [
        createParagraph({ text: task.statement, after: 70 }),
        createParagraph({ text: "Prawda     /     Fałsz", bold: true, after: 40 }),
      ];

    case "match_fill":
      return [
        createParagraph({ text: task.question, after: 60 }),
        createParagraph({ text: "Podpowiedzi:", bold: true, after: 30 }),
        ...task.hints.map((hint, index) =>
          createParagraph({
            text: `${HINT_LABELS[index] || index + 1}) ${hint}`,
            after: 25,
            indent: { left: 160 },
          })
        ),
      ];

    case "match_pair":
      return [
        createParagraph({ text: task.instruction, after: 70 }),
        createMatchPairTable(task),
      ];

    case "error_find":
      return [
        createParagraph({ text: task.instruction, after: 50 }),
        createCodeParagraph(task.codeWithError),
        ...createAnswerArea("Miejsce na poprawiony kod", 3),
      ];

    case "open_code":
      return [
        createParagraph({ text: task.instruction, after: 50 }),
        createParagraph({ text: "Wymagania:", bold: true, after: 30 }),
        ...task.requirements.map((requirement) =>
          createParagraph({ text: `• ${requirement}`, after: 25, indent: { left: 160 } })
        ),
        ...createAnswerArea("Miejsce na rozwiązanie", 5),
      ];

    case "open_explain":
      return [
        createParagraph({ text: task.instruction, after: 60 }),
        ...createAnswerArea("Miejsce na odpowiedź", 4),
      ];

    default:
      throw new Error(
        `Brak eksportera DOCX dla typu zadania: ${task.taskSubtype || "[brak]"}.`
      );
  }
}

function createStudentTask({ task, profileValue, materialTypeValue }) {
  const content = [
    createParagraph({
      text: `Zadanie ${task.number} (${getTaskPoints(task)} pkt)`,
      bold: true,
      size: 21,
      after: 70,
      keepNext: true,
    }),
    ...createProfileSupport({ task, profileValue, materialTypeValue }),
    ...createTaskContent(task),
  ];

  return [
    new Table({
      width: { size: CONTENT_WIDTH, type: WidthType.DXA },
      layout: TableLayoutType.FIXED,
      borders: TABLE_BORDERS,
      rows: [
        new TableRow({
          cantSplit: true,
          children: [
            new TableCell({
              margins: { top: 120, bottom: 110, left: 140, right: 140 },
              children: content,
            }),
          ],
        }),
      ],
    }),
    createParagraph({ text: "", after: 90 }),
  ];
}

function createStudentMaterial({
  materialTypeValue,
  materialTypeLabel,
  topicTitle,
  profile,
  profileIndex,
  material,
}) {
  const isWorksheet = materialTypeValue === "karta pracy";
  const children = [
    createSectionHeading(`${materialTypeLabel} — Profil: ${profile.label}`, {
      pageBreakBefore: profileIndex > 0,
    }),
    createInfoTable(),
    createParagraph({ text: "", after: 90 }),
    createLabelValueParagraph("Temat", topicTitle, { after: 130 }),
  ];

  if (isWorksheet) {
    children.push(
      ...createWorksheetSupport({
        intro: material.intro,
        tips: material.tip,
        glossary: material.glossary,
        showGlossary: profile.value === "Obcojęzyczny",
      })
    );
  }

  children.push(createSubheading("Zadania dla ucznia", { before: 120, after: 100 }));

  material.tasks.forEach((task) => {
    children.push(
      ...createStudentTask({
        task,
        profileValue: profile.value,
        materialTypeValue,
      })
    );
  });

  return children;
}

function createAnswerValue(answer) {
  if (answer.kind === "code") {
    return [
      createParagraph({ text: `${answer.label}:`, bold: true, after: 40, keepNext: true }),
      createCodeParagraph(answer.value),
    ];
  }

  if (answer.kind === "list") {
    return [
      createParagraph({ text: `${answer.label}:`, bold: true, after: 30, keepNext: true }),
      ...answer.items.map((item) =>
        createParagraph({ text: `• ${item}`, after: 25, indent: { left: 160 } })
      ),
    ];
  }

  return [createLabelValueParagraph(answer.label, answer.value, { after: 60 })];
}

function createGradeScale(gradeScale) {
  if (!gradeScale) {
    return [
      createSubheading("Skala ocen", { before: 120, after: 60 }),
      createParagraph({ text: "Skala ocen nie została ustawiona.", color: COLORS.muted }),
    ];
  }

  const ranges = buildTeacherGradeScaleRanges(gradeScale);

  return [
    createSubheading("Skala ocen", { before: 120, after: 60 }),
    ...ranges.map((range) =>
      createParagraph({
        text: `${range.grade} — ${range.label}: ${range.min}–${range.max}%`,
        after: 30,
      })
    ),
  ];
}

function createTeacherAnswerKey({ materialTypeLabel, topicTitle, tasks, gradeScale }) {
  const answerKey = buildTeacherAnswerKey(tasks);
  const children = [
    createSectionHeading("Klucz odpowiedzi dla nauczyciela", {
      pageBreakBefore: true,
    }),
    createLabelValueParagraph("Materiał", materialTypeLabel, { after: 40 }),
    createLabelValueParagraph("Temat", topicTitle, { after: 130 }),
  ];

  answerKey.tasks.forEach((task) => {
    const taskChildren = [
      createParagraph({
        text: `Zadanie ${task.number} (${task.points} pkt)`,
        bold: true,
        size: 21,
        after: 70,
        keepNext: true,
      }),
      ...createAnswerValue(task.answer),
      createLabelValueParagraph(task.answer.explanationLabel, task.explanation, {
        after: 60,
      }),
      createParagraph({ text: "Punktacja:", bold: true, after: 30, keepNext: true }),
      ...task.scoringCriteria.map((criterion) =>
        createParagraph({ text: `• ${criterion}`, after: 25, indent: { left: 160 } })
      ),
    ];

    children.push(
      new Table({
        width: { size: CONTENT_WIDTH, type: WidthType.DXA },
        layout: TableLayoutType.FIXED,
        borders: TABLE_BORDERS,
        rows: [
          new TableRow({
            cantSplit: true,
            children: [
              new TableCell({
                margins: { top: 120, bottom: 110, left: 140, right: 140 },
                children: taskChildren,
              }),
            ],
          }),
        ],
      }),
      createParagraph({ text: "", after: 90 })
    );
  });

  children.push(
    createSubheading("Podsumowanie punktacji", { before: 120, after: 60 }),
    createLabelValueParagraph("Suma punktów", `${answerKey.totalPoints} pkt`, {
      after: 80,
    }),
    ...createGradeScale(gradeScale)
  );

  return children;
}

function createFileName({ materialTypeLabel, topicTitle }) {
  const normalizePart = (value) =>
    String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase();

  const materialPart = normalizePart(materialTypeLabel) || "material";
  const topicPart = normalizePart(topicTitle) || "smartteacher";

  return `smartteacher-${materialPart}-${topicPart}.docx`;
}

export function buildMaterialDocx({
  materialTypeValue,
  materialTypeLabel,
  topicTitle,
  profiles,
  material,
  gradeScale,
}) {
  const normalizedMaterialTypeValue = requireText(
    materialTypeValue,
    "materialTypeValue"
  );
  const normalizedMaterialTypeLabel = requireText(
    materialTypeLabel,
    "materialTypeLabel"
  );
  const normalizedTopicTitle = requireText(topicTitle, "topicTitle");
  const normalizedProfiles = requireProfiles(profiles);

  if (!material || typeof material !== "object") {
    throw new Error("Eksport DOCX wymaga materiału do eksportu.");
  }

  if (!Array.isArray(material.tasks) || material.tasks.length === 0) {
    throw new Error("Eksport DOCX wymaga niepustej listy zadań.");
  }

  const children = [];

  normalizedProfiles.forEach((profile, profileIndex) => {
    children.push(
      ...createStudentMaterial({
        materialTypeValue: normalizedMaterialTypeValue,
        materialTypeLabel: normalizedMaterialTypeLabel,
        topicTitle: normalizedTopicTitle,
        profile,
        profileIndex,
        material,
      })
    );
  });

  children.push(
    ...createTeacherAnswerKey({
      materialTypeLabel: normalizedMaterialTypeLabel,
      topicTitle: normalizedTopicTitle,
      tasks: material.tasks,
      gradeScale,
    })
  );

  return new Document({
    creator: "SmartTeacher",
    title: `${normalizedMaterialTypeLabel} — ${normalizedTopicTitle}`,
    description: "Materiał dydaktyczny wygenerowany w SmartTeacher.",
    styles: {
      default: {
        document: {
          run: {
            font: DEFAULT_FONT,
            size: 20,
            color: COLORS.heading,
          },
          paragraph: {
            spacing: {
              after: 80,
              line: 240,
            },
          },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            size: {
              width: A4_WIDTH,
              height: A4_HEIGHT,
            },
            margin: {
              top: PAGE_MARGIN,
              right: PAGE_MARGIN,
              bottom: PAGE_MARGIN,
              left: PAGE_MARGIN,
              header: 360,
              footer: 360,
              gutter: 0,
            },
          },
        },
        children,
      },
    ],
  });
}

export async function exportMaterialToDocx(options) {
  const document = buildMaterialDocx(options);
  const blob = await Packer.toBlob(document);
  const fileName = createFileName(options);
  const objectUrl = URL.createObjectURL(blob);
  const downloadLink = window.document.createElement("a");

  downloadLink.href = objectUrl;
  downloadLink.download = fileName;
  downloadLink.style.display = "none";
  window.document.body.appendChild(downloadLink);
  downloadLink.click();
  downloadLink.remove();

  window.setTimeout(() => {
    URL.revokeObjectURL(objectUrl);
  }, 0);

  return fileName;
}
