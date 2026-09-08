import { HttpError } from "../errors.js";

export type TaskStatus = "TODO" | "IN_PROGRESS" | "DONE";

export type TaskForUpdate = {
  id: string;
  status: TaskStatus;
  assignedDeveloperId: string | null;
  requiredSkillIds: string[];
};

export type DeveloperForAssignment = {
  id: string;
  skillIds: string[];
};

export interface TaskRepository {
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
    task.status = status;
    return this.repository.saveTask(task);
  }

  private async getTask(taskId: string) {
    const task = await this.repository.findTaskById(taskId);

    if (!task) {
      throw new HttpError(404, "Task not found");
    }

    return task;
  }
}
