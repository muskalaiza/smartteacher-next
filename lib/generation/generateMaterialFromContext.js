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

export async function generateMaterialFromContext({
  topic,
  type,
  profiles,
  taskPlan,
  ragContext,
}) {
  const shouldGenerateGlossary =
    profiles.includes("Obcojęzyczny") &&
    type === "karta pracy";

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
      topic,
      type,
      profile: profiles.join(", "),
      taskPlan,
      ragContext,
      shouldGenerateGlossary,
    });

  const materialCompletion =
    await openai.chat.completions.create({
      model: "gpt-4o-mini",

      response_format: {
        type: "json_schema",

        json_schema: {
          name: "smartteacher_material",
          strict: true,
          schema: materialResponseSchema,
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
          content: materialPrompt,
        },
      ],

      temperature: 0.2,
    });

  const materialChoice =
    materialCompletion.choices?.[0];

  const materialMessage =
    materialChoice?.message;

  if (!materialChoice || !materialMessage) {
    throw new Error(
      "Model nie zwrócił kompletnej odpowiedzi dla materiału."
    );
  }

  if (materialChoice.finish_reason !== "stop") {
    throw new Error(
      `Generowanie materiału nie zostało prawidłowo zakończone. Powód: ${
        materialChoice.finish_reason ||
        "[brak]"
      }.`
    );
  }

  if (materialMessage.refusal) {
    const refusalError = new Error(
      `Model odmówił wygenerowania materiału: ${materialMessage.refusal}`
    );

    refusalError.name =
      "ModelRefusalError";

    throw refusalError;
  }

  if (!materialMessage.content) {
    throw new Error(
      "Model nie zwrócił treści materiału."
    );
  }

  return parseGeneratedMaterial(
    materialMessage.content,
    taskPlan
  );
}
