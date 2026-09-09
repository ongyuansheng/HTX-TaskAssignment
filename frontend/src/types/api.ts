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
  createdAt: string;
  updatedAt: string;
};

export type CreateTaskInput = {
  title: string;
  requiredSkillIds: string[];
};

export type UpdateTaskInput = {
  assignedDeveloperId?: string | null;
  status?: TaskStatus;
};
