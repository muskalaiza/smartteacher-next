//jest używane w parserze do zbudowania treści pytania dla typów, które nie zawsze mają klasyczne pole question


export const QUESTION_BUILDERS = {
  error_find: (task) =>
    `${task?.instruction || "Znajdź i popraw błąd w poniższym kodzie:"}\n\n${task?.codeWithError || ""}`,

  open_code: (task) => {
    const reqs =
      Array.isArray(task?.requirements) && task.requirements.length > 0
        ? task.requirements
            .map((req, index) => `${index + 1}. ${req}`)
            .join("\n")
        : "";

    return `${task?.instruction || "Napisz krótki program zgodnie z wymaganiami:"}\n\n${reqs}`.trim();
  },

  open_explain: (task) =>
    `${task?.instruction || "Wyjaśnij działanie poniższego fragmentu:"}\n\n${task?.context || ""}`
};
