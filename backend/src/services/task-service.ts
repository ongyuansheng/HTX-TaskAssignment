import { HttpError } from "../errors.js";

export type TaskStatus = "TODO" | "IN_PROGRESS" | "DONE";

export type TaskForUpdate = {
  id: string;
  status: TaskStatus;
  assignedDeveloperId: string | null;
  parentTaskId: string | null;
  requiredSkillIds: string[];
  subtaskStatuses: TaskStatus[];
};

export type DeveloperForAssignment = {
  id: string;
  skillIds: string[];
};

export type TaskForCreation = {
  status: TaskStatus;
  subtasks: TaskForCreation[];
};

export function validateNewTaskStatuses(task: TaskForCreation) {
  if (task.status === "DONE" && task.subtasks.some((subtask) => subtask.status !== "DONE")) {
    throw new HttpError(400, "A task cannot be marked as done until all subtasks are done");
  }

  for (const subtask of task.subtasks) {
    validateNewTaskStatuses(subtask);
  }
}

export interface TaskRepository {
  // This boundary lets task rules run in tests without a database.
  findTaskById(id: string): Promise<TaskForUpdate | null>;
  findDeveloperById(id: string): Promise<DeveloperForAssignment | null>;
  saveTask(task: TaskForUpdate): Promise<TaskForUpdate>;
}

export class TaskService {
  constructor(private readonly repository: TaskRepository) {}

  async assignDeveloper(taskId: string, developerId: string) {
    const task = await this.getTask(taskId);
    const developer = await this.repository.findDeveloperById(developerId);

    if (!developer) {
      throw new HttpError(404, "Developer not found");
    }

    const hasAllRequiredSkills = task.requiredSkillIds.every((skillId) =>
      developer.skillIds.includes(skillId),
    );

    if (!hasAllRequiredSkills) {
      throw new HttpError(400, "Developer does not have all required skills");
    }

    task.assignedDeveloperId = developer.id;
    return this.repository.saveTask(task);
  }

  async clearDeveloper(taskId: string) {
    const task = await this.getTask(taskId);
    task.assignedDeveloperId = null;
    return this.repository.saveTask(task);
  }

  async changeStatus(taskId: string, status: TaskStatus) {
    const task = await this.getTask(taskId);

    // Checking direct children is enough: each child must pass this same rule too.
    if (status === "DONE" && task.subtaskStatuses.some((subtaskStatus) => subtaskStatus !== "DONE")) {
      throw new HttpError(400, "A task cannot be marked as done until all subtasks are done");
    }

    task.status = status;
    const updatedTask = await this.repository.saveTask(task);

    if (status !== "DONE") {
      await this.reopenDoneParents(task.parentTaskId);
    }

    return updatedTask;
  }

  private async reopenDoneParents(parentTaskId: string | null) {
    let currentParentId = parentTaskId;

    // A reopened child means every completed ancestor is no longer complete.
    while (currentParentId) {
      const parent = await this.getTask(currentParentId);

      if (parent.status === "DONE") {
        parent.status = "IN_PROGRESS";
        await this.repository.saveTask(parent);
      }

      currentParentId = parent.parentTaskId;
    }
  }

  private async getTask(taskId: string) {
    const task = await this.repository.findTaskById(taskId);

    if (!task) {
      throw new HttpError(404, "Task not found");
    }

    return task;
  }
}
