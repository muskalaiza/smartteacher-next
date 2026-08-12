import assert from "node:assert/strict"
import {
  readFile,
} from "node:fs/promises"

async function read(relativePath) {
  return readFile(
    new URL(
      `../${relativePath}`,
      import.meta.url
    ),
    "utf8"
  )
}

const [
  migration,
  stripeServer,
  freePlanServer,
  publicPlansRoute,
  billingApi,
  pricingPage,
  subscriptionPage,
  registerForm,
  generatedMaterialsCache,
] = await Promise.all([
  read(
    "supabase/sql/2026-08-12_free_plan_and_pricing.sql"
  ),
  read("lib/billing/stripeServer.js"),
  read("lib/billing/freePlanServer.js"),
  read(
    "app/api/billing/plans/route.js"
  ),
  read("lib/billing/billingApi.js"),
  read("app/cennik/page.jsx"),
  read("app/subskrypcja/page.jsx"),
  read("components/auth/registerForm.jsx"),
  read(
    "lib/generation/generatedMaterialsCache.js"
  ),
])

for (const value of [
  "smartteacher_free_v1",
  "smartteacher_monthly_pln_v1",
  "worksheet_generation_limit",
  "quiz_generation_limit",
  "test_generation_limit",
  "lesson_topic_limit",
  "ensure_free_plan_entitlement",
  "generation_quota_reservations_free_guard",
  "generation_quota_reservations_free_finalize",
  "teacher_subscriptions_end_free_plan",
]) {
  assert.match(
    migration,
    new RegExp(value)
  )
}

assert.match(
  migration,
  /'smartteacher_free_v1'[\s\S]*?'PLN'[\s\S]*?\n\s*0,[\s\S]*?'one_time'[\s\S]*?\n\s*2,[\s\S]*?\n\s*1,[\s\S]*?\n\s*1,[\s\S]*?\n\s*0,[\s\S]*?\n\s*1/
)
assert.match(
  migration,
  /email_confirmed_at is not null/
)
assert.match(
  migration,
  /free_plan_material_not_allowed/
)
assert.match(
  migration,
  /free_plan_material_type_exhausted/
)
assert.match(
  migration,
  /free_plan_topic_mismatch/
)
assert.match(
  migration,
  /status = 'revoked'/
)
assert.match(
  migration,
  /to service_role/
)
assert.match(
  migration,
  /from public, anon, authenticated/
)

assert.match(
  freePlanServer,
  /ensure_free_plan_entitlement/
)
assert.match(
  stripeServer,
  /export async function getPublicBillingPlans/
)
assert.match(
  stripeServer,
  /accessSource = "free"/
)
assert.match(
  stripeServer,
  /entitlement_type ===[\s\S]*?"project_owner"/
)
assert.match(
  publicPlansRoute,
  /export async function GET/
)
assert.match(
  publicPlansRoute,
  /getPublicBillingPlans/
)
assert.doesNotMatch(
  publicPlansRoute,
  /provider_price_id/
)

assert.match(
  billingApi,
  /export async function getPublicBillingPlans/
)
assert.match(
  billingApi,
  /"free", "none", "internal", "stripe"/
)
assert.match(
  pricingPage,
  /getPublicBillingPlans\(\)/
)
assert.match(
  pricingPage,
  /Wypróbuj bezpłatnie/
)
assert.match(
  pricingPage,
  /Załóż konto i wybierz plan/
)
assert.match(
  subscriptionPage,
  /Przejdź na plan miesięczny/
)
assert.match(
  subscriptionPage,
  /Zestaw startowy/
)
assert.match(
  registerForm,
  /href="\/cennik"/
)

for (const state of [
  "free_material_not_allowed",
  "free_material_type_exhausted",
  "free_topic_mismatch",
]) {
  assert.match(
    generatedMaterialsCache,
    new RegExp(state)
  )
}

console.log(
  "Free plan and pricing contract: OK"
)
