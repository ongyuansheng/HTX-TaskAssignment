import { Router } from "express";
import { HttpError } from "../errors.js";
import { prisma } from "../lib/prisma.js";

const router = Router();

router.get("/", async (_request, response) => {
  const skills = await prisma.skill.findMany({
    orderBy: { name: "asc" },
  });

  response.json(skills);
});

router.get("/:id", async (request, response) => {
  const skill = await prisma.skill.findUnique({
    where: { id: request.params.id },
    include: {
      developerSkills: {
        include: { developer: true },
      },
      taskSkills: {
        include: { task: true },
      },
    },
  });

  if (!skill) {
    throw new HttpError(404, "Skill not found");
  }

  response.json({
    id: skill.id,
    name: skill.name,
    developers: skill.developerSkills.map((developerSkill) => developerSkill.developer),
    tasks: skill.taskSkills.map((taskSkill) => ({
      id: taskSkill.task.id,
      title: taskSkill.task.title,
      status: taskSkill.task.status,
    })),
  });
});

export default router;
