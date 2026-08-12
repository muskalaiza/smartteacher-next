import "server-only"

import {
  createHash,
} from "node:crypto"

import Stripe from "stripe"

import {
  getRequiredEnvironmentVariable,
} from "@/lib/api/serverApiHelpers"

import {
  getStripeSubscriptionIdFromEvent,
  normalizeStripeSubscription,
  STRIPE_BILLING_METADATA,
  SUPPORTED_STRIPE_WEBHOOK_EVENTS,
} from "@/lib/billing/stripeSubscriptionContract"

import {
  ensureFreePlanEntitlement,
} from "@/lib/billing/freePlanServer"

const STRIPE_API_VERSION =
  "2026-07-29.dahlia"

const PAID_PLAN_KEY =
  "smartteacher_monthly_pln_v1"

const FREE_PLAN_KEY =
  "smartteacher_free_v1"

const TERMINAL_SUBSCRIPTION_STATUSES =
  new Set([
    "canceled",
    "incomplete_expired",
  ])

let stripeClient = null

export class BillingRequestError extends Error {
  constructor(
    message,
    {
      code = "billing_error",
      status = 400,
    } = {}
  ) {
    super(message)
    this.name =
      "BillingRequestError"
    this.code = code
    this.status = status
  }
}

function getStripeSecretKey() {
  return getRequiredEnvironmentVariable(
    "STRIPE_SECRET_KEY"
  )
}

function isConfiguredStripeLivemode() {
  const secretKey =
    getStripeSecretKey()

  if (
    secretKey.startsWith(
      "sk_live_"
    )
  ) {
    return true
  }

  if (
    secretKey.startsWith(
      "sk_test_"
    )
  ) {
    return false
  }

  throw new Error(
    "STRIPE_SECRET_KEY musi być standardowym kluczem sk_test_ albo sk_live_."
  )
}

export function getStripeClient() {
  if (!stripeClient) {
    stripeClient = new Stripe(
      getStripeSecretKey(),
      {
        apiVersion:
          STRIPE_API_VERSION,
        maxNetworkRetries: 2,
        timeout: 15000,
      }
    )
  }

  return stripeClient
}

function getSmartTeacherAppUrl() {
  const configuredUrl =
    getRequiredEnvironmentVariable(
      "SMARTTEACHER_APP_URL"
    )

  let url

  try {
    url = new URL(configuredUrl)
  } catch {
    throw new Error(
      "SMARTTEACHER_APP_URL musi być poprawnym adresem URL."
    )
  }

  const isLocalhost =
    url.hostname === "localhost" ||
    url.hostname === "127.0.0.1"

  if (
    url.protocol !== "https:" &&
    !(
      isLocalhost &&
      url.protocol === "http:"
    )
  ) {
    throw new Error(
      "SMARTTEACHER_APP_URL musi używać HTTPS poza localhostem."
    )
  }

  url.pathname = ""
  url.search = ""
  url.hash = ""

  return url.toString().replace(
    /\/$/,
    ""
  )
}

function createStableHash(value) {
  return createHash("sha256")
    .update(value)
    .digest("hex")
}

async function getPlan(
  supabaseAdmin,
  {
    activeOnly = false,
    planKey = PAID_PLAN_KEY,
  } = {}
) {
  let query =
    supabaseAdmin
      .from("subscription_plans")
      .select(
        [
          "id",
          "plan_key",
          "display_name",
          "currency",
          "price_gross_minor",
          "billing_interval",
          "billing_interval_count",
          "generation_limit",
          "access_model",
          "worksheet_generation_limit",
          "quiz_generation_limit",
          "test_generation_limit",
          "lesson_topic_limit",
          "billing_provider",
          "provider_price_id",
          "is_active",
        ].join(", ")
      )
      .eq("plan_key", planKey)

  if (activeOnly) {
    query = query.eq(
      "is_active",
      true
    )
  }

  const {
    data: plan,
    error,
  } = await query.maybeSingle()

  if (error) {
    throw new Error(
      `Nie udało się pobrać planu subskrypcji: ${error.message}`
    )
  }

  if (!plan) {
    throw new Error(
      "Brak aktywnego planu SmartTeacher w bazie."
    )
  }

  return plan
}

