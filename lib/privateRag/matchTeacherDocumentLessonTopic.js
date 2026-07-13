const LANGUAGE_PHRASE_PATTERN =
  /\s+w\s+jezyku\s+(?:cpp|python|java|javascript|csharp)$/

const TRAILING_LANGUAGE_PATTERN =
  /\s+(?:cpp|python|java|javascript|csharp)$/

function normalizeTopicText(value) {
  return String(value || "")
    .replace(/\.docx$/i, "")
    .replace(/^temat\s*[:\-–—]\s*/i, "")
    .replace(/c\+\+/gi, "cpp")
    .replace(/c#/gi, "csharp")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[_\-–—]+/g, " ")
    .replace(/[()[\]{}.,;:!?/\\"'`]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
}

function getSimplifiedKeys(value) {
  const exactKey = normalizeTopicText(value)
  const keys = new Set()

  if (!exactKey) return keys

  const withoutLanguagePhrase = exactKey
    .replace(LANGUAGE_PHRASE_PATTERN, "")
    .trim()
 keys.add(exactKey)
  const withoutTrailingLanguage =
    withoutLanguagePhrase
      .replace(TRAILING_LANGUAGE_PATTERN, "")
      .trim()

  if (
    withoutLanguagePhrase &&
    withoutLanguagePhrase !== exactKey
  ) {
    keys.add(withoutLanguagePhrase)
  }

  if (
    withoutTrailingLanguage &&
    withoutTrailingLanguage !== exactKey
  ) {
    keys.add(withoutTrailingLanguage)
  }

  return keys
}

function getTitleCandidates({
  blocks,
  sourceFilename,
}) {
  const candidates = []

  const topicHeading = blocks.find(
    (block) =>
      block?.block_type === "heading" &&
      /^temat\s*:/i.test(
        String(block?.content || "").trim()
      )
  )

  if (topicHeading?.content) {
    candidates.push({
      source: "topic_heading",
      value: topicHeading.content,
    })
  }

  const firstHeading = blocks.find(
    (block) =>
      block?.block_type === "heading" &&
      String(block?.content || "").trim()
  )

  if (
    firstHeading?.content &&
    firstHeading.content !== topicHeading?.content
  ) {
    candidates.push({
      source: "first_heading",
      value: firstHeading.content,
    })
  }

  const headingPathTitle = blocks.find(
    (block) =>
      Array.isArray(block?.heading_path) &&
      typeof block.heading_path[0] === "string" &&
      block.heading_path[0].trim()
  )?.heading_path?.[0]

  if (
    headingPathTitle &&
    !candidates.some(
      (candidate) =>
        candidate.value === headingPathTitle
    )
  ) {
    candidates.push({
      source: "heading_path",
      value: headingPathTitle,
    })
  }

  if (sourceFilename) {
    candidates.push({
      source: "filename",
      value: sourceFilename,
    })
  }

  return candidates
}

function findMatches({
  topics,
  candidateValue,
}) {
  const exactKey = normalizeTopicText(
    candidateValue
  )

  if (!exactKey) {
    return null
  }

  const exactMatches = topics.filter(
    (topic) =>
      normalizeTopicText(
        topic?.display_title
      ) === exactKey
  )

  if (exactMatches.length > 0) {
    return {
      matchType: "exact",
      matches: exactMatches,
    }
  }

  const candidateKeys = getSimplifiedKeys(
    candidateValue
  )

  if (candidateKeys.size === 0) {
    return null
  }

  const normalizedMatches = topics.filter(
    (topic) => {
      const topicKeys = getSimplifiedKeys(
        topic?.display_title
      )

      return [...candidateKeys].some(
        (key) => topicKeys.has(key)
      )
    }
  )

  if (normalizedMatches.length === 0) {
    return null
  }

  return {
    matchType: "normalized",
    matches: normalizedMatches,
  }
}

export function matchTeacherDocumentLessonTopic({
  blocks,
  sourceFilename,
  topics,
}) {
  if (!Array.isArray(blocks)) {
    throw new Error(
      "Dopasowanie tematu wymaga tablicy bloków dokumentu."
    )
  }

  if (!Array.isArray(topics)) {
    throw new Error(
      "Dopasowanie tematu wymaga tablicy tematów lekcji."
    )
  }

  const candidates = getTitleCandidates({
    blocks,
    sourceFilename,
  })

  for (const candidate of candidates) {
    const result = findMatches({
      topics,
      candidateValue: candidate.value,
    })

    if (!result) continue

    if (result.matches.length === 1) {
      return {
        status: "matched",
        candidateTitle: candidate.value,
        candidateSource: candidate.source,
        matchType: result.matchType,
        topic: result.matches[0],
        candidates: result.matches,
      }
    }

    return {
      status: "ambiguous",
      candidateTitle: candidate.value,
      candidateSource: candidate.source,
      matchType: result.matchType,
      topic: null,
      candidates: result.matches,
    }
  }

  return {
    status: "unmatched",
    candidateTitle:
      candidates[0]?.value || null,
    candidateSource:
      candidates[0]?.source || null,
    matchType: null,
    topic: null,
    candidates: [],
  }
}


/*
uruchomienie testu:
node --env-file=.env.local scripts\testTeacherDocumentLessonTopicMatching.mjs
*/