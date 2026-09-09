import { describe, expect, it, vi } from "vitest";
import { HttpError } from "../../src/errors.js";
import {
  identifyMissingSkills,
  type SkillClassifier,
  type TaskCreationInput,
} from "../../src/services/task-skill-service.js";

const skillIdsByName = new Map([
  ["Frontend", "skill-frontend"],
  ["Backend", "skill-backend"],
]);

function createTask(overrides: Partial<TaskCreationInput> = {}): TaskCreationInput {
  return {
    title: "Build a profile page",
    status: "TODO",
    requiredSkillIds: [],
    subtasks: [],
    ...overrides,
  };
}

describe("identifyMissingSkills", () => {
  it("adds inferred skills to a task with no selected skills", async () => {
    const classifier: SkillClassifier = {
      identifySkills: vi.fn().mockResolvedValue(["Frontend"]),
    };

    const task = await identifyMissingSkills(createTask(), skillIdsByName, classifier);

    expect(task.requiredSkillIds).toEqual(["skill-frontend"]);
    expect(classifier.identifySkills).toHaveBeenCalledWith("Build a profile page");
  });

  it("does not call the classifier when the user selected skills", async () => {
    const classifier: SkillClassifier = {
      identifySkills: vi.fn(),
    };

    const task = await identifyMissingSkills(
      createTask({ requiredSkillIds: ["skill-frontend"] }),
      skillIdsByName,
      classifier,
    );

    expect(task.requiredSkillIds).toEqual(["skill-frontend"]);
    expect(classifier.identifySkills).not.toHaveBeenCalled();
  });

  it("classifies every task and nested subtask without selected skills", async () => {
    const classifier: SkillClassifier = {
      identifySkills: vi
        .fn()
        .mockResolvedValueOnce(["Frontend", "Backend"])
        .mockResolvedValueOnce(["Frontend"])
        .mockResolvedValueOnce(["Backend"]),
    };

    const task = await identifyMissingSkills(
      createTask({
        subtasks: [
          createTask({
            title: "Build the settings form",
            requiredSkillIds: ["skill-frontend"],
          }),
          createTask({
            title: "Add an audit log endpoint",
            subtasks: [createTask({ title: "Create the audit log table" })],
          }),
        ],
      }),
      skillIdsByName,
      classifier,
    );

    expect(classifier.identifySkills).toHaveBeenCalledTimes(3);
    expect(task.requiredSkillIds).toEqual(["skill-frontend", "skill-backend"]);
    expect(task.subtasks[0]?.requiredSkillIds).toEqual(["skill-frontend"]);
    expect(task.subtasks[1]?.requiredSkillIds).toEqual(["skill-frontend"]);
    expect(task.subtasks[1]?.subtasks[0]?.requiredSkillIds).toEqual(["skill-backend"]);
  });

  it("stops creation when the classifier fails", async () => {
    const classifier: SkillClassifier = {
      identifySkills: vi.fn().mockRejectedValue(new HttpError(502, "Unable to identify task skills")),
    };

    await expect(identifyMissingSkills(createTask(), skillIdsByName, classifier)).rejects.toThrow(
      "Unable to identify task skills",
    );
  });
});
