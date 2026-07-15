function assertNonEmptyStringArray(value, label) {
  if (
    !Array.isArray(value) ||
    value.length === 0 ||
    value.some(
      (item) =>
        typeof item !== "string" ||
        !item.trim()
    )
  ) {
    throw new Error(
      `${label} musi być niepustą tablicą tekstów.`
    )
  }
}

export function buildPrivateRagTaskTypeCoverageSchema({
  allowedChunkIds,
  taskSubtypes,
}) {
  assertNonEmptyStringArray(
    allowedChunkIds,
    "allowedChunkIds"
  )

  assertNonEmptyStringArray(
    taskSubtypes,
    "taskSubtypes"
  )

  const assessmentItemSchema = {
    type: "object",

    properties: {
      taskSubtype: {
        type: "string",
        enum: [...taskSubtypes],
      },

      isSupported: {
        type: "boolean",
      },

      evidenceChunkIds: {
        type: "array",

        items: {
          type: "string",
          enum: [...allowedChunkIds],
        },
      },

     

      evidenceSummary: {
  type: "string",
  pattern: "\\S",
},

missingEvidence: {
  type: "array",

  items: {
    type: "string",
    pattern: "\\S",
  },
},

constraints: {
  type: "array",

  items: {
    type: "string",
    pattern: "\\S",
  },
},
    
    },

    required: [
      "taskSubtype",
      "isSupported",
      "evidenceChunkIds",
      "evidenceSummary",
      "missingEvidence",
      "constraints",
    ],

    additionalProperties: false,
  }

  return {
    type: "object",

    properties: {
      assessments: {
        type: "array",

        minItems:
          taskSubtypes.length,

        maxItems:
          taskSubtypes.length,

        items:
          assessmentItemSchema,
      },
    },

    required: [
      "assessments",
    ],

    additionalProperties: false,
  }
}
