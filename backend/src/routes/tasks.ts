import { Router } from "express";
import { z } from "zod";
import { HttpError } from "../errors.js";
import { prisma } from "../lib/prisma.js";
import { PrismaTaskRepository } from "../repositories/prisma-task-repository.js";
import { TaskService } from "../services/task-service.js";

const router = Router();
const taskService = new TaskService(new PrismaTaskRepository());

const statusSchema = z.enum(["TODO", "IN_PROGRESS", "DONE"]);
const skillIdsSchema = z
  .array(z.uuid())
  .refine((skillIds) => new Set(skillIds).size === skillIds.length, {
    message: "requiredSkillIds must not contain duplicates",
  });

const createTaskSchema = z.object({
  title: z.string().trim().min(1, "title is required"),
  status: statusSchema.default("TODO"),
  requiredSkillIds: skillIdsSchema.default([]),
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
  status: string;
  createdAt: Date;
  updatedAt: Date;
  assignedDeveloper: { id: string; name: string } | null;
  requiredSkills: Array<{ skill: { id: string; name: string } }>;
};

function parseCreateTask(body: unknown) {
  const result = createTaskSchema.safeParse(body);

  if (!result.success) {
    throw new HttpError(
      400,
      result.error.issues.map((issue) => issue.message).join(", "),
    );
  }

  return result.data;
}

function parseUpdateTask(body: unknown) {
  const result = updateTaskSchema.safeParse(body);

  if (!result.success) {
    throw new HttpError(
      400,
      result.error.issues.map((issue) => issue.message).join(", "),
    );
  }

  return result.data;
}

function formatTask(task: TaskWithDetails) {
  return {
    id: task.id,
    title: task.title,
    status: task.status,
    assignedDeveloper: task.assignedDeveloper,
    requiredSkills: task.requiredSkills.map((requiredSkill) => requiredSkill.skill),
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
  };
}

async function ensureSkillsExist(skillIds: string[]) {
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

router.post("/", async (request, response) => {
  const input = parseCreateTask(request.body);
  await ensureSkillsExist(input.requiredSkillIds);

  const task = await prisma.task.create({
    data: {
      title: input.title,
      status: input.status,
      requiredSkills: {
        create: input.requiredSkillIds.map((skillId) => ({ skillId })),
      },
    },
    include: taskDetails,
  });

  response.status(201).json(formatTask(task));
});

router.get("/", async (_request, response) => {
  const tasks = await prisma.task.findMany({
    orderBy: { createdAt: "desc" },
    include: taskDetails,
  });

  response.json(tasks.map(formatTask));
});

router.get("/:id", async (request, response) => {
  const task = await prisma.task.findUnique({
    where: { id: request.params.id },
    include: taskDetails,
  });

  if (!task) {
    throw new HttpError(404, "Task not found");
  }

  response.json(formatTask(task));
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

  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: taskDetails,
  });

  if (!task) {
    throw new HttpError(404, "Task not found");
  }

  response.json(formatTask(task));
});

export default router;