function toPublicPlan(plan) {
  const materialLimits = {
    "karta pracy":
      plan
        .worksheet_generation_limit,
    "kartkówka":
      plan.quiz_generation_limit,
    "sprawdzian":
      plan.test_generation_limit,
  }

  return {
    key: plan.plan_key,
    name: plan.display_name,
    currency: plan.currency,
    priceGrossMinor:
      plan.price_gross_minor,
    billingInterval:
      plan.billing_interval,
    generationLimit:
      plan.generation_limit,
    accessModel:
      plan.access_model,
    materialLimits,
    lessonTopicLimit:
      plan.lesson_topic_limit,
    requiresPayment:
      plan.billing_provider ===
      "stripe",
  }
}

export async function getPublicBillingPlans({
  supabaseAdmin,
}) {
  const { data, error } =
    await supabaseAdmin
      .from("subscription_plans")
      .select(
        [
          "plan_key",
          "display_name",
          "currency",
          "price_gross_minor",
          "billing_interval",
          "generation_limit",
          "access_model",
          "worksheet_generation_limit",
          "quiz_generation_limit",
          "test_generation_limit",
          "lesson_topic_limit",
          "billing_provider",
        ].join(", ")
      )
      .eq("is_active", true)
      .in("plan_key", [
        FREE_PLAN_KEY,
        PAID_PLAN_KEY,
      ])
      .order("price_gross_minor", {
        ascending: true,
      })

  if (error) {
    throw new Error(
      `Nie udało się pobrać cennika: ${error.message}`
    )
  }

  if (!Array.isArray(data)) {
    throw new Error(
      "Baza zwróciła nieprawidłowy kontrakt cennika."
    )
  }

  const plans = data.map(
    toPublicPlan
  )

  if (
    plans.length !== 2 ||
    !plans.some(
      (plan) =>
        plan.key === FREE_PLAN_KEY
    ) ||
    !plans.some(
      (plan) =>
        plan.key === PAID_PLAN_KEY
    )
  ) {
    throw new Error(
      "Cennik SmartTeacher nie zawiera obu aktywnych planów."
    )
  }

  return plans
}

function isActiveEntitlement(
  entitlement,
  now
) {
  if (
    !entitlement ||
    entitlement.status !== "active"
  ) {
    return false
  }

  const startsAt = Date.parse(
    entitlement.starts_at
  )
  const endsAt =
    entitlement.ends_at
      ? Date.parse(
          entitlement.ends_at
        )
      : null

  return (
    Number.isFinite(startsAt) &&
    startsAt <= now &&
    (
      endsAt === null ||
      now < endsAt
    )
  )
}

async function getBillingCustomer(
  supabaseAdmin,
  ownerId
) {
  const {
    data,
    error,
  } = await supabaseAdmin
    .from("billing_customers")
    .select(
      "id, owner_id, provider_customer_id"
    )
    .eq("owner_id", ownerId)
    .maybeSingle()

  if (error) {
    throw new Error(
      `Nie udało się pobrać klienta płatności: ${error.message}`
    )
  }

  return data || null
}

async function getOrCreateBillingCustomer({
  supabaseAdmin,
  user,
  stripe,
}) {
  const existingCustomer =
    await getBillingCustomer(
      supabaseAdmin,
      user.id
    )

  if (existingCustomer) {
    return existingCustomer
      .provider_customer_id
  }

  const createdCustomer =
    await stripe.customers.create(
      {
        email:
          user.email || undefined,
        metadata: {
          [STRIPE_BILLING_METADATA.ownerId]:
            user.id,
        },
      },
      {
        idempotencyKey:
          `st-customer-${createStableHash(
            user.id
          )}`,
      }
    )

  const {
    error: insertError,
  } = await supabaseAdmin
    .from("billing_customers")
    .insert({
      owner_id: user.id,
      provider_customer_id:
        createdCustomer.id,
    })

  if (!insertError) {
    return createdCustomer.id
  }

  const concurrentCustomer =
    await getBillingCustomer(
      supabaseAdmin,
      user.id
    )

  if (concurrentCustomer) {
    return concurrentCustomer
      .provider_customer_id
  }

  throw new Error(
    `Nie udało się zapisać klienta płatności: ${insertError.message}`
  )
}

function assertStripePriceMatchesPlan({
  price,
  plan,
}) {
  const expectedLivemode =
    isConfiguredStripeLivemode()

  if (
    !price ||
    price.deleted === true ||
    price.active !== true ||
    price.livemode !==
      expectedLivemode ||
    price.id !==
      plan.provider_price_id ||
    price.type !== "recurring" ||
    price.currency.toUpperCase() !==
      plan.currency ||
    price.unit_amount !==
      plan.price_gross_minor ||
    price.recurring?.interval !==
      plan.billing_interval ||
    price.recurring?.interval_count !==
      plan.billing_interval_count
  ) {
    throw new Error(
      "Cena Stripe nie odpowiada zatwierdzonemu planowi SmartTeacher."
    )
  }
}

