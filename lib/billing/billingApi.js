import "client-only";

import {
  getCurrentAccessToken,
  readJsonResponse,
} from "@/lib/api/clientApiHelpers";

export class BillingApiError extends Error {
  constructor(message, { code = "billing_error", status = 0 } = {}) {
    super(message);
    this.name = "BillingApiError";
    this.code = code;
    this.status = status;
  }
}

function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isNonNegativeInteger(value) {
  return Number.isInteger(value) && value >= 0;
}

function isNullableString(value) {
  return value === null || typeof value === "string";
}

function hasValidMaterialLimits(value) {
  return (
    isRecord(value) &&
    isNonNegativeInteger(
      value["karta pracy"]
    ) &&
    isNonNegativeInteger(
      value["kartkówka"]
    ) &&
    isNonNegativeInteger(
      value["sprawdzian"]
    )
  );
}

function hasValidPlan(value) {
  return (
    isRecord(value) &&
    typeof value.key === "string" &&
    typeof value.name === "string" &&
    typeof value.currency === "string" &&
    isNonNegativeInteger(
      value.priceGrossMinor
    ) &&
    typeof value.billingInterval ===
      "string" &&
    isNonNegativeInteger(
      value.generationLimit
    ) &&
    ["one_time", "recurring"].includes(
      value.accessModel
    ) &&
    hasValidMaterialLimits(
      value.materialLimits
    ) &&
    (
      value.lessonTopicLimit === null ||
      Number.isInteger(
        value.lessonTopicLimit
      ) &&
        value.lessonTopicLimit > 0
    ) &&
    typeof value.requiresPayment ===
      "boolean"
  );
}

function assertPublicPlans(value) {
  if (
    !Array.isArray(value) ||
    value.length !== 2 ||
    !value.every(hasValidPlan)
  ) {
    throw new BillingApiError(
      "Endpoint cennika zwrócił nieprawidłową odpowiedź.",
      {
        code:
          "invalid_pricing_response",
      }
    );
  }

  return value;
}

function assertBillingStatus(value) {
  const access = value?.access;
  const subscription = value?.subscription;
  const plan = value?.plan;
  const usage = value?.usage;
  const freePlan = value?.freePlan;
  const actions = value?.actions;

  const hasValidAccess =
    isRecord(access) &&
    ["free", "none", "internal", "stripe"].includes(access.source) &&
    ["active", "inactive"].includes(access.status);

  const hasValidSubscription =
    isRecord(subscription) &&
    typeof subscription.status === "string" &&
    typeof subscription.cancelAtPeriodEnd === "boolean" &&
    isNullableString(subscription.scheduledCancellationAt) &&
    isNullableString(subscription.currentPeriodStart) &&
    isNullableString(subscription.currentPeriodEnd) &&
    isNullableString(subscription.canceledAt) &&
    isNullableString(subscription.endedAt);

  const hasValidUsage =
    isRecord(usage) &&
    isNonNegativeInteger(usage.generationLimit) &&
    isNonNegativeInteger(usage.usedCount) &&
    isNonNegativeInteger(usage.reservedCount) &&
    isNonNegativeInteger(usage.remainingCount) &&
    isNullableString(usage.periodStart) &&
    isNullableString(usage.periodEnd);

  const hasValidFreePlan =
    freePlan === null ||
    (
      isRecord(freePlan) &&
      ["active", "revoked"].includes(
        freePlan.status
      ) &&
      typeof freePlan.topicAssigned ===
        "boolean" &&
      typeof freePlan.worksheetUsed ===
        "boolean" &&
      typeof freePlan.worksheetReserved ===
        "boolean" &&
      typeof freePlan.quizUsed ===
        "boolean" &&
      typeof freePlan.quizReserved ===
        "boolean" &&
      isNullableString(
        freePlan.convertedAt
      )
    );

  const hasValidActions =
    isRecord(actions) &&
    typeof actions.checkoutAvailable === "boolean" &&
    typeof actions.portalAvailable === "boolean";

  if (
    !isRecord(value) ||
    !hasValidAccess ||
    !hasValidSubscription ||
    !hasValidPlan(plan) ||
    !hasValidUsage ||
    !hasValidFreePlan ||
    !hasValidActions
  ) {
    throw new BillingApiError(
      "Endpoint subskrypcji zwrócił nieprawidłową odpowiedź.",
      { code: "invalid_billing_response" }
    );
  }

  return value;
}

