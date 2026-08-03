function WorksheetSection({
  title,
  children,
  className = "",
}) {
  return (
    <section
      className={`print-worksheet-section space-y-2 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 ${className}`}
    >
      <h4 className="text-sm font-semibold uppercase tracking-wide text-sky-300">
        {title}
      </h4>

      {children}
    </section>
  );
}

function TipCode({ code }) {
  if (!code) {
    return null;
  }

  return (
    <pre className="print-worksheet-tip-code overflow-x-auto whitespace-pre-wrap rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-sm leading-6 text-zinc-100">
      <code>{code}</code>
    </pre>
  );
}

function WorksheetTips({ tips }) {
  return (
    <WorksheetSection
      title="Mini-ściągawka"
      className="print-worksheet-tips"
    >
      <div className="space-y-3">
        {tips.map((tip, index) => (
          <div
            key={`${index}-${tip.title}`}
            className="print-worksheet-tip space-y-2"
          >
            <p className="text-sm leading-6 text-zinc-100">
              <span className="font-semibold">
                {tip.title}:
              </span>{" "}
              {tip.text}
            </p>

            <TipCode code={tip.code} />
          </div>
        ))}
      </div>
    </WorksheetSection>
  );
}

function WorksheetGlossary({ glossary }) {
  return (
    <WorksheetSection
      title="Słowniczek polsko-ukraiński"
      className="print-worksheet-glossary"
    >
      <dl className="grid gap-3 md:grid-cols-2">
        {glossary.map((item) => (
          <div
            key={`${item.term}-${item.translation}`}
            className="print-worksheet-glossary-item space-y-1"
          >
            <dt className="text-sm font-semibold text-zinc-100">
              {item.term} — {item.translation}
            </dt>

            <dd className="text-sm leading-5 text-zinc-300">
              {item.explanation}
            </dd>
          </div>
        ))}
      </dl>
    </WorksheetSection>
  );
}

export default function WorksheetSupport({
  intro,
  tips,
  glossary,
  showGlossary,
}) {
  return (
    <div className="print-worksheet-support space-y-4">
      <WorksheetSection
        title="Wstęp"
        className="print-worksheet-intro"
      >
        <p className="whitespace-pre-wrap text-sm leading-6 text-zinc-100">
          {intro}
        </p>
      </WorksheetSection>

      <WorksheetTips tips={tips} />

      {showGlossary ? (
        <WorksheetGlossary glossary={glossary} />
      ) : null}
    </div>
  );
}