async function assertLocalCheckoutAllowed({
  supabaseAdmin,
  ownerId,
}) {
  const now = Date.now()

  const {
    data: entitlement,
    error: entitlementError,
  } = await supabaseAdmin
    .from("internal_entitlements")
    .select(
      "id, entitlement_type, status, starts_at, ends_at"
    )
    .eq("owner_id", ownerId)
    .maybeSingle()

  if (entitlementError) {
    throw new Error(
      `Nie udało się sprawdzić uprawnienia wewnętrznego: ${entitlementError.message}`
    )
  }

  if (
    isActiveEntitlement(
      entitlement,
      now
    ) &&
    entitlement
      .entitlement_type ===
      "project_owner"
  ) {
    throw new BillingRequestError(
      "To konto ma już aktywny dostęp SmartTeacher.",
      {
        code:
          "access_already_active",
        status: 409,
      }
    )
  }

  const {
    data: localSubscriptions,
    error: localSubscriptionError,
  } = await supabaseAdmin
    .from("teacher_subscriptions")
    .select("status")
    .eq("owner_id", ownerId)

  if (localSubscriptionError) {
    throw new Error(
      `Nie udało się sprawdzić subskrypcji: ${localSubscriptionError.message}`
    )
  }

  if (
    localSubscriptions?.some(
      (subscription) =>
        !TERMINAL_SUBSCRIPTION_STATUSES.has(
          subscription.status
        )
    )
  ) {
    throw new BillingRequestError(
      "Subskrypcja już istnieje. Użyj portalu klienta.",
      {
        code:
          "subscription_already_exists",
        status: 409,
      }
    )
  }

}

async function assertNoStripeSubscription({
  customerId,
  stripe,
}) {
  const stripeSubscriptions =
    await stripe.subscriptions.list({
      customer: customerId,
      status: "all",
      limit: 100,
    })

  const hasNonTerminalSubscription =
    stripeSubscriptions.data.some(
      (subscription) =>
        !TERMINAL_SUBSCRIPTION_STATUSES.has(
          subscription.status
        )
    )

  if (hasNonTerminalSubscription) {
    throw new BillingRequestError(
      "Subskrypcja już istnieje w Stripe. Użyj portalu klienta.",
      {
        code:
          "subscription_already_exists",
        status: 409,
      }
    )
  }
}

async function getReusableCheckoutSession({
  stripe,
  customerId,
  ownerId,
  planKey,
}) {
  const sessions =
    await stripe.checkout.sessions.list({
      customer: customerId,
      status: "open",
      limit: 100,
    })

  return sessions.data.find(
    (session) =>
      session.mode ===
        "subscription" &&
      session.metadata?.[
        STRIPE_BILLING_METADATA.ownerId
      ] === ownerId &&
      session.metadata?.[
        STRIPE_BILLING_METADATA.planKey
      ] === planKey &&
      typeof session.url === "string" &&
      session.expires_at * 1000 >
        Date.now()
  ) || null
}

