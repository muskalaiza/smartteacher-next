import assert from "node:assert/strict"
import {
  readFile,
} from "node:fs/promises"

const generateRoute =
  await readFile(
    new URL(
      "../app/api/generate/route.js",
      import.meta.url
    ),
    "utf8"
  )

const generationApi =
  await readFile(
    new URL(
      "../lib/generation/generationApi.js",
      import.meta.url
    ),
    "utf8"
  )

const generatorPage =
  await readFile(
    new URL(
      "../app/przedmioty/[subjectKey]/generator/page.jsx",
      import.meta.url
    ),
    "utf8"
  )

for (const {
  endpointStatus,
  httpStatus,
  actionLabel,
} of [
  {
    endpointStatus:
      "subscription_required",
    httpStatus: 402,
    actionLabel:
      "Przejdź do subskrypcji",
  },
  {
    endpointStatus:
      "generation_limit_exhausted",
    httpStatus: 429,
    actionLabel:
      "Sprawdź plan i wykorzystanie",
  },
  {
    endpointStatus:
      "free_plan_restriction",
    httpStatus: 403,
    actionLabel:
      "Zobacz zasady Planu Free",
  },
]) {
  assert.match(
    generateRoute,
    new RegExp(
      `status:\\s*\\n?\\s*"${endpointStatus}"[\\s\\S]{0,220}?,\\s*\\n?\\s*${httpStatus}\\s*\\n?\\s*\\)`
    ),
    `Route Handler powinien zwracać ${endpointStatus} z HTTP ${httpStatus}.`
  )

  assert.match(
    generationApi,
    new RegExp(
      `"${endpointStatus}"`
    ),
    `Klient API powinien zachowywać kod ${endpointStatus}.`
  )

  assert.match(
    generatorPage,
    new RegExp(actionLabel),
    `${endpointStatus}: Generator powinien zawierać właściwe CTA.`
  )
}

assert.match(
  generateRoute,
  /free_plan_restriction[\s\S]*?429/
)
assert.match(
  generateRoute,
  /free_plan_restriction[\s\S]*?409/
)

assert.match(
  generationApi,
  /export class GenerationApiError extends Error/
)
assert.match(
  generationApi,
  /code:\s*\n?\s*responseData\?\.status/
)
assert.match(
  generationApi,
  /status:\s*\n?\s*response\.status/
)

assert.match(
  generatorPage,
  /error instanceof\s*\n?\s*GenerationApiError/
)
assert.match(
  generatorPage,
  /href="\/subskrypcja"/
)
assert.match(
  generatorPage,
  /border-amber-500\/30/
)
assert.match(
  generatorPage,
  /border-red-500\/30/
)

console.log(
  "Generation access UI contract: OK"
)
