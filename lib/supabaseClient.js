import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl) {
  throw new Error("Brak NEXT_PUBLIC_SUPABASE_URL w .env.local");
}

if (!supabaseKey) {
  throw new Error("Brak NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY w .env.local");
}

export const supabase = createClient(supabaseUrl, supabaseKey);