export async function createStripeCheckout({
  supabaseAdmin,
  user,
}) {
  const plan = await getPlan(
    supabaseAdmin,
    { activeOnly: true }
  )

  if (!plan.provider_price_id) {
    throw new BillingRequestError(
      "Plan płatności nie jest jeszcze skonfigurowany.",
      {
        code:
          "billing_not_configured",
        status: 503,
      }
    )
  }

  const stripe = getStripeClient()

  await assertLocalCheckoutAllowed({
    supabaseAdmin,
    ownerId: user.id,
  })

  const price =
    await stripe.prices.retrieve(
      plan.provider_price_id
    )

  assertStripePriceMatchesPlan({
    price,
    plan,
  })

  const customerId =
    await getOrCreateBillingCustomer({
      supabaseAdmin,
      user,
      stripe,
    })

  await assertNoStripeSubscription({
    customerId,
    stripe,
  })

  const reusableSession =
    await getReusableCheckoutSession({
      stripe,
      customerId,
      ownerId: user.id,
      planKey: plan.plan_key,
    })

  if (reusableSession) {
    return {
      checkoutSessionId:
        reusableSession.id,
      url: reusableSession.url,
      reused: true,
    }
  }

  const appUrl =
    getSmartTeacherAppUrl()
  const halfHourBucket =
    Math.floor(
      Date.now() / (30 * 60 * 1000)
    )
  const checkoutKey =
    createStableHash(
      [
        user.id,
        plan.id,
        halfHourBucket,
      ].join(":")
    )

  const session =
    await stripe.checkout.sessions.create(
      {
        mode: "subscription",
        customer: customerId,
        client_reference_id:
          user.id,
        line_items: [
          {
            price:
              plan.provider_price_id,
            quantity: 1,
          },
        ],
        locale: "pl",
        billing_address_collection:
          "auto",
        customer_update: {
          address: "auto",
          name: "auto",
        },
        metadata: {
          [STRIPE_BILLING_METADATA.ownerId]:
            user.id,
          [STRIPE_BILLING_METADATA.planKey]:
            plan.plan_key,
        },
        subscription_data: {
          metadata: {
            [STRIPE_BILLING_METADATA.ownerId]:
              user.id,
            [STRIPE_BILLING_METADATA.planKey]:
              plan.plan_key,
          },
        },
        success_url:
          `${appUrl}/subskrypcja?checkout=success`,
        cancel_url:
          `${appUrl}/subskrypcja?checkout=cancelled`,
      },
      {
        idempotencyKey:
          `st-checkout-${checkoutKey}`,
      }
    )

  if (!session.url) {
    throw new Error(
      "Stripe nie zwrócił adresu Checkout."
    )
  }

  return {
    checkoutSessionId:
      session.id,
    url: session.url,
    reused: false,
  }
}

export async function createStripePortal({
  supabaseAdmin,
  ownerId,
}) {
  const billingCustomer =
    await getBillingCustomer(
      supabaseAdmin,
      ownerId
    )

  if (!billingCustomer) {
    throw new BillingRequestError(
      "Brak klienta Stripe dla tego konta.",
      {
        code:
          "billing_customer_not_found",
        status: 404,
      }
    )
  }

  const session =
    await getStripeClient()
      .billingPortal.sessions.create({
        customer:
          billingCustomer
            .provider_customer_id,
        return_url:
          `${getSmartTeacherAppUrl()}/subskrypcja`,
      })

  return {
    url: session.url,
  }
}

