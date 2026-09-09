import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getDevelopers } from "../api/developers";
import { getTasks } from "../api/tasks";
import { TaskTable } from "../components/TaskTable";

export function TaskListPage() {
  const tasksQuery = useQuery({ queryKey: ["tasks"], queryFn: getTasks });
  const developersQuery = useQuery({ queryKey: ["developers"], queryFn: getDevelopers });

  if (tasksQuery.isPending || developersQuery.isPending) {
    return <p className="text-sm text-slate-600">Loading tasks...</p>;
  }

  if (tasksQuery.isError || developersQuery.isError) {
    const error = tasksQuery.error ?? developersQuery.error;
    const message = error instanceof Error ? error.message : "Unable to load tasks.";

    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700" role="alert">
        {message}
      </div>
    );
  }

  return (
    <section>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-blue-700">Task Assignment</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">Tasks</h1>
          <p className="mt-2 text-sm text-slate-600">Assign compatible developers and keep work moving.</p>
        </div>
        <Link
          to="/tasks/new"
          className="rounded-md bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Create task
        </Link>
      </div>

      <TaskTable tasks={tasksQuery.data} developers={developersQuery.data} />
    </section>
  );
}
