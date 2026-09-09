import { HttpError } from "../errors.js";
import type { TaskStatus } from "./task-service.js";

export const supportedSkillNames = ["Frontend", "Backend"] as const;

export type SkillName = (typeof supportedSkillNames)[number];

export type TaskCreationInput = {
  title: string;
  status: TaskStatus;
  requiredSkillIds: string[];
  subtasks: TaskCreationInput[];
};

export interface SkillClassifier {
  identifySkills(title: string): Promise<SkillName[]>;
}

// Keep user-selected skills and classify only the empty nodes in the tree.
export async function identifyMissingSkills(
  task: TaskCreationInput,
  skillIdsByName: Map<SkillName, string>,
  classifier: SkillClassifier,
): Promise<TaskCreationInput> {
  // checks if user has selected any skills, only classify with a LLM when none are provided
  const requiredSkillIds =
    task.requiredSkillIds.length > 0
      ? task.requiredSkillIds
      : await identifySkillIds(task.title, skillIdsByName, classifier);

  const subtasks = await Promise.all(
    task.subtasks.map((subtask) => identifyMissingSkills(subtask, skillIdsByName, classifier)),
  );

  return { ...task, requiredSkillIds, subtasks };
}

async function identifySkillIds(
  title: string,
  skillIdsByName: Map<SkillName, string>,
  classifier: SkillClassifier,
) {
  const skillNames = [...new Set(await classifier.identifySkills(title))];

  if (skillNames.length === 0) {
    throw new HttpError(502, "Unable to identify task skills");
  }

  return skillNames.map((skillName) => {
    const skillId = skillIdsByName.get(skillName);

    if (!skillId) {
      throw new HttpError(500, `The ${skillName} skill is missing from the database`);
    }

    return skillId;
  });
}
