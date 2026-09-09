import { apiRequest } from "./client";
import type { Skill } from "../types/api";

export function getSkills() {
  return apiRequest<Skill[]>("/skills");
}
