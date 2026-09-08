export type TestTask = {
  id: string;
  title: string;
  status: "TODO" | "IN_PROGRESS" | "DONE";
  assignedDeveloperId: string | null;
  requiredSkillIds: string[];
};

export type TestDeveloper = {
  id: string;
  name: string;
  skillIds: string[];
};

export class FakeTaskRepository {
  constructor(
    private readonly tasks: Map<string, TestTask>,
    private readonly developers: Map<string, TestDeveloper>,
  ) {}

  async findTaskById(id: string) {
    return this.tasks.get(id) ?? null;
  }

  async findDeveloperById(id: string) {
    return this.developers.get(id) ?? null;
  }

  async saveTask(task: TestTask) {
    this.tasks.set(task.id, task);
    return task;
  }
}
