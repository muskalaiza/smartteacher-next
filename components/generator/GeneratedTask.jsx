const HINT_LABELS = ["A", "B", "C", "D"];

function TaskText({ children }) {
  return (
    <p className="whitespace-pre-wrap text-sm leading-6 text-zinc-100">
      {children}
    </p>
  );
}

function SectionLabel({ children }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
      {children}
    </p>
  );
}

function CodeBlock({ children }) {
  return (
    <pre className="overflow-x-auto whitespace-pre-wrap rounded-xl border border-zinc-800 bg-zinc-900 p-4 text-sm leading-6 text-zinc-100">
      <code>{children}</code>
    </pre>
  );
}

const ANSWER_AREA_HEIGHTS = {
  shortCode: "min-h-40",
  code: "min-h-64",
  text: "min-h-32",
};

function AnswerArea({ label, size }) {
  const heightClass = ANSWER_AREA_HEIGHTS[size];

  if (!heightClass) {
    throw new Error(
      `Nieobsługiwany rozmiar obszaru odpowiedzi: ${
        size || "[brak]"
      }.`
    );
  }

  return (
    <div className="space-y-2">
      <SectionLabel>{label}</SectionLabel>

      <div
        className={`rounded-xl border border-dashed border-zinc-700 bg-zinc-900/40 ${heightClass}`}
      />
    </div>
  );
}

/* =========================
   CLOSED_SINGLE
========================= */

function ClosedSingleTask({ task }) {
  return (
    <div className="space-y-4">
      <TaskText>{task.question}</TaskText>

      <ul className="space-y-2">
        {task.options.map((option) => (
          <li
            key={option.id}
            className="flex gap-3 rounded-lg border border-zinc-800 bg-zinc-900/70 px-4 py-3"
          >
            <span className="font-semibold text-sky-400">
              {option.id})
            </span>

            <span className="text-sm leading-6 text-zinc-100">
              {option.text}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* =========================
   CLOSED_TF
========================= */

function ClosedTrueFalseTask({ task }) {
  return (
    <div className="space-y-4">
      <TaskText>{task.statement}</TaskText>

      <div className="flex flex-wrap gap-3">
        <span className="rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm text-zinc-200">
          Prawda
        </span>

        <span className="rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm text-zinc-200">
          Fałsz
        </span>
      </div>
    </div>
  );
}

/* =========================
   MATCH_FILL
========================= */

function MatchFillTask({ task }) {
  return (
    <div className="space-y-4">
      <TaskText>{task.question}</TaskText>

      <div className="space-y-2">
        <SectionLabel>Podpowiedzi</SectionLabel>

        <ul className="grid gap-2 sm:grid-cols-2">
          {task.hints.map((hint, index) => (
            <li
              key={`${task.number}-hint-${index}-${hint}`}
              className="flex gap-3 rounded-lg border border-zinc-800 bg-zinc-900/70 px-4 py-3"
            >
              <span className="font-semibold text-sky-400">
                {HINT_LABELS[index]})
              </span>

              <span className="text-sm leading-6 text-zinc-100">
                {hint}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/* =========================
   MATCH_PAIR
========================= */

function MatchPairTask({ task }) {
  return (
    <div className="space-y-4">
      <TaskText>{task.instruction}</TaskText>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <SectionLabel>Elementy</SectionLabel>

          <ul className="space-y-2">
            {task.leftItems.map((item) => (
              <li
                key={item.id}
                className="rounded-lg border border-zinc-800 bg-zinc-900/70 px-4 py-3 text-sm leading-6 text-zinc-100"
              >
                <span className="mr-2 font-semibold text-sky-400">
                  {item.id}.
                </span>

                {item.text}
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-2">
          <SectionLabel>Opisy</SectionLabel>

          <ul className="space-y-2">
            {task.rightItems.map((item) => (
              <li
                key={item.id}
                className="rounded-lg border border-zinc-800 bg-zinc-900/70 px-4 py-3 text-sm leading-6 text-zinc-100"
              >
                <span className="mr-2 font-semibold text-sky-400">
                  {item.id})
                </span>

                {item.text}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

/* =========================
   ERROR_FIND
========================= */

function ErrorFindTask({ task }) {
  return (
    <div className="space-y-4">
      <TaskText>{task.instruction}</TaskText>

      <div className="space-y-2">
        <SectionLabel>Kod z błędem</SectionLabel>
        <CodeBlock>{task.codeWithError}</CodeBlock>
      </div>
      <AnswerArea
  label="Miejsce na poprawiony kod"
  size="shortCode"
/>
    </div>
  );
}

/* =========================
   OPEN_CODE
========================= */

function OpenCodeTask({ task }) {
  return (
    <div className="space-y-4">
      <TaskText>{task.instruction}</TaskText>

      <div className="space-y-2">
        <SectionLabel>Wymagania</SectionLabel>

        <ul className="space-y-2">
          {task.requirements.map((requirement, index) => (
            <li
              key={`${task.number}-requirement-${index}-${requirement}`}
              className="flex gap-3 text-sm leading-6 text-zinc-100"
            >
              <span className="text-sky-400">•</span>
              <span>{requirement}</span>
            </li>
          ))}
        </ul>
      </div>
      <AnswerArea
  label="Miejsce na rozwiązanie"
  size="code"
/>
    </div>
  );
}

/* =========================
   OPEN_EXPLAIN
========================= */

function OpenExplainTask({ task }) {
  return (
    <div className="space-y-4">
      <TaskText>{task.instruction}</TaskText>

      <div className="space-y-2">
        <SectionLabel>Kontekst do analizy</SectionLabel>
        <CodeBlock>{task.context}</CodeBlock>
      </div>
      <AnswerArea
  label="Miejsce na odpowiedź"
  size="text"
/>
    </div>
  );
}

/* =========================
   MAPA RENDERERÓW
========================= */

const TASK_RENDERERS = {
  closed_single: ClosedSingleTask,
  closed_tf: ClosedTrueFalseTask,
  match_fill: MatchFillTask,
  match_pair: MatchPairTask,
  error_find: ErrorFindTask,
  open_code: OpenCodeTask,
  open_explain: OpenExplainTask,
};

export default function GeneratedTask({ task }) {
  const TaskRenderer =
    TASK_RENDERERS[task.taskSubtype];

  if (!TaskRenderer) {
    throw new Error(
      `Brak renderera dla typu zadania: ${
        task.taskSubtype || "[brak]"
      }.`
    );
  }

  return <TaskRenderer task={task} />;
}
