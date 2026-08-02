"use client";
import { Printer, WandSparkles } from "lucide-react";
import GeneratedStudentMaterial from "./GeneratedStudentMaterial";
import TeacherAnswerKey from "./TeacherAnswerKey";

export default function GeneratedMaterial({
  generationOutput,
}) {
  const generationResult =
    generationOutput?.result;

  const tasks =
    generationResult?.material?.tasks;

  const profiles =
    generationOutput?.profiles;

  const materialTypeLabel =
    generationOutput?.materialType?.label;

  const topicTitle =
    generationResult?.lessonTopic?.displayTitle;

  const materialTypeValue =
    generationOutput?.materialType?.value;

  if (
    !Array.isArray(tasks) ||
    tasks.length === 0 ||
    !Array.isArray(profiles) ||
    profiles.length === 0
  ) {
    return null;
  }

  function handlePrint() {
    window.print();
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap gap-3 print:hidden">
        <button
          type="button"
          onClick={handlePrint}
          className="
    flex items-center justify-center gap-2
    rounded-xl border border-zinc-700
    bg-zinc-900 px-5 py-3
    font-semibold text-zinc-200
    transition
    hover:border-sky-500/40
    hover:bg-sky-500/10
    hover:text-sky-200
    focus:outline-none focus:ring-2 focus:ring-sky-500/30
  "
>
  <Printer className="h-4 w-4" aria-hidden="true" />
  Drukuj / Zapisz PDF
</button>
      </div>

      <div className="print-materials space-y-8">
        {profiles.map((profile) => (
          <GeneratedStudentMaterial
            key={profile.value}
            materialTypeValue={materialTypeValue}
            materialTypeLabel={materialTypeLabel}
            profileValue={profile.value}
            profileLabel={profile.label}
            topicTitle={topicTitle}
            tasks={tasks}
          />
        ))}

        <TeacherAnswerKey
          materialTypeLabel={materialTypeLabel}
          topicTitle={topicTitle}
          tasks={tasks}
        />
      </div>
    </section>
  );
}
