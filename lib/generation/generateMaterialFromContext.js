import OpenAI from "openai";

import {
  assertAiUsageEventListener,
  notifyAiUsageEvent,
} from "../aiUsage/notifyAiUsageEvent.js";

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

function getOptionalToken(
  value
) {
  return Number.isInteger(value) &&
    value >= 0
    ? value
    : null;
}

function getCompletionAiUsage(
  usage
) {
  const inputTokens =
    getOptionalToken(
      usage?.prompt_tokens
    );

  const cachedInputTokens =
    getOptionalToken(
      usage
        ?.prompt_tokens_details
        ?.cached_tokens
    );

  const outputTokens =
    getOptionalToken(
      usage?.completion_tokens
    );

  const totalTokens =
    getOptionalToken(
      usage?.total_tokens
    );

  return {
    usageKnown:
      inputTokens !== null &&
      outputTokens !== null &&
      totalTokens ===
        inputTokens +
          outputTokens,

    inputTokens,

    cachedInputTokens:
      cachedInputTokens !== null &&
      inputTokens !== null &&
      cachedInputTokens <=
        inputTokens
        ? cachedInputTokens
        : null,

    outputTokens,
    totalTokens,
  };
}

function getCompletionUsage(
  aiUsage
) {
  if (
    !aiUsage?.usageKnown
  ) {
    throw new Error(
      "Model nie zwrócił poprawnych danych usage dla materiału."
    );
  }

  return {
    promptTokens:
      aiUsage.inputTokens,

    completionTokens:
      aiUsage.outputTokens,

    totalTokens:
      aiUsage.totalTokens,
  };
}

export async function generateMaterialFromContext({
  topicTitle,
  materialType,
  profiles,
  taskPlan,
  sourceContext,
  sourceTopics,
  model,
  openAiClient = openai,
  onAiUsageEvent = null,
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

  assertAiUsageEventListener(
    onAiUsageEvent
  );

  if (
    !openAiClient?.chat
      ?.completions ||
    typeof openAiClient.chat
      .completions.create !==
        "function"
  ) {
    throw new Error(
      "Brak poprawnego klienta OpenAI dla Generatora."
    );
  }

  const shouldGenerateGlossary =
    profiles.includes(
      "Obcojęzyczny"
    ) &&
    materialType ===
      "karta pracy";

  const shouldGenerateAdhdSupport =
    profiles.includes("ADHD");

  const sourceTopicIds =
    Array.isArray(sourceTopics)
      ? sourceTopics.map(
          (sourceTopic) =>
            sourceTopic?.id
        )
      : undefined;

  const materialResponseSchema =
    buildMaterialResponseSchema({
      materialType,
      taskPlan,
      shouldGenerateGlossary,
      shouldGenerateAdhdSupport,
      sourceTopicIds,
    });

  const materialPrompt =
    buildMaterialPrompt({
      topicTitle,
      materialType,
      taskPlan,
      sourceContext,
      sourceTopics,
      shouldGenerateAdhdSupport,
      shouldGenerateGlossary,
    });

  let requestAttempted = false;
  let aiUsage = null;

  try {
    requestAttempted = true;

    const materialCompletion =
      await openAiClient.chat
        .completions.create({
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

    aiUsage =
      getCompletionAiUsage(
        materialCompletion.usage
      );

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
        aiUsage
      );

    const material =
      parseGeneratedMaterial(
        materialMessage.content,
        {
          materialType,
          taskPlan,
          shouldGenerateGlossary,
          sourceTopicIds,
        }
      );

    await notifyAiUsageEvent({
      listener:
        onAiUsageEvent,

      event: {
        model:
          normalizedModel,

        status:
          "succeeded",

        usage:
          aiUsage,
      },
    });

    return {
      material,
      usage,
    };
  } catch (error) {
    if (requestAttempted) {
      await notifyAiUsageEvent({
        listener:
          onAiUsageEvent,

        event: {
          model:
            normalizedModel,

          status:
            "failed",

          usage:
            aiUsage,
        },
      });
    }

    throw error;
  }
}
