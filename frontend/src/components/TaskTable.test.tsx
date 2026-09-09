import { afterEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TaskTable } from "./TaskTable";
import { renderWithProviders } from "../test/test-utils";
import type { Developer, Task } from "../types/api";

const frontendSkill = { id: "skill-frontend", name: "Frontend" };
const backendSkill = { id: "skill-backend", name: "Backend" };

const developers: Developer[] = [
  { id: "alice", name: "Alice", skills: [frontendSkill] },
  { id: "bob", name: "Bob", skills: [backendSkill] },
  { id: "carol", name: "Carol", skills: [frontendSkill, backendSkill] },
];

const task: Task = {
  id: "task-1",
  title: "Build a profile page",
  status: "TODO",
  assignedDeveloper: null,
  requiredSkills: [frontendSkill, backendSkill],
  createdAt: "2026-09-08T00:00:00.000Z",
  updatedAt: "2026-09-08T00:00:00.000Z",
};

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("TaskTable", () => {
  it("only offers developers with every required skill", () => {
    renderWithProviders(<TaskTable tasks={[task]} developers={developers} />);

    const assigneeSelect = screen.getByLabelText("Assignee for Build a profile page");

    expect(assigneeSelect).toHaveTextContent("Carol");
    expect(assigneeSelect).not.toHaveTextContent("Alice");
    expect(assigneeSelect).not.toHaveTextContent("Bob");
  });

  it("sends a task status update to the API", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ ...task, status: "IN_PROGRESS" }));
    vi.stubGlobal("fetch", fetchMock);

    renderWithProviders(<TaskTable tasks={[task]} developers={developers} />);

    await user.selectOptions(screen.getByLabelText("Status for Build a profile page"), "IN_PROGRESS");

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("http://localhost:3000/tasks/task-1", {
        method: "PATCH",
        body: JSON.stringify({ status: "IN_PROGRESS" }),
        headers: { "Content-Type": "application/json" },
      });
    });
  });
});
