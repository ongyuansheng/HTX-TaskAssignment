import { Fragment, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";
import { getSkills } from "../api/skills";
import { createTask } from "../api/tasks";
import { TaskFormNode } from "../components/TaskFormNode";
import type { CreateTaskInput, TaskDraft } from "../types/api";

let nextDraftId = 0;

function createEmptyTask(): TaskDraft {
  nextDraftId += 1;

  return {
    localId: `task-draft-${nextDraftId}`,
    title: "",
    requiredSkillIds: [],
    subtasks: [],
  };
}

const createTaskSchema: z.ZodType<CreateTaskInput> = z.object({
  title: z.string().trim().min(1, "Enter a task title."),
  requiredSkillIds: z.array(z.string()),
  subtasks: z.array(z.lazy(() => createTaskSchema)),
});

function updateTaskDraft(
  task: TaskDraft,
  taskId: string,
  update: (task: TaskDraft) => TaskDraft,
): TaskDraft {
  if (task.localId === taskId) {
    return update(task);
  }

  return {
    ...task,
    subtasks: task.subtasks.map((subtask) => updateTaskDraft(subtask, taskId, update)),
  };
}

function removeTaskDraft(task: TaskDraft, taskId: string): TaskDraft {
  return {
    ...task,
    subtasks: task.subtasks
      .filter((subtask) => subtask.localId !== taskId)
      .map((subtask) => removeTaskDraft(subtask, taskId)),
  };
}

function toCreateTaskInput(task: TaskDraft): CreateTaskInput {
  return {
    title: task.title,
    requiredSkillIds: task.requiredSkillIds,
    subtasks: task.subtasks.map((subtask) => toCreateTaskInput(subtask)),
  };
}

export function CreateTaskPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const skillsQuery = useQuery({ queryKey: ["skills"], queryFn: getSkills });
  const [taskDraft, setTaskDraft] = useState(createEmptyTask);
  const [validationError, setValidationError] = useState<string | null>(null);

  const createTaskMutation = useMutation({
    mutationFn: createTask,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["tasks"] });
      navigate("/tasks");
    },
  });

  function updateTask(taskId: string, changes: Pick<TaskDraft, "title" | "requiredSkillIds">) {
    setValidationError(null);
    setTaskDraft((currentTask) =>
      updateTaskDraft(currentTask, taskId, (task) => ({ ...task, ...changes })),
    );
  }

  function addSubtask(taskId: string) {
    setTaskDraft((currentTask) =>
      updateTaskDraft(currentTask, taskId, (task) => ({
        ...task,
        subtasks: [...task.subtasks, createEmptyTask()],
      })),
    );
  }

  function removeSubtask(taskId: string) {
    setTaskDraft((currentTask) => removeTaskDraft(currentTask, taskId));
  }

  function submitTask() {
    const input = toCreateTaskInput(taskDraft);
    const result = createTaskSchema.safeParse(input);

    if (!result.success) {
      setValidationError(result.error.issues[0]?.message ?? "Check the task details.");
      return;
    }

    setValidationError(null);
    createTaskMutation.mutate(result.data);
  }

  function renderTaskForm(task: TaskDraft, depth: number, parentTitle?: string) {
    return (
      <Fragment key={task.localId}>
        <TaskFormNode
          task={task}
          skills={skillsQuery.data ?? []}
          depth={depth}
          parentTitle={parentTitle}
          onChange={(changes) => updateTask(task.localId, changes)}
          onAddSubtask={() => addSubtask(task.localId)}
          onRemove={() => removeSubtask(task.localId)}
        />
        {task.subtasks.map((subtask) => renderTaskForm(subtask, depth + 1, task.title))}
      </Fragment>
    );
  }

  if (skillsQuery.isPending) {
    return <p className="text-sm text-slate-600">Loading skills...</p>;
  }

  if (skillsQuery.isError) {
    const message = skillsQuery.error instanceof Error ? skillsQuery.error.message : "Unable to load skills.";

    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700" role="alert">
        {message}
      </div>
    );
  }

  return (
    <section className="mx-auto max-w-3xl">
      <Link to="/tasks" className="text-sm font-medium text-blue-700 hover:text-blue-800">
        ← Back to tasks
      </Link>
      <div className="mt-5 rounded-lg border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-sm font-medium text-blue-700">Task Assignment</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">Create task(s)</h1>
        <p className="mt-2 text-sm text-slate-600">
          Add subtasks at any level. Every task and subtask can have its own required skills.
        </p>

        <form
          className="mt-8 space-y-6"
          onSubmit={(event) => {
            event.preventDefault();
            submitTask();
          }}
          noValidate
        >
          {renderTaskForm(taskDraft, 0)}

          {validationError ? (
            <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
              {validationError}
            </p>
          ) : null}

          {createTaskMutation.isError ? (
            <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
              {createTaskMutation.error instanceof Error
                ? createTaskMutation.error.message
                : "Unable to create the task."}
            </p>
          ) : null}

          <div className="flex justify-end gap-3 border-t border-slate-200 pt-6">
            <Link
              to="/tasks"
              className="rounded-md px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={createTaskMutation.isPending}
              className="rounded-md bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-blue-400"
            >
              {createTaskMutation.isPending ? "Saving..." : "Save task"}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
