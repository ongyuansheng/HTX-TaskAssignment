import { describe, expect, it, vi } from "vitest";
import { GeminiSkillClassifier } from "../../src/services/gemini-skill-classifier.js";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("GeminiSkillClassifier", () => {
  it("returns the skills from Gemini's JSON response", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        candidates: [
          {
            content: {
              parts: [{ text: '["Frontend", "Backend"]' }],
            },
          },
        ],
      }),
    );
    const classifier = new GeminiSkillClassifier("test-api-key", "test-model", fetchMock);

    await expect(classifier.identifySkills("Build a profile page")).resolves.toEqual([
      "Frontend",
      "Backend",
    ]);
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("returns a safe error when Gemini responds with an error", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ error: { message: "Invalid key" } }, 401));
    const classifier = new GeminiSkillClassifier("test-api-key", "test-model", fetchMock);

    await expect(classifier.identifySkills("Build a profile page")).rejects.toThrow(
      "Unable to identify task skills",
    );
  });

  it("returns a safe error when Gemini cannot be reached", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("Network unavailable"));
    const classifier = new GeminiSkillClassifier("test-api-key", "test-model", fetchMock);

    await expect(classifier.identifySkills("Build a profile page")).rejects.toThrow(
      "Unable to identify task skills",
    );
  });

  it("rejects a model response containing unsupported skills", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        candidates: [
          {
            content: {
              parts: [{ text: '["DevOps"]' }],
            },
          },
        ],
      }),
    );
    const classifier = new GeminiSkillClassifier("test-api-key", "test-model", fetchMock);

    await expect(classifier.identifySkills("Deploy the service")).rejects.toThrow(
      "Unable to identify task skills",
    );
  });
});
