import { Router } from "express";
import { z } from "zod";
import { Prisma } from "../../generated/prisma/client.js";
import { HttpError } from "../errors.js";
import { logger } from "../lib/logger.js";
import { prisma } from "../lib/prisma.js";
import { PrismaTaskRepository } from "../repositories/prisma-task-repository.js";
import { GeminiSkillClassifier } from "../services/gemini-skill-classifier.js";
import { TaskService, validateNewTaskStatuses } from "../services/task-service.js";
import {
  identifyMissingSkills,
  supportedSkillNames,
  type SkillName,
  type TaskCreationInput,
} from "../services/task-skill-service.js";

const router = Router();
const taskService = new TaskService(new PrismaTaskRepository());
const skillClassifier = new GeminiSkillClassifier();

const statusSchema = z.enum(["TODO", "IN_PROGRESS", "DONE"]);
const skillIdsSchema = z
  .array(z.uuid())
  .refine((skillIds) => new Set(skillIds).size === skillIds.length, {
    message: "requiredSkillIds must not contain duplicates",
  });

const createTaskSchema: z.ZodType<TaskCreationInput> = z.object({
  title: z.string().trim().min(1, "title is required"),
  status: statusSchema.default("TODO"),
  requiredSkillIds: skillIdsSchema.default([]),
  subtasks: z.array(z.lazy(() => createTaskSchema)).default([]),
});

const updateTaskSchema = z
  .object({
    assignedDeveloperId: z.uuid().nullable().optional(),
    status: statusSchema.optional(),
  })
  .refine(
    (update) => update.assignedDeveloperId !== undefined || update.status !== undefined,
    { message: "Provide assignedDeveloperId and/or status" },
  );

const taskDetails = {
  assignedDeveloper: {
    select: { id: true, name: true },
  },
  requiredSkills: {
    include: {
      skill: {
        select: { id: true, name: true },
      },
    },
  },
} as const;

type TaskWithDetails = {
  id: string;
  title: string;
  status: "TODO" | "IN_PROGRESS" | "DONE";
  parentTaskId: string | null;
  createdAt: Date;
  updatedAt: Date;
  assignedDeveloper: { id: string; name: string } | null;
  requiredSkills: Array<{ skill: { id: string; name: string } }>;
};

type TaskResponse = {
  id: string;
  title: string;
  status: "TODO" | "IN_PROGRESS" | "DONE";
  parentTaskId: string | null;
  assignedDeveloper: { id: string; name: string } | null;
  requiredSkills: Array<{ id: string; name: string }>;
  createdAt: Date;
  updatedAt: Date;
  subtasks: TaskResponse[];
};

function parseCreateTask(body: unknown) {
  const result = createTaskSchema.safeParse(body);

  if (!result.success) {
    throw new HttpError(400, result.error.issues.map((issue) => issue.message).join(", "));
  }

  return result.data;
}

function parseUpdateTask(body: unknown) {
  const result = updateTaskSchema.safeParse(body);

  if (!result.success) {
    throw new HttpError(400, result.error.issues.map((issue) => issue.message).join(", "));
  }

  return result.data;
}

function formatTask(task: TaskWithDetails): TaskResponse {
  return {
    id: task.id,
    title: task.title,
    status: task.status,
    parentTaskId: task.parentTaskId,
    assignedDeveloper: task.assignedDeveloper,
    requiredSkills: task.requiredSkills.map((requiredSkill) => requiredSkill.skill),
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
    subtasks: [],
  };
}

function buildTaskTree(tasks: TaskWithDetails[]) {
  const taskById = new Map(tasks.map((task) => [task.id, formatTask(task)]));
  const rootTasks: TaskResponse[] = [];

  // Prisma returns a flat list here. Linking it in memory supports any nesting depth.
  for (const task of tasks) {
    const response = taskById.get(task.id);

    if (!response) {
      continue;
    }

    const parent = task.parentTaskId ? taskById.get(task.parentTaskId) : undefined;
    if (parent) {
      parent.subtasks.push(response);
    } else {
      rootTasks.push(response);
    }
  }

  return rootTasks;
}

function collectSkillIds(task: TaskCreationInput): string[] {
  return [
    ...task.requiredSkillIds,
    ...task.subtasks.flatMap((subtask) => collectSkillIds(subtask)),
  ];
}

async function ensureSkillsExist(task: TaskCreationInput) {
  const skillIds = [...new Set(collectSkillIds(task))];

  if (skillIds.length === 0) {
    return;
  }

  const count = await prisma.skill.count({
    where: { id: { in: skillIds } },
  });

  if (count !== skillIds.length) {
    throw new HttpError(400, "One or more required skills do not exist");
  }
}

async function getSkillIdsByName() {
  // Gemini returns skill names; task relations store database IDs.
  const skills = await prisma.skill.findMany({
    where: { name: { in: [...supportedSkillNames] } },
    select: { id: true, name: true },
  });

  return new Map(skills.map((skill) => [skill.name as SkillName, skill.id]));
}

function buildTaskData(task: TaskCreationInput): Prisma.TaskCreateInput {
  return {
    title: task.title,
    status: task.status,
    requiredSkills: {
      create: task.requiredSkillIds.map((skillId) => ({ skillId })),
    },
    subtasks: {
      create: task.subtasks.map((subtask) => buildTaskData(subtask)),
    },
  };
}

async function findTaskWithDirectSubtasks(taskId: string) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: taskDetails,
  });

  if (!task) {
    throw new HttpError(404, "Task not found");
  }

  const subtasks = await prisma.task.findMany({
    where: { parentTaskId: task.id },
    orderBy: { createdAt: "asc" },
    include: taskDetails,
  });

  const response = formatTask(task);
  response.subtasks = subtasks.map((subtask) => formatTask(subtask));
  return response;
}

router.post("/", async (request, response) => {
  const input = parseCreateTask(request.body);

  // Reject invalid input before querying the LLM or writing to the database.
  validateNewTaskStatuses(input);
  await ensureSkillsExist(input);
  const taskWithSkills = await identifyMissingSkills(
    input,
    await getSkillIdsByName(),
    skillClassifier,
  );

  const task = await prisma.task.create({
    data: buildTaskData(taskWithSkills),
  });

  logger.info("task_created", { taskId: task.id });
  response.status(201).json(await findTaskWithDirectSubtasks(task.id));
});

router.get("/", async (_request, response) => {
  const tasks = await prisma.task.findMany({
    orderBy: { createdAt: "desc" },
    include: taskDetails,
  });

  response.json(buildTaskTree(tasks));
});

router.get("/:id", async (request, response) => {
  response.json(await findTaskWithDirectSubtasks(request.params.id));
});

router.patch("/:id", async (request, response) => {
  const input = parseUpdateTask(request.body);
  const taskId = request.params.id;

  if (input.assignedDeveloperId !== undefined) {
    if (input.assignedDeveloperId === null) {
      await taskService.clearDeveloper(taskId);
    } else {
      await taskService.assignDeveloper(taskId, input.assignedDeveloperId);
    }
  }

  if (input.status !== undefined) {
    await taskService.changeStatus(taskId, input.status);
  }

  response.json(await findTaskWithDirectSubtasks(taskId));
});

export default router;
