import { Router } from "express";
import { HttpError } from "../errors.js";
import { prisma } from "../lib/prisma.js";

const router = Router();

router.get("/", async (_request, response) => {
  const developers = await prisma.developer.findMany({
    orderBy: { name: "asc" },
    include: {
      developerSkills: {
        include: { skill: true },
      },
    },
  });

  response.json(
    developers.map((developer) => ({
      id: developer.id,
      name: developer.name,
      skills: developer.developerSkills.map((developerSkill) => developerSkill.skill),
    })),
  );
});

router.get("/:id", async (request, response) => {
  const developer = await prisma.developer.findUnique({
    where: { id: request.params.id },
    include: {
      developerSkills: {
        include: { skill: true },
      },
      assignedTasks: {
        include: {
          requiredSkills: {
            include: { skill: true },
          },
        },
      },
    },
  });

  if (!developer) {
    throw new HttpError(404, "Developer not found");
  }

  response.json({
    id: developer.id,
    name: developer.name,
    skills: developer.developerSkills.map((developerSkill) => developerSkill.skill),
    assignedTasks: developer.assignedTasks.map((task) => ({
      id: task.id,
      title: task.title,
      status: task.status,
      requiredSkills: task.requiredSkills.map((requiredSkill) => requiredSkill.skill),
    })),
  });
});

export default router;
