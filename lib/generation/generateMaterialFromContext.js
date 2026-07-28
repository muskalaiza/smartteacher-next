import OpenAI from "openai";

import {
  buildMaterialResponseSchema,
} from "./buildMaterialResponseSchema.js";

import {
  buildMaterialPrompt,
} from "./buildMaterialPrompt.js";

import {
  parseGeneratedMaterial,
} from "./parseGeneratedMaterial.js";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  timeout: 120_000,
  maxRetries: 1,
});

function getCompletionUsage(
  usage
) {
  if (
    !usage ||
    !Number.isInteger(
      usage.prompt_tokens
    ) ||
    usage.prompt_tokens < 0 ||
    !Number.isInteger(
      usage.completion_tokens
    ) ||
    usage.completion_tokens < 0 ||
    !Number.isInteger(
      usage.total_tokens
    ) ||
    usage.total_tokens < 0
  ) {
    throw new Error(
      "Model nie zwrócił poprawnych danych usage dla materiału."
    );
  }

  if (
    usage.total_tokens !==
    usage.prompt_tokens +
      usage.completion_tokens
  ) {
    throw new Error(
      "Dane usage materiału są niespójne."
    );
  }

  return {
    promptTokens:
      usage.prompt_tokens,

    completionTokens:
      usage.completion_tokens,

    totalTokens:
      usage.total_tokens,
  };
}

export async function generateMaterialFromContext({
  topicTitle,
  materialType,
  profiles,
  taskPlan,
  sourceContext,
  model,
}) {
  if (
    typeof model !== "string" ||
    !model.trim()
  ) {
    throw new Error(
      "Brak modelu Generatora."
    );
  }

  if (
    !Array.isArray(profiles) ||
    profiles.length === 0
  ) {
    throw new Error(
      "Brak profili uczniów dla Generatora."
    );
  }

  const normalizedModel =
    model.trim();

  const shouldGenerateGlossary =
    profiles.includes(
      "Obcojęzyczny"
    ) &&
    materialType ===
      "karta pracy";

  const shouldGenerateAdhdSupport =
    profiles.includes("ADHD");

  const materialResponseSchema =
    buildMaterialResponseSchema({
      taskPlan,
      shouldGenerateGlossary,
      shouldGenerateAdhdSupport,
    });

  const materialPrompt =
    buildMaterialPrompt({
      topicTitle,
      materialType,
      taskPlan,
      sourceContext,
      shouldGenerateAdhdSupport,
      shouldGenerateGlossary,
    });

  const materialCompletion =
    await openai.chat.completions.create({
      model:
        normalizedModel,

      response_format: {
        type: "json_schema",

        json_schema: {
          name:
            "smartteacher_material",

          strict: true,

          schema:
            materialResponseSchema,
        },
      },

      messages: [
        {
          role: "system",

          content:
            "Jesteś nauczycielem informatyki w szkole średniej i ekspertem dydaktyki.",
        },
        {
          role: "user",

          content:
            materialPrompt,
        },
      ],

      temperature: 0.2,
    });

  const materialChoice =
    materialCompletion
      .choices?.[0];

  const materialMessage =
    materialChoice?.message;

  if (
    !materialChoice ||
    !materialMessage
  ) {
    throw new Error(
      "Model nie zwrócił kompletnej odpowiedzi dla materiału."
    );
  }

  if (
    materialChoice.finish_reason !==
    "stop"
  ) {
    throw new Error(
      `Generowanie materiału nie zostało prawidłowo zakończone. Powód: ${
        materialChoice.finish_reason ||
        "[brak]"
      }.`
    );
  }

  if (
    materialMessage.refusal
  ) {
    const refusalError =
      new Error(
        `Model odmówił wygenerowania materiału: ${materialMessage.refusal}`
      );

    refusalError.name =
      "ModelRefusalError";

    throw refusalError;
  }

  if (
    !materialMessage.content
  ) {
    throw new Error(
      "Model nie zwrócił treści materiału."
    );
  }

  const usage =
    getCompletionUsage(
      materialCompletion.usage
    );

  const material =
    parseGeneratedMaterial(
      materialMessage.content,
      taskPlan
    );

  return {
    material,
    usage,
  };
}
