"use client";

import { ChevronRight, KeyRound } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { buildTeacherAnswerKey } from "@/lib/generation/buildTeacherAnswerKey";
import { buildTeacherGradeScaleRanges } from "@/lib/gradeScale/teacherGradeScale";

function KeyLabel({ children }) {
  return (
    <p className="text-sm font-semibold text-zinc-100 print:text-[9pt] print:text-black">
      {children}
    </p>
  );
}

function KeyCodeBlock({ children }) {
  return (
    <pre className="mt-2 overflow-x-auto whitespace-pre-wrap rounded-xl border border-zinc-700 bg-zinc-950 p-4 text-sm leading-6 text-zinc-100 print:overflow-visible print:rounded-none print:border print:border-zinc-400 print:bg-zinc-100 print:p-2 print:text-[8.5pt] print:leading-tight print:text-black">
      <code>{children}</code>
    </pre>
  );
}

function AnswerValue({ answer }) {
  if (answer.kind === "code") {
    return (
      <div>
        <KeyLabel>{answer.label}:</KeyLabel>
        <KeyCodeBlock>{answer.value}</KeyCodeBlock>
      </div>
    );
  }

  if (answer.kind === "list") {
    return (
      <div>
        <KeyLabel>{answer.label}:</KeyLabel>

        <ul className="mt-2 space-y-1 pl-5 text-sm leading-6 text-zinc-200 print:mt-1 print:space-y-0 print:text-[9pt] print:leading-tight print:text-black">
          {answer.items.map((item) => (
            <li key={item} className="list-disc">
              {item}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <p className="text-sm leading-6 text-zinc-200 print:text-[9pt] print:leading-tight print:text-black">
      <span className="font-semibold text-zinc-100 print:text-black">
        {answer.label}:
      </span>{" "}
      {answer.value}
    </p>
  );
}

function GradeScaleSection({
  gradeScale,
  isGradeScaleLoading,
  gradeScaleError,
}) {
  if (isGradeScaleLoading) {
    return (
      <p className="mt-4 text-sm text-zinc-400 print:hidden">
        Ładowanie skali ocen...
      </p>
    );
  }

  if (gradeScaleError) {
    return (
      <p className="mt-4 text-sm text-red-300 print:hidden">
        {gradeScaleError}
      </p>
    );
  }

  if (!gradeScale) {
    return (
      <div className="mt-4 rounded-xl border border-zinc-700 bg-zinc-950/70 p-4 text-sm text-zinc-300 print:hidden">
        <p>
          Ustaw skalę ocen, aby została dołączona do klucza nauczyciela.
        </p>
        <Link
          href="/ustawienia"
          className="mt-2 inline-flex font-semibold text-sky-300 transition hover:text-sky-200"
        >
          Przejdź do ustawień skali →
        </Link>
      </div>
    );
  }

  const ranges = buildTeacherGradeScaleRanges(gradeScale);
  const firstColumnLength = Math.ceil(ranges.length / 2);
  const rangeColumns = [
    ranges.slice(0, firstColumnLength),
    ranges.slice(firstColumnLength),
  ];

  return (
    <section className="print-grade-scale mt-5 border-t border-zinc-700 pt-4 print:mt-3 print:border-zinc-500 print:pt-3">
      <h4 className="text-lg font-bold text-zinc-50 print:text-[11pt] print:text-black">
        Skala ocen
      </h4>

      <div className="print-grade-scale-columns mt-3 grid gap-x-8 gap-y-0 text-sm text-zinc-200 sm:grid-cols-2 print:mt-1 print:grid-cols-2 print:text-[9pt] print:text-black">
        {rangeColumns.map((column, columnIndex) => (
          <ol
            key={`grade-scale-column-${columnIndex}`}
            className="print-grade-scale-list space-y-2"
          >
            {column.map((range) => (
              <li
                key={range.grade}
                className="print-grade-scale-item flex justify-between gap-4"
              >
                <span>
                  {range.grade} — {range.label}
                </span>
                <span className="shrink-0 font-semibold">
                  {range.min}–{range.max}%
                </span>
              </li>
            ))}
          </ol>
        ))}
      </div>
    </section>
  );
}

export default function TeacherAnswerKey({
  materialTypeLabel,
  topicTitle,
  tasks,
  gradeScale,
  isGradeScaleLoading = false,
  gradeScaleError = "",
}) {
  const [isOpen, setIsOpen] = useState(false);
  const answerKey = buildTeacherAnswerKey(tasks);

  return (
    <section className="print-teacher-answer-key rounded-2xl border border-zinc-700 bg-zinc-900/40 p-6 shadow-sm">
      <button
        type="button"
        className="print-teacher-answer-key-toggle flex w-full items-center gap-3 text-left text-sm font-semibold text-zinc-200 transition hover:text-white focus:outline-none focus:ring-2 focus:ring-zinc-500/40"
        aria-expanded={isOpen}
        aria-controls="teacher-answer-key-content"
        onClick={() => setIsOpen((current) => !current)}
      >
        <ChevronRight
          aria-hidden="true"
          className={`h-4 w-4 shrink-0 transition-transform duration-200 ${
            isOpen ? "rotate-90" : ""
          }`}
        />

        <KeyRound aria-hidden="true" className="h-4 w-4 shrink-0" />

        <span>Klucz odpowiedzi dla nauczyciela</span>
      </button>

      <div
        id="teacher-answer-key-content"
        className={`print-teacher-answer-key-content ${
          isOpen ? "block" : "hidden"
        }`}
      >
        <header className="print-teacher-answer-key-header hidden border-b border-zinc-700 pb-4 print:mt-0 print:block print:border-zinc-500">
          <h2 className="text-xl font-bold">
            Klucz odpowiedzi dla nauczyciela
          </h2>

          <p className="mt-3 text-sm">
            <strong>Materiał:</strong> {materialTypeLabel}
          </p>

          <p className="mt-1 text-sm">
            <strong>Temat:</strong> {topicTitle}
          </p>
        </header>

        <ol className="mt-6 space-y-5 print:mt-3 print:space-y-0">
          {answerKey.tasks.map((task) => (
            <li
              key={`${task.number}-${task.taskSubtype}`}
              className="print-answer-key-task rounded-xl border border-zinc-700 bg-zinc-950/70 p-4 print:rounded-none print:border-0 print:border-b print:border-zinc-300 print:bg-white print:px-0 print:py-3"
            >
              <h4 className="text-base font-bold text-zinc-50 print:text-[10pt] print:text-black">
                Zadanie {task.number} ({task.points} pkt)
              </h4>

              <div className="mt-3 space-y-3 print:mt-2 print:space-y-2">
                <AnswerValue answer={task.answer} />

                <p className="text-sm leading-6 text-zinc-200 print:text-[9pt] print:leading-tight print:text-black">
                  <span className="font-semibold text-zinc-100 print:text-black">
                    {task.answer.explanationLabel}:
                  </span>{" "}
                  {task.explanation}
                </p>

                <div>
                  <KeyLabel>Punktacja:</KeyLabel>

                  <ul className="mt-2 space-y-1 pl-5 text-sm leading-6 text-zinc-200 print:mt-1 print:space-y-0 print:text-[9pt] print:leading-tight print:text-black">
                    {task.scoringCriteria.map((criterion) => (
                      <li key={criterion} className="list-disc">
                        {criterion}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </li>
          ))}
        </ol>

        <footer className="mt-6 border-t border-zinc-700 pt-4 print:mt-3 print:border-zinc-500 print:pt-3">
          <h4 className="text-lg font-bold text-zinc-50 print:text-[11pt] print:text-black">
            Podsumowanie punktacji
          </h4>

          <p className="mt-2 text-sm text-zinc-200 print:mt-1 print:text-[9pt] print:text-black">
            <span className="font-semibold">Suma punktów:</span>{" "}
            {answerKey.totalPoints} pkt
          </p>

          <GradeScaleSection
            gradeScale={gradeScale}
            isGradeScaleLoading={isGradeScaleLoading}
            gradeScaleError={gradeScaleError}
          />
        </footer>
      </div>
    </section>
  );
}
