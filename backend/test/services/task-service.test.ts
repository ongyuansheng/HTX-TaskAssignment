import { beforeEach, describe, expect, it } from "vitest";
import { TaskService } from "../../src/services/task-service.js";
import { FakeTaskRepository } from "../helpers/fake-task-repository.js";

describe("TaskService", () => {
  const taskId = "task-frontend-backend";
  let repository: FakeTaskRepository;
  let taskService: TaskService;

  beforeEach(() => {
    repository = new FakeTaskRepository(
      new Map([
        [
          taskId,
          {
            id: taskId,
            title: "Build a responsive homepage",
            status: "TODO",
            assignedDeveloperId: null,
            requiredSkillIds: ["frontend", "backend"],
          },
        ],
      ]),
      new Map([
        [
          "alice",
          {
            id: "alice",
            name: "Alice",
            skillIds: ["frontend"],
          },
        ],
        [
          "carol",
          {
            id: "carol",
            name: "Carol",
            skillIds: ["frontend", "backend"],
          },
        ],
      ]),
    );

    taskService = new TaskService(repository);
  });

  it("assigns a task when the developer has every required skill", async () => {
    const task = await taskService.assignDeveloper(taskId, "carol");

    expect(task.assignedDeveloperId).toBe("carol");
  });

  it("rejects assignment when the developer is missing a required skill", async () => {
    await expect(taskService.assignDeveloper(taskId, "alice")).rejects.toThrow(
      "Developer does not have all required skills",
    );

    const task = await repository.findTaskById(taskId);
    expect(task?.assignedDeveloperId).toBeNull();
  });

  it("changes a task status", async () => {
    const task = await taskService.changeStatus(taskId, "DONE");

    expect(task.status).toBe("DONE");
  });
});
