"use client";

import { FileDown, Printer } from "lucide-react";
import { useEffect, useState } from "react";

import { getTeacherGradeScale } from "@/lib/gradeScale/teacherGradeScaleApi";
import { supabase } from "@/lib/supabaseClient";

import GeneratedStudentMaterial from "./GeneratedStudentMaterial";
import TeacherAnswerKey from "./TeacherAnswerKey";

export default function GeneratedMaterial({ generationOutput }) {
  const [gradeScale, setGradeScale] = useState(null);
  const [isGradeScaleLoading, setIsGradeScaleLoading] = useState(true);
  const [gradeScaleError, setGradeScaleError] = useState("");
  const [isDocxExporting, setIsDocxExporting] = useState(false);
  const [docxExportError, setDocxExportError] = useState("");

  const generationResult = generationOutput?.result;
  const material = generationResult?.material;
  const tasks = material?.tasks;
  const profiles = generationOutput?.profiles;
  const materialTypeLabel = generationOutput?.materialType?.label;
  const topicTitle =
    generationResult?.lessonSection?.displayTitle ||
    generationResult?.lessonTopic?.displayTitle;
  const materialTypeValue = generationOutput?.materialType?.value;

  useEffect(() => {
    let isMounted = true;

    async function loadGradeScale() {
      try {
        const scale = await getTeacherGradeScale({ supabase });

        if (isMounted) {
          setGradeScale(scale);
        }
      } catch (error) {
        if (isMounted) {
          setGradeScaleError(
            error instanceof Error
              ? error.message
              : "Nie udało się pobrać skali ocen."
          );
        }
      } finally {
        if (isMounted) {
          setIsGradeScaleLoading(false);
        }
      }
    }

    loadGradeScale();

    return () => {
      isMounted = false;
    };
  }, []);

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

  async function handleDocxExport() {
    setDocxExportError("");
    setIsDocxExporting(true);

    try {
      const { exportMaterialToDocx } = await import(
        "@/lib/export/exportDocx"
      );

      await exportMaterialToDocx({
        materialTypeValue,
        materialTypeLabel,
        topicTitle,
        profiles,
        material,
        gradeScale,
      });
    } catch (error) {
      setDocxExportError(
        error instanceof Error
          ? error.message
          : "Nie udało się przygotować pliku DOCX."
      );
    } finally {
      setIsDocxExporting(false);
    }
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap gap-3 print:hidden">
        <button
          type="button"
          onClick={handlePrint}
          disabled={isGradeScaleLoading}
          className="flex items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900 px-5 py-3 font-semibold text-zinc-200 transition hover:border-sky-500/40 hover:bg-sky-500/10 hover:text-sky-200 focus:outline-none focus:ring-2 focus:ring-sky-500/30 disabled:cursor-wait disabled:opacity-60"
        >
          <Printer className="h-4 w-4" aria-hidden="true" />
          {isGradeScaleLoading
            ? "Przygotowywanie wydruku..."
            : "Drukuj / Zapisz PDF"}
        </button>

        <button
          type="button"
          onClick={handleDocxExport}
          disabled={isGradeScaleLoading || isDocxExporting}
          className="flex items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900 px-5 py-3 font-semibold text-zinc-200 transition hover:border-sky-500/40 hover:bg-sky-500/10 hover:text-sky-200 focus:outline-none focus:ring-2 focus:ring-sky-500/30 disabled:cursor-wait disabled:opacity-60"
        >
          <FileDown className="h-4 w-4" aria-hidden="true" />
          {isDocxExporting
            ? "Przygotowywanie DOCX..."
            : "Pobierz DOCX"}
        </button>
      </div>

      {docxExportError ? (
        <p className="text-sm text-red-300 print:hidden">
          {docxExportError}
        </p>
      ) : null}

      <div className="print-materials space-y-8">
        {profiles.map((profile) => (
          <GeneratedStudentMaterial
            key={profile.value}
            materialTypeValue={materialTypeValue}
            materialTypeLabel={materialTypeLabel}
            profileValue={profile.value}
            profileLabel={profile.label}
            topicTitle={topicTitle}
            intro={material?.intro}
            tips={material?.tip}
            glossary={material?.glossary}
            tasks={tasks}
          />
        ))}

        <TeacherAnswerKey
          materialTypeLabel={materialTypeLabel}
          topicTitle={topicTitle}
          tasks={tasks}
          gradeScale={gradeScale}
          isGradeScaleLoading={isGradeScaleLoading}
          gradeScaleError={gradeScaleError}
        />
      </div>
    </section>
  );
}
