import {
  createAdminClient,
  getErrorMessage,
  jsonResponse,
} from "@/lib/api/serverApiHelpers"

import {
  BillingRequestError,
  constructStripeWebhookEvent,
  processStripeWebhook,
} from "@/lib/billing/stripeServer"

export const runtime = "nodejs"

export async function POST(request) {
  const payload =
    await request.text()
  const signature =
    request.headers.get(
      "stripe-signature"
    )

  let event

  try {
    event =
      constructStripeWebhookEvent({
        payload,
        signature,
      })
  } catch (error) {
    const errorMessage =
      getErrorMessage(error)

    console.error(
      "Stripe webhook signature failed:",
      errorMessage
    )

    return jsonResponse(
      {
        error:
          error instanceof
          BillingRequestError
            ? error.message
            : "Nieprawidłowy podpis webhooka Stripe.",
      },
      400
    )
  }

  try {
    const result =
      await processStripeWebhook({
        event,
        supabaseAdmin:
          createAdminClient(),
      })

    return jsonResponse({
      received: true,
      ...result,
    })
  } catch (error) {
    const errorMessage =
      getErrorMessage(error)

    console.error(
      "Stripe webhook processing failed:",
      errorMessage
    )

    return jsonResponse(
      {
        error:
          "Nie udało się przetworzyć webhooka Stripe.",
      },
      500
    )
  }
}
