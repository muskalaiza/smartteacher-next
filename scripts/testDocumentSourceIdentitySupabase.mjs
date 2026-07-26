import assert from "node:assert/strict"

import {
  createClient,
} from "@supabase/supabase-js"

import {
  buildDocumentSourceIdentity,
} from "../lib/privateRag/buildDocumentSourceIdentity.js"

const DEFAULT_DOCUMENT_NAME =
  "zmienne_CPP_semantic.docx"

function getRequiredEnvironmentVariable(
  name
) {
  const value =
    process.env[name]

  if (!value) {
    throw new Error(
      `Brak wymaganej zmiennej środowiskowej: ${name}.`
    )
  }

  return value
}

function getSupabaseServerKey() {
  const key =
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!key) {
    throw new Error(
      "Brak SUPABASE_SECRET_KEY albo SUPABASE_SERVICE_ROLE_KEY."
    )
  }

  return key
}

function createSupabaseAdmin() {
  return createClient(
    getRequiredEnvironmentVariable(
      "NEXT_PUBLIC_SUPABASE_URL"
    ),

    getSupabaseServerKey(),

    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    }
  )
}

async function getDocument({
  supabaseAdmin,
  documentName,
}) {
  const {
    data,
    error,
  } =
    await supabaseAdmin
      .from("teacher_documents")
      .select(
        [
          "id",
          "owner_id",
          "lesson_topic_id",
          "original_file_name",
          "status",
          "source_fingerprint",
          "source_manifest_version",
          "ready_at",
          "created_at",
        ].join(", ")
      )
      .eq(
        "original_file_name",
        documentName
      )
      .order(
        "created_at",
        {
          ascending: false,
        }
      )
      .limit(2)

  if (error) {
    throw new Error(
      `Nie udało się pobrać dokumentu: ${error.message}`
    )
  }

  if (
    !Array.isArray(data) ||
    data.length === 0
  ) {
    throw new Error(
      `Nie znaleziono dokumentu: ${documentName}.`
    )
  }

  if (data.length > 1) {
    throw new Error(
      `Znaleziono więcej niż jeden dokument o nazwie "${documentName}". Test został zatrzymany, aby nie wybrać rekordu przypadkowo.`
    )
  }

  return data[0]
}

async function getDocumentChunks({
  supabaseAdmin,
  documentId,
  ownerId,
}) {
  const {
    data,
    error,
  } =
    await supabaseAdmin
      .from("document_chunks")
      .select(
        [
          "id",
          "document_id",
          "chunk_index",
          "content_hash",
          "heading_path",
          "chunking_version",
        ].join(", ")
      )
      .eq(
        "document_id",
        documentId
      )
      .eq(
        "owner_id",
        ownerId
      )
      .order(
        "chunk_index",
        {
          ascending: true,
        }
      )

  if (error) {
    throw new Error(
      `Nie udało się pobrać chunków dokumentu: ${error.message}`
    )
  }

  if (
    !Array.isArray(data) ||
    data.length === 0
  ) {
    throw new Error(
      "Wybrany dokument nie ma zapisanych chunków."
    )
  }

  return data
}

function getSingleChunkingVersion(
  chunks
) {
  const versions =
    new Set(
      chunks.map(
        (chunk) =>
          chunk.chunking_version
      )
    )

  if (versions.size !== 1) {
    throw new Error(
      "Chunki dokumentu mają różne wersje chunkingu."
    )
  }

  const [
    chunkingVersion,
  ] =
    versions

  if (
    typeof chunkingVersion !==
      "string" ||
    !chunkingVersion.trim()
  ) {
    throw new Error(
      "Chunki dokumentu nie mają poprawnej wersji chunkingu."
    )
  }

  return chunkingVersion
}

async function updateDocumentIdentity({
  supabaseAdmin,
  document,
  sourceIdentity,
}) {
  const now =
    new Date().toISOString()

  const {
    data,
    error,
  } =
    await supabaseAdmin
      .from("teacher_documents")
      .update({
        source_fingerprint:
          sourceIdentity
            .sourceFingerprint,

        source_manifest_version:
          sourceIdentity
            .sourceManifestVersion,

        ready_at:
          document.lesson_topic_id
            ? now
            : null,

        updated_at:
          now,
      })
      .eq(
        "id",
        document.id
      )
      .eq(
        "owner_id",
        document.owner_id
      )
      .select(
        [
          "id",
          "owner_id",
          "lesson_topic_id",
          "original_file_name",
          "status",
          "source_fingerprint",
          "source_manifest_version",
          "ready_at",
        ].join(", ")
      )
      .maybeSingle()

  if (error) {
    throw new Error(
      `Nie udało się zapisać source_fingerprint: ${error.message}`
    )
  }

  if (!data) {
    throw new Error(
      "Aktualizacja dokumentu nie zwróciła rekordu."
    )
  }

  return data
}

