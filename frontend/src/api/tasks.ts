import { apiRequest } from "./client";
import type { CreateTaskInput, Task, UpdateTaskInput } from "../types/api";

export function getTasks() {
  return apiRequest<Task[]>("/tasks");
}

export function createTask(input: CreateTaskInput) {
  return apiRequest<Task>("/tasks", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateTask(taskId: string, input: UpdateTaskInput) {
  return apiRequest<Task>(`/tasks/${taskId}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}
