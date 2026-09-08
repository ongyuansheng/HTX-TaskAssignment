import { prisma } from "../lib/prisma.js";
import type {
  DeveloperForAssignment,
  TaskForUpdate,
  TaskRepository,
} from "../services/task-service.js";

export class PrismaTaskRepository implements TaskRepository {
  async findTaskById(id: string): Promise<TaskForUpdate | null> {
    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        requiredSkills: {
          select: { skillId: true },
        },
      },
    });

    if (!task) {
      return null;
    }

    return {
      id: task.id,
      status: task.status,
      assignedDeveloperId: task.assignedDeveloperId,
      requiredSkillIds: task.requiredSkills.map((requiredSkill) => requiredSkill.skillId),
    };
  }

  async findDeveloperById(id: string): Promise<DeveloperForAssignment | null> {
    const developer = await prisma.developer.findUnique({
      where: { id },
      include: {
        developerSkills: {
          select: { skillId: true },
        },
      },
    });

    if (!developer) {
      return null;
    }

    return {
      id: developer.id,
      skillIds: developer.developerSkills.map((developerSkill) => developerSkill.skillId),
    };
  }

  async saveTask(task: TaskForUpdate): Promise<TaskForUpdate> {
    await prisma.task.update({
      where: { id: task.id },
      data: {
        status: task.status,
        assignedDeveloperId: task.assignedDeveloperId,
      },
    });

    return task;
  }
}
