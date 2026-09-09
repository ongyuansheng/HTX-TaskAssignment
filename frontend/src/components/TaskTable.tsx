import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateTask } from "../api/tasks";
import type { Developer, Task, TaskStatus, UpdateTaskInput } from "../types/api";
import { getStatusLabel } from "./StatusBadge";

type TaskTableProps = {
  tasks: Task[];
  developers: Developer[];
};

type TaskUpdate = {
  taskId: string;
  input: UpdateTaskInput;
};

function isCompatible(task: Task, developer: Developer) {
  return task.requiredSkills.every((requiredSkill) =>
    developer.skills.some((skill) => skill.id === requiredSkill.id),
  );
}

type TaskRow = {
  task: Task;
  depth: number;
};

// The API returns a tree; the table needs one row per task.
function flattenTasks(tasks: Task[], depth = 0): TaskRow[] {
  return tasks.flatMap((task) => [
    { task, depth },
    ...flattenTasks(task.subtasks, depth + 1),
  ]);
}

export function TaskTable({ tasks, developers }: TaskTableProps) {
  const queryClient = useQueryClient();
  const [updateError, setUpdateError] = useState<string | null>(null);

  const updateTaskMutation = useMutation({
    mutationFn: ({ taskId, input }: TaskUpdate) => updateTask(taskId, input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
    onError: (error) => {
      setUpdateError(error instanceof Error ? error.message : "Unable to update the task.");
    },
  });

  function submitUpdate(taskId: string, input: UpdateTaskInput) {
    setUpdateError(null);
    updateTaskMutation.mutate({ taskId, input });
  }

  if (tasks.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
        <h2 className="text-lg font-semibold text-slate-900">No tasks yet</h2>
        <p className="mt-2 text-sm text-slate-600">Create your first task to start assigning work.</p>
      </div>
    );
  }

  const taskRows = flattenTasks(tasks);

  return (
    <>
      {updateError ? (
        <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          {updateError}
        </p>
      ) : null}

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
        <table className="min-w-[760px] w-full border-collapse text-left">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-6 py-4 font-semibold">Task title</th>
              <th className="px-6 py-4 font-semibold">Skills</th>
              <th className="px-6 py-4 font-semibold">Status</th>
              <th className="px-6 py-4 font-semibold">Assignee</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {taskRows.map(({ task, depth }) => {
              const compatibleDevelopers = developers.filter((developer) => isCompatible(task, developer));

              return (
                <tr key={task.id} className="align-top">
                  <td className="max-w-md px-6 py-5 text-sm font-medium leading-6 text-slate-900">
                    <span style={{ paddingLeft: `${depth * 20}px` }}>
                      {depth > 0 ? "↳ " : ""}
                      {task.title}
                    </span>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex max-w-xs flex-wrap gap-2">
                      {task.requiredSkills.length === 0 ? (
                        <span className="text-sm text-slate-500">No skills specified</span>
                      ) : (
                        task.requiredSkills.map((skill) => (
                          <span
                            key={skill.id}
                            className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700"
                          >
                            {skill.name}
                          </span>
                        ))
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <label className="sr-only" htmlFor={`status-${task.id}`}>
                      Status for {task.title}
                    </label>
                    <select
                      id={`status-${task.id}`}
                      value={task.status}
                      disabled={updateTaskMutation.isPending}
                      onChange={(event) =>
                        submitUpdate(task.id, { status: event.target.value as TaskStatus })
                      }
                      className="w-36 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100"
                    >
                      {(["TODO", "IN_PROGRESS", "DONE"] as TaskStatus[]).map((status) => (
                        <option key={status} value={status}>
                          {getStatusLabel(status)}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-6 py-5">
                    <label className="sr-only" htmlFor={`assignee-${task.id}`}>
                      Assignee for {task.title}
                    </label>
                    <select
                      id={`assignee-${task.id}`}
                      value={task.assignedDeveloper?.id ?? ""}
                      disabled={updateTaskMutation.isPending}
                      onChange={(event) =>
                        submitUpdate(task.id, {
                          assignedDeveloperId: event.target.value || null,
                        })
                      }
                      className="w-44 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100"
                    >
                      <option value="">Unassigned</option>
                      {compatibleDevelopers.map((developer) => (
                        <option key={developer.id} value={developer.id}>
                          {developer.name}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
