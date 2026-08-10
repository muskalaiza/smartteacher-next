import {
  getAuthenticatedRouteContext,
  getErrorMessage,
  jsonResponse,
} from "@/lib/api/serverApiHelpers"

import {
  getBillingStatus,
} from "@/lib/billing/stripeServer"

export const runtime = "nodejs"
export const dynamic =
  "force-dynamic"

export async function GET(request) {
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

    const billingStatus =
      await getBillingStatus({
        supabaseAdmin:
          authContext.supabaseAdmin,
        ownerId:
          authContext.user.id,
      })

    return jsonResponse({
      billing: billingStatus,
    })
  } catch (error) {
    const errorMessage =
      getErrorMessage(error)

    console.error(
      "Billing status failed:",
      errorMessage
    )

    const responseBody = {
      error:
        "Nie udało się pobrać stanu subskrypcji.",
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
