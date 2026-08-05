import {
  createHash,
} from "node:crypto"

const SHA256_PATTERN =
  /^[0-9a-f]{64}$/i

const ALLOWED_TASK_COUNTS =
  new Set([
    5,
    6,
    7,
  ])

const PROFILE_ORDER = [
  "Standard",
  "Dysleksja",
  "ASD",
  "ADHD",
  "Obcojęzyczny",
]

const ALLOWED_PROFILES =
  new Set(
    PROFILE_ORDER
  )

function normalizeNonEmptyString(
  value,
  label
) {
  if (
    typeof value !== "string" ||
    !value.trim()
  ) {
    throw new Error(
      `${label} musi być niepustym tekstem.`
    )
  }

  return value.trim()
}

function normalizeSourceFingerprint(
  sourceFingerprint
) {
  const normalizedFingerprint =
    normalizeNonEmptyString(
      sourceFingerprint,
      "sourceFingerprint"
    )
      .toLowerCase()

  if (
    !SHA256_PATTERN.test(
      normalizedFingerprint
    )
  ) {
    throw new Error(
      "sourceFingerprint musi być poprawnym SHA-256."
    )
  }

  return normalizedFingerprint
}

function normalizeTaskCount(
  taskCount
) {
  const normalizedTaskCount =
    Number(taskCount)

  if (
    !Number.isInteger(
      normalizedTaskCount
    ) ||
    !ALLOWED_TASK_COUNTS.has(
      normalizedTaskCount
    )
  ) {
    throw new Error(
      "taskCount musi mieć wartość 5, 6 albo 7."
    )
  }

  return normalizedTaskCount
}

function normalizeProfiles(
  profiles
) {
  if (
    !Array.isArray(profiles) ||
    profiles.length === 0
  ) {
    throw new Error(
      "profiles musi być niepustą tablicą."
    )
  }

  const normalizedProfiles =
    profiles.map(
      (profile, index) => {
        const normalizedProfile =
          normalizeNonEmptyString(
            profile,
            `profiles[${index}]`
          )

        if (
          !ALLOWED_PROFILES.has(
            normalizedProfile
          )
        ) {
          throw new Error(
            `Nieobsługiwany profil: ${normalizedProfile}.`
          )
        }

        return normalizedProfile
      }
    )

  if (
    new Set(
      normalizedProfiles
    ).size !==
      normalizedProfiles.length
  ) {
    throw new Error(
      "profiles zawiera duplikaty."
    )
  }

  const selectedProfiles =
    new Set(
      normalizedProfiles
    )

  /*
    Profile są zbiorem, więc kolejność
    zaznaczania checkboxów nie może tworzyć
    innego klucza cache.
  */
  return PROFILE_ORDER.filter(
    (profile) =>
      selectedProfiles.has(
        profile
      )
  )
}

function normalizeTaskPlan({
  taskPlan,
  taskCount,
}) {
  if (
    !Array.isArray(taskPlan) ||
    taskPlan.length !==
      taskCount
  ) {
    throw new Error(
      "Długość taskPlan musi odpowiadać taskCount."
    )
  }

  return taskPlan.map(
    (task, index) => {
      const expectedNumber =
        index + 1

      if (
        !task ||
        typeof task !== "object" ||
        Array.isArray(task)
      ) {
        throw new Error(
          `Nieprawidłowe zadanie w taskPlan na pozycji ${expectedNumber}.`
        )
      }

      if (
        task.number !==
          expectedNumber
      ) {
        throw new Error(
          `Nieprawidłowa kolejność taskPlan. Oczekiwano number=${expectedNumber}.`
        )
      }

      return {
        number:
          expectedNumber,

        taskSubtype:
          normalizeNonEmptyString(
            task.taskSubtype,
            `taskPlan[${index}].taskSubtype`
          ),
      }
    }
  )
}

export function buildGenerationIdentity({
  sourceFingerprint,
  lessonTopicId,
  lessonSectionId,
  topicTitle,
  materialType,
  taskCount,
  profiles,
  taskPlan,
  generatorVersion,
  contentSchemaVersion,
  model,
}) {
  const normalizedTaskCount =
    normalizeTaskCount(
      taskCount
    )

  const normalizedMaterialType =
    normalizeNonEmptyString(
      materialType,
      "materialType"
    )
      .toLowerCase()

  let scopeManifest

  if (
    normalizedMaterialType ===
      "sprawdzian"
  ) {
    if (lessonTopicId !== null) {
      throw new Error(
        "lessonTopicId dla sprawdzianu musi mieć wartość null."
      )
    }

    scopeManifest = {
      lessonSectionId:
        normalizeNonEmptyString(
          lessonSectionId,
          "lessonSectionId"
        ),

      topicTitle:
        normalizeNonEmptyString(
          topicTitle,
          "topicTitle"
        ),
    }
  } else {
    if (
      lessonSectionId !== null &&
      lessonSectionId !== undefined
    ) {
      throw new Error(
        "lessonSectionId może należeć wyłącznie do sprawdzianu."
      )
    }

    scopeManifest = {
      lessonTopicId:
        normalizeNonEmptyString(
          lessonTopicId,
          "lessonTopicId"
        ),

      topicTitle:
        normalizeNonEmptyString(
          topicTitle,
          "topicTitle"
        ),
    }
  }

  /*
    Kolejność właściwości manifestu jest
    częścią jego kanonicznej postaci.
  */
  const generationManifest = {
    sourceFingerprint:
      normalizeSourceFingerprint(
        sourceFingerprint
      ),

    ...scopeManifest,

    materialType:
      normalizedMaterialType,

    taskCount:
      normalizedTaskCount,

    profiles:
      normalizeProfiles(
        profiles
      ),

    taskPlan:
      normalizeTaskPlan({
        taskPlan,

        taskCount:
          normalizedTaskCount,
      }),

    generatorVersion:
      normalizeNonEmptyString(
        generatorVersion,
        "generatorVersion"
      ),

    contentSchemaVersion:
      normalizeNonEmptyString(
        contentSchemaVersion,
        "contentSchemaVersion"
      ),

    model:
      normalizeNonEmptyString(
        model,
        "model"
      ),
  }

  const generationFingerprint =
    createHash("sha256")
      .update(
        JSON.stringify(
          generationManifest
        ),
        "utf8"
      )
      .digest("hex")

  return {
    generationFingerprint,
    generationManifest,
  }
}
