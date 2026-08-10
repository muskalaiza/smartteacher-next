import assert from "node:assert/strict"
import {
  readFile,
} from "node:fs/promises"

import {
  getStripeSubscriptionIdFromEvent,
  normalizeStripeSubscription,
  SUPPORTED_STRIPE_WEBHOOK_EVENTS,
} from "../lib/billing/stripeSubscriptionContract.js"

const ownerId =
  "5f066c58-e4c8-4228-b161-4d573da8655d"

const baseEvent = {
  id: "evt_test_1",
  type:
    "customer.subscription.updated",
  created: 1786311000,
  livemode: false,
  data: {
    object: {
      id: "sub_test_1",
    },
  },
}

const baseSubscription = {
  id: "sub_test_1",
  object: "subscription",
  created: 1786310000,
  livemode: false,
  customer: "cus_test_1",
  status: "active",
  cancel_at_period_end: false,
  canceled_at: null,
  ended_at: null,
  metadata: {
    smartteacher_owner_id:
      ownerId,
    smartteacher_plan_key:
      "smartteacher_monthly_pln_v1",
  },
  items: {
    data: [
      {
        current_period_start:
          1786310000,
        current_period_end:
          1788988400,
        price: {
          id: "price_test_1",
        },
      },
    ],
  },
}

assert.equal(
  getStripeSubscriptionIdFromEvent(
    baseEvent
  ),
  "sub_test_1"
)

assert.equal(
  getStripeSubscriptionIdFromEvent({
    ...baseEvent,
    type:
      "checkout.session.completed",
    data: {
      object: {
        subscription:
          "sub_checkout_1",
      },
    },
  }),
  "sub_checkout_1"
)

assert.equal(
  getStripeSubscriptionIdFromEvent({
    ...baseEvent,
    type: "invoice.paid",
    data: {
      object: {
        parent: {
          subscription_details: {
            subscription:
              "sub_modern_invoice",
          },
        },
      },
    },
  }),
  "sub_modern_invoice"
)

assert.equal(
  getStripeSubscriptionIdFromEvent({
    ...baseEvent,
    type:
      "invoice.payment_failed",
    data: {
      object: {
        subscription:
          "sub_legacy_invoice",
      },
    },
  }),
  "sub_legacy_invoice"
)

assert.equal(
  getStripeSubscriptionIdFromEvent({
    ...baseEvent,
    type: "customer.created",
  }),
  null
)

const normalized =
  normalizeStripeSubscription({
    subscription:
      baseSubscription,
    event: baseEvent,
  })

assert.deepEqual(
  normalized,
  {
    eventId: "evt_test_1",
    eventType:
      "customer.subscription.updated",
    eventCreatedAt:
      "2026-08-09T21:30:00.000Z",
    livemode: false,
    ownerId,
    planKey:
      "smartteacher_monthly_pln_v1",
    priceId: "price_test_1",
    customerId: "cus_test_1",
    subscriptionId: "sub_test_1",
    subscriptionCreatedAt:
      "2026-08-09T21:13:20.000Z",
    status: "active",
    cancelAtPeriodEnd: false,
    currentPeriodStart:
      "2026-08-09T21:13:20.000Z",
    currentPeriodEnd:
      "2026-09-09T21:13:20.000Z",
    canceledAt: null,
    endedAt: null,
  }
)

assert.throws(
  () =>
    normalizeStripeSubscription({
      subscription: {
        ...baseSubscription,
        items: {
          data: [],
        },
      },
      event: baseEvent,
    }),
  /dokładnie jednej pozycji/
)

assert.throws(
  () =>
    normalizeStripeSubscription({
      subscription: {
        ...baseSubscription,
        metadata: {},
      },
      event: baseEvent,
    }),
  /pełnej tożsamości/
)

for (const eventType of [
  "checkout.session.completed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "customer.subscription.paused",
  "customer.subscription.resumed",
  "invoice.paid",
  "invoice.payment_failed",
]) {
  assert.equal(
    SUPPORTED_STRIPE_WEBHOOK_EVENTS.has(
      eventType
    ),
    true
  )
}

const webhookRoute =
  await readFile(
    new URL(
      "../app/api/billing/webhook/route.js",
      import.meta.url
    ),
    "utf8"
  )

assert.match(
  webhookRoute,
  /await request\.text\(\)/
)
assert.doesNotMatch(
  webhookRoute,
  /request\.json\(\)/
)

const stripeServer =
  await readFile(
    new URL(
      "../lib/billing/stripeServer.js",
      import.meta.url
    ),
    "utf8"
  )

assert.match(
  stripeServer,
  /2026-07-29\.dahlia/
)
assert.match(
  stripeServer,
  /items\.data\.price/
)

const stripeContract =
  await readFile(
    new URL(
      "../lib/billing/stripeSubscriptionContract.js",
      import.meta.url
    ),
    "utf8"
  )

assert.match(
  stripeContract,
  /item\.current_period_start/
)
assert.match(
  stripeContract,
  /item\.current_period_end/
)

const migration =
  await readFile(
    new URL(
      "../supabase/sql/2026-08-09_subscription_quota_stripe_backend.sql",
      import.meta.url
    ),
    "utf8"
  )

assert.match(
  migration,
  /security definer/i
)
assert.match(
  migration,
  /to service_role/i
)
assert.match(
  migration,
  /from public, anon, authenticated/i
)
assert.match(
  migration,
  /on conflict \(provider_event_id\)/i
)

console.log(
  "Stripe billing contract test: OK"
)