export async function getPublicBillingPlans() {
  let response;

  try {
    response = await fetch(
      "/api/billing/plans",
      {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
        cache: "no-store",
      }
    );
  } catch {
    throw new BillingApiError(
      "Nie udało się połączyć z cennikiem SmartTeacher.",
      {
        code:
          "pricing_connection_failed",
      }
    );
  }

  const responseData =
    await readJsonResponse(response);

  if (!response.ok) {
    throw new BillingApiError(
      responseData?.error ||
        `Pobieranie cennika zakończyło się błędem HTTP ${response.status}.`,
      {
        code:
          responseData?.code ||
          "pricing_request_failed",
        status: response.status,
      }
    );
  }

  return assertPublicPlans(
    responseData?.plans
  );
}

function assertStripeRedirectUrl(value) {
  let redirectUrl;

  try {
    redirectUrl = new URL(value);
  } catch {
    throw new BillingApiError(
      "Stripe zwrócił nieprawidłowy adres przekierowania.",
      { code: "invalid_stripe_redirect" }
    );
  }

  const isStripeHost =
    redirectUrl.hostname === "stripe.com" ||
    redirectUrl.hostname.endsWith(".stripe.com");

  if (
    redirectUrl.protocol !== "https:" ||
    !isStripeHost ||
    redirectUrl.username ||
    redirectUrl.password
  ) {
    throw new BillingApiError(
      "Stripe zwrócił nieprawidłowy adres przekierowania.",
      { code: "invalid_stripe_redirect" }
    );
  }

  return redirectUrl.toString();
}

async function requestBillingEndpoint({ supabase, endpoint, method }) {
  let accessToken;

  try {
    accessToken = await getCurrentAccessToken(supabase);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Nie udało się pobrać sesji użytkownika.";

    const isMissingSession = message.includes("Zaloguj się ponownie");

    throw new BillingApiError(message, {
      code: isMissingSession ? "auth_required" : "session_error",
      status: isMissingSession ? 401 : 0,
    });
  }

  let response;

  try {
    response = await fetch(endpoint, {
      method,
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      cache: "no-store",
    });
  } catch {
    throw new BillingApiError(
      "Nie udało się połączyć z usługą subskrypcji.",
      { code: "billing_connection_failed" }
    );
  }

  const responseData = await readJsonResponse(response);

  if (!response.ok) {
    throw new BillingApiError(
      responseData?.error ||
        `Operacja subskrypcji zakończyła się błędem HTTP ${response.status}.`,
      {
        code:
          responseData?.code ||
          (response.status === 401 ? "auth_required" : "billing_request_failed"),
        status: response.status,
      }
    );
  }

  return responseData;
}

export async function getBillingStatus({ supabase }) {
  const responseData = await requestBillingEndpoint({
    supabase,
    endpoint: "/api/billing/status",
    method: "GET",
  });

  return assertBillingStatus(responseData?.billing);
}

export async function createBillingCheckout({ supabase }) {
  const responseData = await requestBillingEndpoint({
    supabase,
    endpoint: "/api/billing/checkout",
    method: "POST",
  });

  return assertStripeRedirectUrl(responseData?.url);
}

export async function createBillingPortal({ supabase }) {
  const responseData = await requestBillingEndpoint({
    supabase,
    endpoint: "/api/billing/portal",
    method: "POST",
  });

  return assertStripeRedirectUrl(responseData?.url);
}
