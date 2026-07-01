import { createClient } from "@supabase/supabase-js";

/*
  PRIVATE RAG SUPABASE ADMIN CLIENT v1

  Odpowiedzialność pliku:
  - utworzyć serwerowego klienta Supabase dla testowej bazy private RAG,
  - korzystać wyłącznie ze zmiennych PRIVATE_RAG_*,
  - zablokować działanie, jeśli brakuje konfiguracji.

  Ten plik NIE:
  - korzysta z produkcyjnych zmiennych Supabase,
  - działa w przeglądarce,
  - zapisuje danych samodzielnie,
  - wykonuje ingestion,
  - tworzy embeddingów,
  - dotyka generate.js ani UI.
*/

function getRequiredEnv(name) {
  const value = process.env[name];

  if (!value || typeof value !== "string" || !value.trim()) {
    throw new Error(
      `Brak wymaganej zmiennej środowiskowej: ${name}.`
    );
  }

  return value.trim();
}

export function createPrivateRagSupabaseAdmin() {
  const supabaseUrl = getRequiredEnv("PRIVATE_RAG_SUPABASE_URL");
  const serviceRoleKey = getRequiredEnv(
    "PRIVATE_RAG_SUPABASE_SERVICE_ROLE_KEY"
  );

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
}
