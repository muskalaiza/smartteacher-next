import "client-only";

export function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    String(value || "")
  );
}


export async function getCurrentUserId(supabase) {
  if (!supabase?.auth || typeof supabase.auth.getUser !== "function") {
    throw new Error("Brak klienta Supabase.");
  }

  const { data, error } = await supabase.auth.getUser();

  if (error) {
    throw new Error("Nie udało się pobrać danych aktualnego użytkownika.");
  }

  const userId = data?.user?.id;

  if (!isUuid(userId)) {
    throw new Error("Musisz być zalogowana, aby kontynuować.");
  }

  return userId;
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