export async function getBillingStatus({
  supabaseAdmin,
  ownerId,
}) {
  await ensureFreePlanEntitlement({
    supabaseAdmin,
    ownerId,
  })

  const now = new Date()
  const nowIso = now.toISOString()

  const [
    paidPlan,
    freePlan,
    entitlementResult,
    subscriptionResult,
    customerResult,
  ] = await Promise.all([
    getPlan(supabaseAdmin),
    getPlan(
      supabaseAdmin,
      {
        planKey:
          FREE_PLAN_KEY,
      }
    ),
    supabaseAdmin
      .from("internal_entitlements")
      .select(
        [
          "id",
          "plan_id",
          "entitlement_type",
          "status",
          "starts_at",
          "ends_at",
          "lesson_topic_id",
          "worksheet_used",
          "worksheet_reserved",
          "quiz_used",
          "quiz_reserved",
          "converted_at",
        ].join(", ")
      )
      .eq("owner_id", ownerId)
      .maybeSingle(),
    supabaseAdmin
      .from("teacher_subscriptions")
      .select(
        [
          "id",
          "plan_id",
          "status",
          "cancel_at_period_end",
          "cancel_at",
          "current_period_start",
          "current_period_end",
          "canceled_at",
          "ended_at",
        ].join(", ")
      )
      .eq("owner_id", ownerId)
      .order(
        "provider_subscription_created_at",
        { ascending: false }
      )
      .limit(1)
      .maybeSingle(),
    supabaseAdmin
      .from("billing_customers")
      .select("id")
      .eq("owner_id", ownerId)
      .maybeSingle(),
  ])

  for (const result of [
    entitlementResult,
    subscriptionResult,
    customerResult,
  ]) {
    if (result.error) {
      throw new Error(
        `Nie udało się pobrać stanu subskrypcji: ${result.error.message}`
      )
    }
  }

  const entitlement =
    entitlementResult.data
  const subscription =
    subscriptionResult.data
  const activeEntitlement =
    isActiveEntitlement(
      entitlement,
      now.getTime()
    )
  const isProjectOwner =
    activeEntitlement &&
    entitlement
      .entitlement_type ===
      "project_owner"
  const isFreeAccess =
    activeEntitlement &&
    entitlement
      .entitlement_type ===
      "free_plan"

  const subscriptionPeriodStart =
    Date.parse(
      subscription
        ?.current_period_start || ""
    )
  const subscriptionPeriodEnd =
    Date.parse(
      subscription
        ?.current_period_end || ""
    )
  const isStripeAccess =
    subscription?.status ===
      "active" &&
    Number.isFinite(
      subscriptionPeriodStart
    ) &&
    Number.isFinite(
      subscriptionPeriodEnd
    ) &&
    subscriptionPeriodStart <=
      now.getTime() &&
    now.getTime() <
      subscriptionPeriodEnd

  let accessSource = "none"
  let accessStatus = "inactive"
  let status =
    subscription?.status || "none"
  let currentPeriodStart =
    subscription
      ?.current_period_start || null
  let currentPeriodEnd =
    subscription
      ?.current_period_end || null
  let usageQuery = null
  let selectedPlan = paidPlan

  if (isProjectOwner) {
    accessSource = "internal"
    accessStatus = "active"
    status = "active"
    selectedPlan = paidPlan
    usageQuery =
      supabaseAdmin
        .from(
          "subscription_usage_periods"
        )
        .select(
          [
            "period_start",
            "period_end",
            "generation_limit",
            "used_count",
            "reserved_count",
          ].join(", ")
        )
        .eq(
          "internal_entitlement_id",
          entitlement.id
        )
        .lte("period_start", nowIso)
        .gt("period_end", nowIso)
        .maybeSingle()
  } else if (isStripeAccess) {
    accessSource = "stripe"
    accessStatus = "active"
    selectedPlan = paidPlan
    usageQuery =
      supabaseAdmin
        .from(
          "subscription_usage_periods"
        )
        .select(
          [
            "period_start",
            "period_end",
            "generation_limit",
            "used_count",
            "reserved_count",
          ].join(", ")
        )
        .eq(
          "subscription_id",
          subscription.id
        )
        .eq(
          "period_start",
          subscription
            .current_period_start
        )
        .eq(
          "period_end",
          subscription
            .current_period_end
        )
        .maybeSingle()
  } else if (isFreeAccess) {
    accessSource = "free"
    accessStatus = "active"
    selectedPlan = freePlan
    currentPeriodStart = null
    currentPeriodEnd = null
  } else if (subscription) {
    accessSource = "stripe"
    selectedPlan = paidPlan
    usageQuery =
      supabaseAdmin
        .from(
          "subscription_usage_periods"
        )
        .select(
          [
            "period_start",
            "period_end",
            "generation_limit",
            "used_count",
            "reserved_count",
          ].join(", ")
        )
        .eq(
          "subscription_id",
          subscription.id
        )
        .eq(
          "period_start",
          subscription
            .current_period_start
        )
        .eq(
          "period_end",
          subscription
            .current_period_end
        )
        .maybeSingle()
  }

  let usage = null

  if (usageQuery) {
    const usageResult =
      await usageQuery

    if (usageResult.error) {
      throw new Error(
        `Nie udało się pobrać użycia planu: ${usageResult.error.message}`
      )
    }

    usage = usageResult.data

    if (usage) {
      currentPeriodStart =
        usage.period_start
      currentPeriodEnd =
        usage.period_end
    }
  }

  const scheduledCancellationAt =
    subscription?.cancel_at ||
    (subscription
      ?.cancel_at_period_end === true
      ? subscription
          .current_period_end || null
      : null)

  const generationLimit = isFreeAccess
    ? freePlan.generation_limit
    : usage?.generation_limit ||
      selectedPlan.generation_limit
  const usedCount = isFreeAccess
    ? Number(
        entitlement
          .worksheet_used === true
      ) +
      Number(
        entitlement.quiz_used ===
          true
      )
    : usage?.used_count || 0
  const reservedCount = isFreeAccess
    ? Number(
        entitlement
          .worksheet_reserved ===
          true
      ) +
      Number(
        entitlement
          .quiz_reserved === true
      )
    : usage?.reserved_count || 0

  return {
    access: {
      source: accessSource,
      status: accessStatus,
    },
    subscription: {
      status,
      cancelAtPeriodEnd:
        subscription
          ?.cancel_at_period_end ===
        true,
      scheduledCancellationAt,
      currentPeriodStart,
      currentPeriodEnd,
      canceledAt:
        subscription?.canceled_at ||
        null,
      endedAt:
        subscription?.ended_at ||
        null,
    },
    plan:
      toPublicPlan(selectedPlan),
    usage: {
      generationLimit,
      usedCount,
      reservedCount,
      remainingCount: Math.max(
        0,
        generationLimit -
          usedCount -
          reservedCount
      ),
      periodStart:
        currentPeriodStart,
      periodEnd: currentPeriodEnd,
    },
    freePlan:
      entitlement
        ?.entitlement_type ===
      "free_plan"
        ? {
            status:
              entitlement.status,
            topicAssigned:
              Boolean(
                entitlement
                  .lesson_topic_id
              ),
            worksheetUsed:
              entitlement
                .worksheet_used ===
              true,
            worksheetReserved:
              entitlement
                .worksheet_reserved ===
              true,
            quizUsed:
              entitlement
                .quiz_used === true,
            quizReserved:
              entitlement
                .quiz_reserved === true,
            convertedAt:
              entitlement
                .converted_at || null,
          }
        : null,
    actions: {
      checkoutAvailable:
        paidPlan.is_active ===
          true &&
        Boolean(
          paidPlan
            .provider_price_id
        ) &&
        !isProjectOwner &&
        !isStripeAccess &&
        (
          !subscription ||
          TERMINAL_SUBSCRIPTION_STATUSES.has(
            subscription.status
          )
        ),
      portalAvailable:
        Boolean(customerResult.data),
    },
  }
}

