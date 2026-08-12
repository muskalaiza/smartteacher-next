import "server-only"

export async function ensureFreePlanEntitlement({
  supabaseAdmin,
  ownerId,
}) {
  if (!supabaseAdmin) {
    throw new Error(
      "Brak serwerowego klienta Supabase dla Planu Free."
    )
  }

  if (
    typeof ownerId !== "string" ||
    !ownerId.trim()
  ) {
    throw new Error(
      "Brak owner_id dla Planu Free."
    )
  }

  const { error } =
    await supabaseAdmin.rpc(
      "ensure_free_plan_entitlement",
      {
        p_owner_id:
          ownerId.trim(),
      }
    )

  if (error) {
    throw new Error(
      `Nie udało się ustalić Planu Free: ${error.message}`
    )
  }
}
