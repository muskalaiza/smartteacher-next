import "client-only";

export function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    String(value || "")
  );
}

export async function getCurrentAccessToken(
  supabase
) {
  if (!supabase) {
    throw new Error(
      "Brak klienta Supabase."
    );
  }

  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) {
    throw new Error(
      `Nie udało się pobrać sesji użytkownika: ${error.message}`
    );
  }

  const accessToken =
    session?.access_token;

  if (!accessToken) {
    throw new Error(
      "Sesja użytkownika wygasła. Zaloguj się ponownie."
    );
  }

  return accessToken;
}

export async function readJsonResponse(
  response
) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}