export function constructStripeWebhookEvent({
  payload,
  signature,
}) {
  if (!signature) {
    throw new BillingRequestError(
      "Brak podpisu Stripe.",
      {
        code:
          "missing_stripe_signature",
        status: 400,
      }
    )
  }

  return getStripeClient()
    .webhooks.constructEvent(
      payload,
      signature,
      getRequiredEnvironmentVariable(
        "STRIPE_WEBHOOK_SECRET"
      )
    )
}

export async function processStripeWebhook({
  event,
  supabaseAdmin,
}) {
  if (
    !SUPPORTED_STRIPE_WEBHOOK_EVENTS.has(
      event.type
    )
  ) {
    return {
      state: "ignored",
      eventType: event.type,
    }
  }

  const expectedLivemode =
    isConfiguredStripeLivemode()

  if (
    event.livemode !==
    expectedLivemode
  ) {
    throw new Error(
      "Tryb zdarzenia Stripe nie odpowiada skonfigurowanemu kluczowi."
    )
  }

  const subscriptionId =
    getStripeSubscriptionIdFromEvent(
      event
    )

  if (!subscriptionId) {
    throw new Error(
      "Obsługiwane zdarzenie Stripe nie zawiera identyfikatora subskrypcji."
    )
  }

  const subscription =
    await getStripeClient()
      .subscriptions.retrieve(
        subscriptionId,
        {
          expand: [
            "items.data.price",
          ],
        }
      )

  const normalized =
    normalizeStripeSubscription({
      subscription,
      event,
    })

  if (
    normalized.subscriptionId !==
      subscriptionId ||
    subscription.livemode !==
      event.livemode
  ) {
    throw new Error(
      "Tożsamość subskrypcji Stripe jest niespójna."
    )
  }

  const {
    data,
    error,
  } = await supabaseAdmin.rpc(
    "sync_stripe_subscription_event",
    {
      p_provider_event_id:
        normalized.eventId,
      p_event_type:
        normalized.eventType,
      p_event_created_at:
        normalized.eventCreatedAt,
      p_livemode:
        normalized.livemode,
      p_owner_id:
        normalized.ownerId,
      p_plan_key:
        normalized.planKey,
      p_provider_price_id:
        normalized.priceId,
      p_provider_customer_id:
        normalized.customerId,
      p_provider_subscription_id:
        normalized.subscriptionId,
      p_subscription_created_at:
        normalized
          .subscriptionCreatedAt,
      p_status:
        normalized.status,
      p_cancel_at_period_end:
        normalized
          .cancelAtPeriodEnd,
      p_current_period_start:
        normalized
          .currentPeriodStart,
      p_current_period_end:
        normalized.currentPeriodEnd,
      p_canceled_at:
        normalized.canceledAt,
      p_ended_at:
        normalized.endedAt,
      p_cancel_at:
        normalized.cancelAt,
    }
  )

  if (error) {
    throw new Error(
      `Nie udało się zsynchronizować subskrypcji Stripe: ${error.message}`
    )
  }

  const result = Array.isArray(data)
    ? data[0]
    : data

  if (!result?.sync_state) {
    throw new Error(
      "RPC synchronizacji Stripe zwróciło nieprawidłowy wynik."
    )
  }

  return {
    state: result.sync_state,
    eventType: event.type,
  }
}
