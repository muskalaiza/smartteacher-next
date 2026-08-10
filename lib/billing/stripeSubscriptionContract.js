const STRIPE_OWNER_METADATA_KEY =
  "smartteacher_owner_id"

const STRIPE_PLAN_METADATA_KEY =
  "smartteacher_plan_key"

export const SUPPORTED_STRIPE_WEBHOOK_EVENTS =
  new Set([
    "checkout.session.completed",
    "customer.subscription.created",
    "customer.subscription.updated",
    "customer.subscription.deleted",
    "customer.subscription.paused",
    "customer.subscription.resumed",
    "invoice.paid",
    "invoice.payment_failed",
  ])

function getExpandableId(value) {
  if (typeof value === "string") {
    return value.trim() || null
  }

  if (
    value &&
    typeof value === "object" &&
    typeof value.id === "string"
  ) {
    return value.id.trim() || null
  }

  return null
}

function unixTimestampToIso(
  value,
  fieldName,
  { nullable = false } = {}
) {
  if (
    nullable &&
    (value === null ||
      value === undefined)
  ) {
    return null
  }

  if (
    !Number.isInteger(value) ||
    value < 0
  ) {
    throw new Error(
      `Stripe zwrócił nieprawidłowe pole ${fieldName}.`
    )
  }

  return new Date(
    value * 1000
  ).toISOString()
}

export function getStripeSubscriptionIdFromEvent(
  event
) {
  if (
    !event ||
    !SUPPORTED_STRIPE_WEBHOOK_EVENTS.has(
      event.type
    )
  ) {
    return null
  }

  const eventObject =
    event.data?.object

  if (!eventObject) {
    return null
  }

  if (
    event.type.startsWith(
      "customer.subscription."
    )
  ) {
    return getExpandableId(
      eventObject
    )
  }

  if (
    event.type ===
    "checkout.session.completed"
  ) {
    return getExpandableId(
      eventObject.subscription
    )
  }

  return getExpandableId(
    eventObject.parent
      ?.subscription_details
      ?.subscription
  ) || getExpandableId(
    eventObject.subscription
  )
}

export function normalizeStripeSubscription({
  subscription,
  event,
}) {
  if (
    !subscription ||
    subscription.object !==
      "subscription"
  ) {
    throw new Error(
      "Stripe nie zwrócił subskrypcji."
    )
  }

  const items =
    subscription.items?.data

  if (
    !Array.isArray(items) ||
    items.length !== 1
  ) {
    throw new Error(
      "Plan SmartTeacher wymaga dokładnie jednej pozycji subskrypcji Stripe."
    )
  }

  const item = items[0]
  const ownerId =
    subscription.metadata?.[
      STRIPE_OWNER_METADATA_KEY
    ]?.trim()
  const planKey =
    subscription.metadata?.[
      STRIPE_PLAN_METADATA_KEY
    ]?.trim()
  const customerId =
    getExpandableId(
      subscription.customer
    )
  const priceId =
    getExpandableId(item.price)

  if (
    !ownerId ||
    !planKey ||
    !customerId ||
    !priceId
  ) {
    throw new Error(
      "Subskrypcja Stripe nie zawiera pełnej tożsamości SmartTeacher."
    )
  }

  if (
    !event ||
    typeof event.id !== "string" ||
    typeof event.type !== "string" ||
    !Number.isInteger(event.created) ||
    typeof event.livemode !== "boolean"
  ) {
    throw new Error(
      "Zdarzenie Stripe ma nieprawidłowy kontrakt."
    )
  }

  return {
    eventId: event.id,
    eventType: event.type,
    eventCreatedAt:
      unixTimestampToIso(
        event.created,
        "event.created"
      ),
    livemode: event.livemode,
    ownerId,
    planKey,
    priceId,
    customerId,
    subscriptionId:
      subscription.id,
    subscriptionCreatedAt:
      unixTimestampToIso(
        subscription.created,
        "subscription.created"
      ),
    status: subscription.status,
    cancelAtPeriodEnd:
      subscription.cancel_at_period_end ===
      true,
    currentPeriodStart:
      unixTimestampToIso(
        item.current_period_start,
        "items.data[0].current_period_start"
      ),
    currentPeriodEnd:
      unixTimestampToIso(
        item.current_period_end,
        "items.data[0].current_period_end"
      ),
    canceledAt:
      unixTimestampToIso(
        subscription.canceled_at,
        "subscription.canceled_at",
        { nullable: true }
      ),
    endedAt:
      unixTimestampToIso(
        subscription.ended_at,
        "subscription.ended_at",
        { nullable: true }
      ),
  }
}

export const STRIPE_BILLING_METADATA =
  Object.freeze({
    ownerId:
      STRIPE_OWNER_METADATA_KEY,
    planKey:
      STRIPE_PLAN_METADATA_KEY,
  })
