import { Navigate, NavLink, Route, Routes } from "react-router-dom";
import { CreateTaskPage } from "./pages/CreateTaskPage";
import { TaskListPage } from "./pages/TaskListPage";

function navigationClassName({ isActive }: { isActive: boolean }) {
  return isActive
    ? "rounded-md bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700"
    : "rounded-md px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900";
}

export default function App() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
          <NavLink to="/tasks" className="text-base font-bold tracking-tight text-slate-900">
            Task Assignment
          </NavLink>
          <nav aria-label="Main navigation">
            <NavLink to="/tasks" className={navigationClassName}>
              Tasks
            </NavLink>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
        <Routes>
          <Route path="/tasks" element={<TaskListPage />} />
          <Route path="/tasks/new" element={<CreateTaskPage />} />
          <Route path="*" element={<Navigate to="/tasks" replace />} />
        </Routes>
      </main>
    </div>
  );
}
