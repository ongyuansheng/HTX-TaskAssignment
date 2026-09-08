import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";
import { getSkills } from "../api/skills";
import { createTask } from "../api/tasks";
import type { CreateTaskInput } from "../types/api";

const createTaskSchema = z.object({
  title: z.string().trim().min(1, "Enter a task title."),
  requiredSkillIds: z.array(z.string()),
});

export function CreateTaskPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const skillsQuery = useQuery({ queryKey: ["skills"], queryFn: getSkills });
  const form = useForm<CreateTaskInput>({
    resolver: zodResolver(createTaskSchema),
    defaultValues: {
      title: "",
      requiredSkillIds: [],
    },
  });

  const createTaskMutation = useMutation({
    mutationFn: createTask,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["tasks"] });
      navigate("/tasks");
    },
  });

  function onSubmit(input: CreateTaskInput) {
    createTaskMutation.mutate(input);
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
    <section className="mx-auto max-w-2xl">
      <Link to="/tasks" className="text-sm font-medium text-blue-700 hover:text-blue-800">
        ← Back to tasks
      </Link>
      <div className="mt-5 rounded-lg border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-sm font-medium text-blue-700">Task Assignment</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">Create task</h1>
        <p className="mt-2 text-sm text-slate-600">
          Add a task title and the skills needed to complete it. You can assign someone later.
        </p>

        <form className="mt-8 space-y-7" onSubmit={form.handleSubmit(onSubmit)} noValidate>
          <div>
            <label htmlFor="title" className="block text-sm font-semibold text-slate-800">
              Task title
            </label>
            <textarea
              id="title"
              rows={4}
              placeholder="For example: As a visitor, I want to see a responsive homepage..."
              {...form.register("title")}
              className="mt-2 block w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
            {form.formState.errors.title ? (
              <p className="mt-2 text-sm text-red-600">{form.formState.errors.title.message}</p>
            ) : null}
          </div>

          <fieldset>
            <legend className="text-sm font-semibold text-slate-800">Required skills</legend>
            <p className="mt-1 text-sm text-slate-600">Select every skill this task needs.</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {skillsQuery.data.map((skill) => (
                <label
                  key={skill.id}
                  className="flex cursor-pointer items-center gap-3 rounded-md border border-slate-200 px-4 py-3 text-sm text-slate-800 transition hover:border-blue-300 hover:bg-blue-50"
                >
                  <input
                    type="checkbox"
                    value={skill.id}
                    {...form.register("requiredSkillIds")}
                    className="size-4 rounded border-slate-300 text-blue-700 focus:ring-blue-500"
                  />
                  {skill.name}
                </label>
              ))}
            </div>
          </fieldset>

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
