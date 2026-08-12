"use client"

import {
  Check,
  Loader2,
  Sparkles,
} from "lucide-react"
import Link from "next/link"
import {
  useEffect,
  useState,
} from "react"

import {
  getPublicBillingPlans,
} from "@/lib/billing/billingApi"

const MATERIAL_LABELS = {
  "karta pracy": "karta pracy",
  "kartkówka": "kartkówka",
  "sprawdzian": "sprawdzian",
}

function formatCurrency(
  amountMinor,
  currency
) {
  return new Intl.NumberFormat(
    "pl-PL",
    {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }
  ).format(amountMinor / 100)
}

function getMaterialFeature(plan) {
  const materialEntries =
    Object.entries(
      plan.materialLimits
    ).filter(
      ([, limit]) => limit > 0
    )

  if (plan.accessModel === "one_time") {
    return materialEntries
      .map(
        ([materialType, limit]) =>
          `${limit} × ${MATERIAL_LABELS[materialType]}`
      )
      .join(" + ")
  }

  return materialEntries
    .map(
      ([materialType]) =>
        MATERIAL_LABELS[materialType]
    )
    .join(", ")
}

function getPlanFeatures(plan) {
  const features = [
    plan.accessModel === "one_time"
      ? `${plan.generationLimit} generowania jednorazowo`
      : `${plan.generationLimit} nowych kompletów co miesiąc`,
    getMaterialFeature(plan),
    "wszystkie profile uczniów",
    "zestawy po 5, 6 albo 7 zadań",
  ]

  if (plan.lessonTopicLimit === 1) {
    features.push(
      "oba materiały z tego samego tematu",
      "własny CSV + DOCX albo zestaw startowy"
    )
  } else {
    features.push(
      "własny katalog tematów i własne źródła DOCX",
      "Historia i ponowne otwieranie materiałów"
    )
  }

  return features
}

function PricingCard({ plan }) {
  const isPaid =
    plan.requiresPayment
  const price = formatCurrency(
    plan.priceGrossMinor,
    plan.currency
  )

  return (
    <article
      className={`relative flex h-full flex-col rounded-2xl border p-6 shadow-sm sm:p-8 ${
        isPaid
          ? "border-sky-500/50 bg-sky-500/10"
          : "border-zinc-800 bg-zinc-950/80"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-400">
            {isPaid
              ? "Pełny dostęp"
              : "Na start"}
          </p>
          <h2 className="mt-3 text-2xl font-semibold text-zinc-50">
            {plan.name.replace(
              "SmartTeacher — ",
              ""
            )}
          </h2>
        </div>

        {isPaid ? (
          <Sparkles
            className="h-6 w-6 text-sky-400"
            aria-hidden="true"
          />
        ) : null}
      </div>

      <div className="mt-8 flex items-end gap-2">
        <span className="text-4xl font-bold tracking-tight text-zinc-50">
          {price}
        </span>
        <span className="pb-1 text-sm text-zinc-500">
          {plan.billingInterval ===
          "month"
            ? "/ miesiąc"
            : "bez karty"}
        </span>
      </div>

      <p className="mt-3 text-sm leading-6 text-zinc-400">
        {isPaid
          ? "Regularna praca ze wszystkimi rodzajami materiałów."
          : "Sprawdź SmartTeacher na jednym własnym temacie."}
      </p>

      <ul className="mt-7 flex-1 space-y-3 border-t border-zinc-800 pt-6">
        {getPlanFeatures(plan).map(
          (feature) => (
            <li
              key={feature}
              className="flex gap-3 text-sm leading-6 text-zinc-300"
            >
              <Check
                className="mt-1 h-4 w-4 shrink-0 text-sky-400"
                aria-hidden="true"
              />
              <span>{feature}</span>
            </li>
          )
        )}
      </ul>

      <Link
        href="/"
        className={`mt-8 inline-flex items-center justify-center rounded-xl px-5 py-3 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-sky-500/30 ${
          isPaid
            ? "bg-sky-500 text-white hover:bg-sky-400"
            : "border border-zinc-700 bg-zinc-900 text-zinc-100 hover:border-zinc-600 hover:bg-zinc-800"
        }`}
      >
        {isPaid
          ? "Załóż konto i wybierz plan"
          : "Wypróbuj bezpłatnie"}
      </Link>
    </article>
  )
}

export default function PricingPage() {
  const [plans, setPlans] =
    useState([])
  const [isLoading, setIsLoading] =
    useState(true)
  const [errorMessage, setErrorMessage] =
    useState("")

  useEffect(() => {
    let isCurrent = true

    getPublicBillingPlans()
      .then((nextPlans) => {
        if (!isCurrent) return

        setPlans(nextPlans)
        setErrorMessage("")
      })
      .catch((error) => {
        if (!isCurrent) return

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Nie udało się pobrać cennika."
        )
      })
      .finally(() => {
        if (isCurrent) {
          setIsLoading(false)
        }
      })

    return () => {
      isCurrent = false
    }
  }, [])

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-50">
      <nav className="border-b border-zinc-900">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
          <Link
            href="/"
            className="flex items-center gap-2.5 text-sm font-semibold tracking-tight text-zinc-100"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-indigo-600 text-[11px] font-bold text-white">
              ST
            </span>
            SmartTeacher
          </Link>

          <Link
            href="/"
            className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-300 transition hover:bg-zinc-900 hover:text-white"
          >
            Zaloguj się
          </Link>
        </div>
      </nav>

      <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-20">
        <header className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-semibold text-sky-400">
            Prosty cennik
          </p>
          <h1 className="mt-4 text-4xl font-bold tracking-tight text-zinc-50 sm:text-5xl">
            Zacznij bezpłatnie. Przejdź dalej, gdy SmartTeacher sprawdzi się w Twojej pracy.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-zinc-400">
            W obu planach otrzymujesz pełną jakość materiałów i wszystkie profile uczniów. Różni je liczba generowań oraz zakres źródeł.
          </p>
        </header>

        {isLoading ? (
          <section
            className="mt-12 flex min-h-72 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-950/80 text-sm text-zinc-400"
            aria-busy="true"
          >
            <Loader2
              className="mr-3 h-5 w-5 animate-spin"
              aria-hidden="true"
            />
            Pobieranie cennika...
          </section>
        ) : errorMessage ? (
          <section
            className="mx-auto mt-12 max-w-xl rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-center text-sm leading-6 text-red-100"
            role="alert"
          >
            {errorMessage}
          </section>
        ) : (
          <section className="mx-auto mt-12 grid max-w-4xl gap-6 md:grid-cols-2">
            {plans.map((plan) => (
              <PricingCard
                key={plan.key}
                plan={plan}
              />
            ))}
          </section>
        )}

        <p className="mx-auto mt-10 max-w-3xl text-center text-xs leading-5 text-zinc-500">
          Plan Free jest jednorazowy dla potwierdzonego konta. Nie wymaga karty płatniczej i nie odnawia się co miesiąc.
        </p>
      </div>
    </main>
  )
}
