import { z } from "zod";
import { HttpError } from "../errors.js";
import { logger } from "../lib/logger.js";
import {
  supportedSkillNames,
  type SkillClassifier,
  type SkillName,
} from "./task-skill-service.js";

type FetchFunction = (input: string, init?: RequestInit) => Promise<Response>;

// Treat the external response as untrusted input.
const geminiResponseSchema = z.object({
  candidates: z
    .array(
      z.object({
        content: z.object({
          parts: z.array(z.object({ text: z.string() })).min(1),
        }),
      }),
    )
    .min(1),
});

const skillNamesSchema = z.array(z.enum(supportedSkillNames)).min(1);

export class GeminiSkillClassifier implements SkillClassifier {
  constructor(
    private readonly apiKey = process.env.GEMINI_API_KEY,
    private readonly model = process.env.GEMINI_MODEL ?? "gemini-3.6-flash",
    // Injecting fetch keeps HTTP behaviour easy to test without Gemini.
    private readonly fetchFunction: FetchFunction = fetch,
  ) {}

  async identifySkills(title: string): Promise<SkillName[]> {
    if (!this.apiKey) {
      logger.warn("skill_identification_not_configured");
      throw new HttpError(503, "Skill identification is not configured");
    }

    let response: Response;

    try {
      logger.info("skill_identification_started", { model: this.model });
      const url = new URL(
        `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent`,
      );
      url.searchParams.set("key", this.apiKey);

      response = await this.fetchFunction(url.toString(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: createPrompt(title) }] }],
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0,
          },
        }),
        signal: AbortSignal.timeout(10_000),
      });
    } catch (error) {
      logger.warn("skill_identification_failed", {
        reason: "provider_unreachable",
        errorName: error instanceof Error ? error.name : "UnknownError",
      });
      throw new HttpError(502, "Unable to identify task skills");
    }

    if (!response.ok) {
      logger.warn("skill_identification_failed", {
        reason: "provider_rejected_request",
        status: response.status,
      });
      throw new HttpError(502, "Unable to identify task skills");
    }

    try {
      const responseBody = geminiResponseSchema.parse(await response.json());
      const responseText = responseBody.candidates[0].content.parts[0].text;
      const skillNames = skillNamesSchema.parse(JSON.parse(responseText));

      const uniqueSkillNames = [...new Set(skillNames)];
      logger.info("skill_identification_succeeded", { skills: uniqueSkillNames });
      return uniqueSkillNames;
    } catch (error) {
      logger.warn("skill_identification_failed", {
        reason: "invalid_provider_response",
        errorName: error instanceof Error ? error.name : "UnknownError",
      });
      throw new HttpError(502, "Unable to identify task skills");
    }
  }
}

function createPrompt(title: string) {
  return [
    "Classify this software engineering task using only these skills: Frontend, Backend.",
    "Return a JSON array with one or both exact skill names. Do not include an explanation.",
    `Task title: ${JSON.stringify(title)}`,
  ].join("\n");
}
