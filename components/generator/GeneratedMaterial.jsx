"use client";

import GeneratedStudentMaterial from "./GeneratedStudentMaterial";

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
          className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
        >
             🖨️ Drukuj / Zapisz PDF
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
      </div>
    </section>
  );
}
