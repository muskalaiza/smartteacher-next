import GeneratedTask from "./GeneratedTask";

function BlankField({ label }) {
  return (
    <div className="flex min-w-0 items-end gap-2">
      <span className="shrink-0 text-sm font-medium text-zinc-300">
        {label}:
      </span>

      <span
        aria-hidden="true"
        className="min-w-12 flex-1 border-b border-dotted border-zinc-500"
      />
    </div>
  );
}

export default function GeneratedStudentMaterial({
  materialTypeValue,
  materialTypeLabel,
  profileValue,
  profileLabel,
  topicTitle,
  tasks,
}) {
  return (
  <article className="print-student-material space-y-6 rounded-2xl border border-zinc-700 bg-zinc-950 p-6 shadow-sm">
      <header className="space-y-5 border-b border-zinc-800 pb-6">
        <h3 className="text-xl font-bold uppercase tracking-wide text-zinc-50">
          {materialTypeLabel} — Profil: {profileLabel}
        </h3>

        <BlankField label="Imię i nazwisko ucznia" />

        <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2 xl:grid-cols-4">
          <BlankField label="Klasa" />
          <BlankField label="Data" />
          <BlankField label="Suma punktów" />
          <BlankField label="Ocena" />
        </div>

        <p className="text-sm leading-6 text-zinc-100">
          <span className="font-semibold">
            Temat:
          </span>{" "}
          {topicTitle}
        </p>
      </header>

      <section className="space-y-4">
        <h4 className="text-lg font-semibold text-zinc-50">
          Zadania dla ucznia
        </h4>

        <ol className="space-y-4">
          {tasks.map((task) => (
            <li
              key={`${task.number}-${task.taskSubtype}`}
             className="print-task rounded-xl border border-zinc-800 bg-zinc-950/70 p-4"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-sky-400">
                Zadanie {task.number}
              </p>

              <div className="mt-3">
                <GeneratedTask
                  task={task}
                  profileValue={profileValue}
                  materialTypeValue={materialTypeValue}
                />
              </div>
            </li>
          ))}
        </ol>
      </section>
    </article>
  );
}
