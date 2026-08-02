import {
  getTaskProfilePresentation,
} from "@/lib/generation/getTaskProfilePresentation";

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

const TASK_ANSWER_AREAS = {
  error_find: {
    label: "Miejsce na poprawiony kod",
    size: "shortCode",
  },

  open_code: {
    label: "Miejsce na rozwiązanie",
    size: "code",
  },

  open_explain: {
    label: "Miejsce na odpowiedź",
    size: "text",
  },
};

function TaskAnswerArea({
  taskSubtype,
}) {
  const config =
    TASK_ANSWER_AREAS[taskSubtype];

  if (!config) {
    return null;
  }

  return (
    <AnswerArea
      label={config.label}
      size={config.size}
    />
  );
}

function AnswerArea({ label, size }) {
  const heightClass =
    ANSWER_AREA_HEIGHTS[size];

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

function AsdObjective({ children }) {
  return (
    <div className="rounded-lg border border-violet-500/25 bg-violet-500/10 p-3 print:rounded-none print:border-0 print:bg-transparent print:p-0">
      <p className="text-sm leading-6 text-violet-100 print:text-[8pt] print:leading-tight print:text-black">
        <span className="font-semibold">
          Cel zadania:
        </span>{" "}
        {children}
      </p>
    </div>
  );
}

function AdhdPlan({ plan }) {
  return (
    <div className="rounded-lg border border-sky-500/25 bg-sky-500/10 p-3 print:rounded-none print:border-0 print:bg-transparent print:p-0">
      <p className="text-xs font-semibold uppercase tracking-wide text-sky-300 print:text-[8pt] print:leading-tight print:text-black">
        Plan działania
      </p>

      {plan.focus ? (
        <p className="mt-1 text-sm leading-5 text-zinc-100 print:mt-0 print:text-[8pt] print:leading-tight print:text-black">
          {plan.focus}
        </p>
      ) : null}

      {plan.steps.length > 0 ? (
        <ol className="mt-2 grid gap-1 sm:grid-cols-2 print:mt-1 print:grid-cols-2 print:gap-x-4 print:gap-y-0">
          {plan.steps.map((step, index) => (
            <li
              key={`${index}-${step}`}
              className="flex gap-2 text-sm leading-5 text-zinc-100 print:text-[8pt] print:leading-tight print:text-black"
            >
              <span className="font-semibold text-sky-400 print:text-black">
                {index + 1}.
              </span>

              <span>{step}</span>
            </li>
          ))}
        </ol>
      ) : null}

      {plan.checkpoint ? (
        <p className="mt-2 text-sm leading-5 text-amber-200 print:mt-1 print:text-[8pt] print:leading-tight print:text-black">
          <span className="font-semibold">
            Sprawdź:
          </span>{" "}
          {plan.checkpoint}
        </p>
      ) : null}
    </div>
  );
}

function AsdAnswerHint({ children }) {
  return (
    <div className="space-y-1 print:space-y-0">
      <SectionLabel>Odpowiedź</SectionLabel>

      <p className="text-sm leading-6 text-zinc-300 print:text-[8pt] print:leading-tight print:text-black">
        [{children}]
      </p>
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

export default function GeneratedTask({
  task,
  profileValue,
  materialTypeValue,
}) {
  const TaskRenderer =
    TASK_RENDERERS[task.taskSubtype];

  if (!TaskRenderer) {
    throw new Error(
      `Brak renderera dla typu zadania: ${
        task.taskSubtype || "[brak]"
      }.`
    );
  }

  const profilePresentation =
    getTaskProfilePresentation({
      task,
      profileValue,
      materialTypeValue,
    });

  return (
    <div className="space-y-4">
      {profilePresentation.objective ? (
        <AsdObjective>
          {profilePresentation.objective}
        </AsdObjective>
      ) : null}

      <TaskRenderer task={task} />

      {profilePresentation.plan ? (
        <AdhdPlan
          plan={profilePresentation.plan}
        />
      ) : null}

      {profilePresentation.answerHint ? (
        <AsdAnswerHint>
          {profilePresentation.answerHint}
        </AsdAnswerHint>
      ) : null}

      <TaskAnswerArea
        taskSubtype={task.taskSubtype}
      />
    </div>
  );
}
