import GeneratedTask from "./GeneratedTask";

export default function GeneratedMaterial({
  generationResult,
}) {
  const tasks =
    generationResult?.material?.tasks;

  if (!tasks) {
    return null;
  }

  return (
    <section className="space-y-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300">
          Materiał wygenerowany
        </p>

        <h2 className="mt-1 text-lg font-semibold text-zinc-50">
          {
            generationResult.lessonTopic
              ?.displayTitle
          }
        </h2>

        <p className="mt-1 text-sm text-zinc-400">
          Liczba zadań: {tasks.length}
        </p>
      </div>

      <ol className="space-y-4">
        {tasks.map((task) => (
          <li
            key={`${task.number}-${task.taskSubtype}`}
            className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-4"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-sky-400">
              Zadanie {task.number}
            </p>

            <div className="mt-3">
                <GeneratedTask task={task} />
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
