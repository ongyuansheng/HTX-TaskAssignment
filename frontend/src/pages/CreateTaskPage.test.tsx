import { afterEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CreateTaskPage } from "./CreateTaskPage";
import { renderWithProviders } from "../test/test-utils";

const skills = [
  { id: "skill-frontend", name: "Frontend" },
  { id: "skill-backend", name: "Backend" },
];

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("CreateTaskPage", () => {
  it("requires a task title before submitting", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(skills));
    vi.stubGlobal("fetch", fetchMock);

    renderWithProviders(<CreateTaskPage />);

    await screen.findByRole("checkbox", { name: "Frontend" });
    await user.click(screen.getByRole("button", { name: "Save task" }));

    expect(await screen.findByText("Enter a task title.")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("creates a task with the selected skill IDs", async () => {
    const user = userEvent.setup();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(skills))
      .mockResolvedValueOnce(
        jsonResponse({
          id: "task-1",
          title: "Build a profile page",
          requiredSkills: [skills[0]],
          status: "TODO",
          assignedDeveloper: null,
        }, 201),
      );
    vi.stubGlobal("fetch", fetchMock);

    renderWithProviders(<CreateTaskPage />);

    await screen.findByRole("checkbox", { name: "Frontend" });
    await user.type(screen.getByLabelText("Task title"), "Build a profile page");
    await user.click(screen.getByRole("checkbox", { name: "Frontend" }));
    await user.click(screen.getByRole("button", { name: "Save task" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenLastCalledWith("http://localhost:3000/tasks", {
        method: "POST",
        body: JSON.stringify({
          title: "Build a profile page",
          requiredSkillIds: ["skill-frontend"],
        }),
        headers: { "Content-Type": "application/json" },
      });
    });
  });
});