async function main() {
  const documentName =
    process.argv[2]
      ?.trim() ||
    DEFAULT_DOCUMENT_NAME

  const supabaseAdmin =
    createSupabaseAdmin()

  console.log(
    "\nTEST SOURCE IDENTITY — SUPABASE"
  )

  console.log(
    `Dokument: ${documentName}`
  )

  /*
    1. Pobranie istniejącego dokumentu.
  */
  const document =
    await getDocument({
      supabaseAdmin,
      documentName,
    })

  console.log(
    `Status przed testem: ${document.status}`
  )

  console.log(
    `Przypisany do tematu: ${
      document.lesson_topic_id
        ? "TAK"
        : "NIE"
    }`
  )

  /*
    2. Pobranie prawdziwych chunków.
  */
  const firstChunks =
    await getDocumentChunks({
      supabaseAdmin,

      documentId:
        document.id,

      ownerId:
        document.owner_id,
    })

  const chunkingVersion =
    getSingleChunkingVersion(
      firstChunks
    )

  /*
    3. Pierwsze obliczenie fingerprintu.
  */
  const firstIdentity =
    buildDocumentSourceIdentity({
      chunks:
        firstChunks,

      chunkingVersion,
    })

  assert.equal(
    firstIdentity
      .sourceChunkCount,
    firstChunks.length,
    "Liczba chunków w fingerprint nie odpowiada liczbie chunków z bazy."
  )

  /*
    4. Zapis fingerprintu do teacher_documents.
  */
  const updatedDocument =
    await updateDocumentIdentity({
      supabaseAdmin,
      document,
      sourceIdentity:
        firstIdentity,
    })

  /*
    5. Ponowny odczyt chunków.
  */
  const secondChunks =
    await getDocumentChunks({
      supabaseAdmin,

      documentId:
        document.id,

      ownerId:
        document.owner_id,
    })

  /*
    6. Drugie, niezależne obliczenie.
  */
  const secondIdentity =
    buildDocumentSourceIdentity({
      chunks:
        secondChunks,

      chunkingVersion:
        getSingleChunkingVersion(
          secondChunks
        ),
    })

  /*
    7. Kontrola deterministyczności
       i zapisu w Supabase.
  */
  assert.equal(
    firstIdentity
      .sourceFingerprint,

    secondIdentity
      .sourceFingerprint,

    "Ponowne obliczenie dało inny fingerprint."
  )

  assert.equal(
    updatedDocument
      .source_fingerprint,

    firstIdentity
      .sourceFingerprint,

    "Fingerprint zapisany w teacher_documents jest niezgodny z obliczonym."
  )

  assert.equal(
    updatedDocument
      .source_manifest_version,

    firstIdentity
      .sourceManifestVersion,

    "Wersja manifestu zapisana w teacher_documents jest niezgodna."
  )

  if (
    document.lesson_topic_id
  ) {
    assert.ok(
      updatedDocument.ready_at,
      "Dokument przypisany do tematu powinien otrzymać ready_at."
    )
  } else {
    assert.equal(
      updatedDocument.ready_at,
      null,
      "Dokument bez lesson_topic_id nie powinien otrzymać ready_at."
    )
  }

  assert.equal(
    updatedDocument.status,
    document.status,
    "Test nie powinien zmieniać statusu dokumentu."
  )

  console.log(
    "\nDocument source identity Supabase test OK"
  )

  console.log({
    documentId:
      document.id,

    sourceFilename:
      document.original_file_name,

    status:
      updatedDocument.status,

    chunkCount:
      firstChunks.length,

    chunkingVersion,

    sourceFingerprint:
      updatedDocument
        .source_fingerprint,

    sourceManifestVersion:
      updatedDocument
        .source_manifest_version,

    readyAt:
      updatedDocument.ready_at,
  })
}

try {
  await main()
} catch (error) {
  console.error(
    "\nDocument source identity Supabase test FAILED"
  )

  console.error(
    error instanceof Error
      ? error.message
      : String(error)
  )

  process.exitCode = 1
}
/*
uruchomienie testu
node --env-file=.env.local scripts\testDocumentSourceIdentitySupabase.mjs
*/