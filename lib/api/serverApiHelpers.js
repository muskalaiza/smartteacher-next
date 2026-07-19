import "server-only"

import {
  createClient,
} from "@supabase/supabase-js"

import {
  NextResponse,
} from "next/server"

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store",
}

export function jsonResponse(
  body,
  status = 200
) {
  return NextResponse.json(
    body,
    {
      status,
      headers:
        NO_STORE_HEADERS,
    }
  )
}

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

function getServerSupabaseKey() {
  const key =
    process.env
      .SUPABASE_SECRET_KEY ||
    process.env
      .SUPABASE_SERVICE_ROLE_KEY

  if (!key) {
    throw new Error(
      "Brak SUPABASE_SECRET_KEY albo SUPABASE_SERVICE_ROLE_KEY."
    )
  }

  return key
}

function createAuthClient() {
  return createClient(
    getRequiredEnvironmentVariable(
      "NEXT_PUBLIC_SUPABASE_URL"
    ),

    getRequiredEnvironmentVariable(
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"
    ),

    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    }
  )
}

function createAdminClient() {
  return createClient(
    getRequiredEnvironmentVariable(
      "NEXT_PUBLIC_SUPABASE_URL"
    ),

    getServerSupabaseKey(),

    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    }
  )
}

function getBearerToken(
  request
) {
  const authorizationHeader =
    request.headers.get(
      "authorization"
    ) || ""

  const match =
    authorizationHeader.match(
      /^Bearer\s+(.+)$/i
    )

  return (
    match?.[1]?.trim() ||
    null
  )
}

export async function getAuthenticatedRouteContext(
  request
) {
  const accessToken =
    getBearerToken(request)

  if (!accessToken) {
    return {
      ok: false,
      status: 401,
      error:
        "Brak poprawnego tokenu autoryzacyjnego.",
    }
  }

  const authClient =
    createAuthClient()

  const {
    data: {
      user,
    },
    error: userError,
  } =
    await authClient.auth
      .getUser(accessToken)

  if (
    userError ||
    !user
  ) {
    return {
      ok: false,
      status: 401,
      error:
        "Sesja użytkownika jest nieprawidłowa albo wygasła.",
    }
  }

  return {
    ok: true,
    user,
    supabaseAdmin:
      createAdminClient(),
  }
}

export function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    String(value || "")
  )
}

export function getErrorMessage(
  error
) {
  if (
    error instanceof Error &&
    error.message
  ) {
    return error.message
  }

  return String(
    error ||
      "Nieznany błąd endpointu."
  )
}
