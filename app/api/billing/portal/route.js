import {
  getAuthenticatedRouteContext,
  getErrorMessage,
  jsonResponse,
} from "@/lib/api/serverApiHelpers"

import {
  BillingRequestError,
  createStripePortal,
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

    const portal =
      await createStripePortal({
        supabaseAdmin:
          authContext.supabaseAdmin,
        ownerId:
          authContext.user.id,
      })

    return jsonResponse(portal, 201)
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
      "Stripe portal failed:",
      errorMessage
    )

    const responseBody = {
      error:
        "Nie udało się otworzyć portalu klienta Stripe.",
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
