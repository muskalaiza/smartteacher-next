import {
  getAuthenticatedRouteContext,
  getErrorMessage,
  jsonResponse,
} from "@/lib/api/serverApiHelpers"

import {
  BillingRequestError,
  createStripeCheckout,
} from "@/lib/billing/stripeServer"

export const runtime = "nodejs"

export async function POST(request) {
  try {
    const authContext =
      await getAuthenticatedRouteContext(
        request
      )

    if (!authContext.ok) {
      return jsonResponse(
        {
          error:
            authContext.error,
        },
        authContext.status
      )
    }

    const checkout =
      await createStripeCheckout({
        supabaseAdmin:
          authContext.supabaseAdmin,
        user: authContext.user,
      })

    return jsonResponse(
      checkout,
      201
    )
  } catch (error) {
    if (
      error instanceof
      BillingRequestError
    ) {
      return jsonResponse(
        {
          error: error.message,
          code: error.code,
        },
        error.status
      )
    }

    const errorMessage =
      getErrorMessage(error)

    console.error(
      "Stripe Checkout failed:",
      errorMessage
    )

    const responseBody = {
      error:
        "Nie udało się otworzyć płatności Stripe.",
    }

    if (
      process.env.NODE_ENV !==
      "production"
    ) {
      responseBody.details =
        errorMessage
    }

    return jsonResponse(
      responseBody,
      500
    )
  }
}
