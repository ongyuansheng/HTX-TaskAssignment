export type TestTask = {
  id: string;
  title: string;
  status: "TODO" | "IN_PROGRESS" | "DONE";
  parentTaskId: string | null;
  assignedDeveloperId: string | null;
  requiredSkillIds: string[];
};

export type TestDeveloper = {
  id: string;
  name: string;
  skillIds: string[];
};

export class FakeTaskRepository {
  private readonly subtaskStatuses = new Map<string, TestTask["status"][]>();

  constructor(
    private readonly tasks: Map<string, TestTask>,
    private readonly developers: Map<string, TestDeveloper>,
  ) {}

  async findTaskById(id: string) {
    const task = this.tasks.get(id);

    if (!task) {
      return null;
    }

    return {
      ...task,
      subtaskStatuses: this.subtaskStatuses.get(id) ?? [],
    };
  }

  setSubtaskStatuses(taskId: string, statuses: TestTask["status"][]) {
    this.subtaskStatuses.set(taskId, statuses);
  }

  addTask(task: TestTask) {
    this.tasks.set(task.id, task);
  }

  setTaskStatus(taskId: string, status: TestTask["status"]) {
    const task = this.tasks.get(taskId);

    if (task) {
      task.status = status;
    }
  }

  async findDeveloperById(id: string) {
    return this.developers.get(id) ?? null;
  }

  async saveTask(task: TestTask) {
    this.tasks.set(task.id, task);
    return task;
  }
}
