
import { createClient } from "@supabase/supabase-js";

export async function verifyGenerationAccess(req) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.replace("Bearer ", "")
    : null;

  if (!token) {
    return {
      ok: false,
      status: 401,
      error: "Brak autoryzacji użytkownika."
    };
  }

  const supabaseAuth = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const {
    data: { user },
    error: userError,
  } = await supabaseAuth.auth.getUser(token);

  if (userError || !user) {
    return {
      ok: false,
      status: 401,
      error: "Nieprawidłowa sesja użytkownika."
    };
  }

  const { data: userProfile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("id, email, generations_limit, generations_used")
    .eq("id", user.id)
    .single();

  if (profileError || !userProfile) {
    console.error("PROFILE ERROR:", profileError);
    console.error("AUTH USER:", user.id, user.email);

    return {
      ok: false,
      status: 403,
      error: "Brak profilu testowego użytkownika."
    };
  }

  if (userProfile.generations_used >= userProfile.generations_limit) {
    return {
      ok: false,
      status: 403,
      error: "Limit generowań został wykorzystany."
    };
  }

  return {
    ok: true,
    user,
    userProfile,
    supabaseAdmin
  };
}

export async function reserveGenerationSlot(supabaseAdmin, userId) {
  const { data, error } = await supabaseAdmin.rpc(
    "reserve_generation_slot",
    {
      p_user_id: userId
    }
  );

  if (error) {
    console.error("Błąd rezerwacji limitu generowania:", error);

    return {
      ok: false,
      status: 500,
      error: "Nie udało się sprawdzić limitu generowań."
    };
  }

  if (data !== true) {
    return {
      ok: false,
      status: 403,
      error: "Limit generowań został wykorzystany."
    };
  }

  return {
    ok: true
  };
}

export async function releaseGenerationSlot(supabaseAdmin, userId) {
  const { error } = await supabaseAdmin.rpc(
    "release_generation_slot",
    {
      p_user_id: userId
    }
  );

  if (error) {
    console.error("Błąd zwolnienia limitu generowania:", error);
    return false;
  }

  return true;
}