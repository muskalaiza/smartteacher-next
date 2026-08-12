import {
  createAdminClient,
  getErrorMessage,
  jsonResponse,
} from "@/lib/api/serverApiHelpers"

import {
  getPublicBillingPlans,
} from "@/lib/billing/stripeServer"

export const runtime = "nodejs"
export const dynamic =
  "force-dynamic"

export async function GET() {
  try {
    const plans =
      await getPublicBillingPlans({
        supabaseAdmin:
          createAdminClient(),
      })

    return jsonResponse({ plans })
  } catch (error) {
    const errorMessage =
      getErrorMessage(error)

    console.error(
      "Public billing plans failed:",
      errorMessage
    )

    const responseBody = {
      error:
        "Nie udało się pobrać cennika SmartTeacher.",
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
