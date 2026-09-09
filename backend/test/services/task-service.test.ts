import { beforeEach, describe, expect, it } from "vitest";
import { TaskService, validateNewTaskStatuses } from "../../src/services/task-service.js";
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
            parentTaskId: null,
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

  it("rejects marking a task as done when a subtask is unfinished", async () => {
    repository.setSubtaskStatuses(taskId, ["DONE", "IN_PROGRESS"]);

    await expect(taskService.changeStatus(taskId, "DONE")).rejects.toThrow(
      "A task cannot be marked as done until all subtasks are done",
    );
  });

  it("marks a task as done when every subtask is done", async () => {
    repository.setSubtaskStatuses(taskId, ["DONE", "DONE"]);

    const task = await taskService.changeStatus(taskId, "DONE");

    expect(task.status).toBe("DONE");
  });

  it("reopens completed parent tasks when a child is reopened", async () => {
    repository.setTaskStatus(taskId, "DONE");
    repository.addTask({
      id: "subtask",
      title: "Build the form",
      status: "DONE",
      parentTaskId: taskId,
      assignedDeveloperId: null,
      requiredSkillIds: ["frontend"],
    });
    repository.addTask({
      id: "nested-subtask",
      title: "Validate the form",
      status: "DONE",
      parentTaskId: "subtask",
      assignedDeveloperId: null,
      requiredSkillIds: ["frontend"],
    });

    await taskService.changeStatus("nested-subtask", "IN_PROGRESS");

    expect((await repository.findTaskById("subtask"))?.status).toBe("IN_PROGRESS");
    expect((await repository.findTaskById(taskId))?.status).toBe("IN_PROGRESS");
  });
});

describe("validateNewTaskStatuses", () => {
  it("rejects creating a done task with an unfinished subtask", () => {
    expect(() =>
      validateNewTaskStatuses({
        status: "DONE",
        subtasks: [{ status: "TODO", subtasks: [] }],
      }),
    ).toThrow("A task cannot be marked as done until all subtasks are done");
  });

  it("checks the status rule at every nesting level", () => {
    expect(() =>
      validateNewTaskStatuses({
        status: "TODO",
        subtasks: [
          {
            status: "DONE",
            subtasks: [{ status: "IN_PROGRESS", subtasks: [] }],
          },
        ],
      }),
    ).toThrow("A task cannot be marked as done until all subtasks are done");
  });

  it("allows a done task tree when every subtask is done", () => {
    expect(() =>
      validateNewTaskStatuses({
        status: "DONE",
        subtasks: [
          {
            status: "DONE",
            subtasks: [{ status: "DONE", subtasks: [] }],
          },
        ],
      }),
    ).not.toThrow();
  });
});
