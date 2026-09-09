import type { Skill, TaskDraft } from "../types/api";

type TaskFormNodeProps = {
  task: TaskDraft;
  skills: Skill[];
  depth: number;
  parentTitle?: string;
  onChange: (changes: Pick<TaskDraft, "title" | "requiredSkillIds">) => void;
  onAddSubtask: () => void;
  onRemove: () => void;
};

export function TaskFormNode({
  task,
  skills,
  depth,
  parentTitle,
  onChange,
  onAddSubtask,
  onRemove,
}: TaskFormNodeProps) {
  const isRootTask = depth === 0;
  const titleLabel = isRootTask ? "Task title" : "Subtask title";
  const skillsLabel = isRootTask ? "Required skills (optional)" : "Required subtask skills (optional)";

  function toggleSkill(skillId: string) {
    const requiredSkillIds = task.requiredSkillIds.includes(skillId)
      ? task.requiredSkillIds.filter((id) => id !== skillId)
      : [...task.requiredSkillIds, skillId];

    onChange({ title: task.title, requiredSkillIds });
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-800">
            {isRootTask ? "New task" : `Subtask level ${depth}`}
          </h2>
          {!isRootTask ? (
            <p className="mt-1 text-xs text-slate-500">Subtask of: {parentTitle || "Untitled task"}</p>
          ) : null}
        </div>
        {!isRootTask ? (
          <button
            type="button"
            onClick={onRemove}
            className="text-sm font-medium text-red-700 hover:text-red-800"
          >
            Remove
          </button>
        ) : null}
      </div>

      <div className="mt-4">
        <label htmlFor={`title-${task.localId}`} className="block text-sm font-semibold text-slate-800">
          {titleLabel}
        </label>
        <textarea
          id={`title-${task.localId}`}
          rows={3}
          value={task.title}
          onChange={(event) => onChange({ title: event.target.value, requiredSkillIds: task.requiredSkillIds })}
          placeholder="Describe the work to be completed"
          className="mt-2 block w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />
      </div>

      <fieldset className="mt-5">
        <legend className="text-sm font-semibold text-slate-800">{skillsLabel}</legend>
        <p className="mt-1 text-xs text-slate-500">
          Leave this empty to identify the skills automatically.
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {skills.map((skill) => (
            <label
              key={skill.id}
              className="flex cursor-pointer items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800"
            >
              <input
                type="checkbox"
                checked={task.requiredSkillIds.includes(skill.id)}
                onChange={() => toggleSkill(skill.id)}
                className="size-4 rounded border-slate-300 text-blue-700 focus:ring-blue-500"
              />
              {skill.name}
            </label>
          ))}
        </div>
      </fieldset>

      <button
        type="button"
        onClick={onAddSubtask}
        className="mt-5 rounded-md border border-blue-200 bg-white px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50"
      >
        Add subtask
      </button>
    </div>
  );
}
