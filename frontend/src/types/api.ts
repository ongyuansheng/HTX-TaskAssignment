export type TaskStatus = "TODO" | "IN_PROGRESS" | "DONE";

export type Skill = {
  id: string;
  name: string;
};

export type Developer = {
  id: string;
  name: string;
  skills: Skill[];
};

export type Task = {
  id: string;
  title: string;
  status: TaskStatus;
  assignedDeveloper: Pick<Developer, "id" | "name"> | null;
  requiredSkills: Skill[];
  parentTaskId: string | null;
  subtasks: Task[];
  createdAt: string;
  updatedAt: string;
};

export type CreateTaskInput = {
  title: string;
  requiredSkillIds: string[];
  subtasks: CreateTaskInput[];
};

// localId exists only while the nested form is being edited in the browser.
export type TaskDraft = {
  localId: string;
  title: string;
  requiredSkillIds: string[];
  subtasks: TaskDraft[];
};

export type UpdateTaskInput = {
  assignedDeveloperId?: string | null;
  status?: TaskStatus;
};
