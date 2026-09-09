import type { TaskStatus } from "../types/api";

const labels: Record<TaskStatus, string> = {
  TODO: "To do",
  IN_PROGRESS: "In progress",
  DONE: "Done",
};

export function getStatusLabel(status: TaskStatus) {
  return labels[status];
}
