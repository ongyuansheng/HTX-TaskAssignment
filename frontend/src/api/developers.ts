import { apiRequest } from "./client";
import type { Developer } from "../types/api";

export function getDevelopers() {
  return apiRequest<Developer[]>("/developers");
}
