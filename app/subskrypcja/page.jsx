"use client";

import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  CreditCard,
  ExternalLink,
  Loader2,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

import {
  createBillingCheckout,
  createBillingPortal,
  getBillingStatus,
} from "@/lib/billing/billingApi";
import { supabase } from "@/lib/supabaseClient";

const SUBSCRIPTION_STATUS_LABELS = {
  active: "Aktywna",
  canceled: "Anulowana",
  incomplete: "Wymaga dokończenia płatności",
  incomplete_expired: "Płatność wygasła",
  none: "Brak subskrypcji",
  past_due: "Płatność wymaga uwagi",
  paused: "Wstrzymana",
  trialing: "Okres próbny",
  unpaid: "Nieopłacona",
};

const BILLING_INTERVAL_LABELS = {
  day: "dziennie",
  month: "miesięcznie",
  one_time: "jednorazowo",
  week: "tygodniowo",
  year: "rocznie",
};

function formatCurrency(amountMinor, currency) {
  try {
    return new Intl.NumberFormat("pl-PL", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amountMinor / 100);
  } catch {
    return `${(amountMinor / 100).toFixed(2)} ${currency.toUpperCase()}`;
  }
}

function formatDate(value) {
  if (!value) {
    return "—";
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("pl-PL", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Warsaw",
  }).format(parsedDate);
}

function getSubscriptionStatusLabel(status) {
  return SUBSCRIPTION_STATUS_LABELS[status] || "Nieaktywna";
}

function subscribeToLocationChange(callback) {
  window.addEventListener("popstate", callback);

  return () => {
    window.removeEventListener("popstate", callback);
  };
}

function getCheckoutResultSnapshot() {
  const checkout = new URLSearchParams(window.location.search).get("checkout");

  return checkout === "success" || checkout === "cancelled" ? checkout : null;
}

function getServerCheckoutResultSnapshot() {
  return null;
}

export default function SubscriptionPage() {
  const router = useRouter();
  const isMountedRef = useRef(true);

  const [billing, setBilling] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeAction, setActiveAction] = useState("");
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const checkoutResult = useSyncExternalStore(
    subscribeToLocationChange,
    getCheckoutResultSnapshot,
    getServerCheckoutResultSnapshot
  );

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const loadStatus = useCallback(async () => {
    try {
      const nextBilling = await getBillingStatus({ supabase });

      if (isMountedRef.current) {
        setBilling(nextBilling);
        setLoadError("");
      }
    } catch (error) {
      if (error?.status === 401) {
        router.replace("/");
        return;
      }

      if (isMountedRef.current) {
        setLoadError(
          error instanceof Error
            ? error.message
            : "Nie udało się pobrać stanu subskrypcji."
        );
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [router]);

  function handleStatusRefresh() {
    setIsLoading(true);
    setLoadError("");
    loadStatus();
  }

  useEffect(() => {
    let isCurrent = true;

    getBillingStatus({ supabase })
      .then((nextBilling) => {
        if (!isCurrent) {
          return;
        }

        setBilling(nextBilling);
        setLoadError("");
      })
      .catch((error) => {
        if (!isCurrent) {
          return;
        }

        if (error?.status === 401) {
          router.replace("/");
          return;
        }

        setLoadError(
          error instanceof Error
            ? error.message
            : "Nie udało się pobrać stanu subskrypcji."
        );
      })
      .finally(() => {
        if (isCurrent) {
          setIsLoading(false);
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [router]);

  const isAccessActive = billing?.access.status === "active";
  const isInternalAccess =
    isAccessActive && billing?.access.source === "internal";
  const isFreeAccess =
    isAccessActive && billing?.access.source === "free";
  const isStripeAccess =
    isAccessActive && billing?.access.source === "stripe";
  const isWaitingForCheckoutSync =
    checkoutResult === "success" && !isStripeAccess;

  const usagePercent = useMemo(() => {
    if (!billing?.usage.generationLimit) {
      return 0;
    }

    return Math.min(
      100,
      ((billing.usage.usedCount + billing.usage.reservedCount) /
        billing.usage.generationLimit) *
        100
    );
  }, [billing]);

  async function handleRedirectAction(action) {
    setActionError("");
    setActiveAction(action);

    try {
      const redirectUrl =
        action === "checkout"
          ? await createBillingCheckout({ supabase })
          : await createBillingPortal({ supabase });

      window.location.assign(redirectUrl);
    } catch (error) {
      if (error?.status === 401) {
        router.replace("/");
        return;
      }

      if (isMountedRef.current) {
        setActionError(
          error instanceof Error
            ? error.message
            : "Nie udało się otworzyć strony Stripe."
        );
        setActiveAction("");
      }
    }
  }

  if (isLoading && !billing) {
    return (
      <div className="space-y-8" aria-busy="true">
        <header className="space-y-4">
          <Link
            href="/dashboard"
            className="inline-flex items-center text-sm text-zinc-400 transition-colors hover:text-zinc-100"
          >
            ← Wróć do wyboru przedmiotu
          </Link>

          <div className="max-w-3xl space-y-3">
            <p className="text-sm font-medium text-sky-400">Konto nauczyciela</p>
            <h1 className="text-3xl font-bold tracking-tight text-zinc-50 md:text-4xl">
              Subskrypcja
            </h1>
          </div>
        </header>

        <section className="flex min-h-52 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-950/70 p-8 text-zinc-400">
          <Loader2 className="mr-3 h-5 w-5 animate-spin" aria-hidden="true" />
          Pobieranie stanu subskrypcji...
        </section>
      </div>
    );
  }

  if (loadError && !billing) {
    return (
      <div className="space-y-8">
        <header className="space-y-4">
          <Link
            href="/dashboard"
            className="inline-flex items-center text-sm text-zinc-400 transition-colors hover:text-zinc-100"
          >
            ← Wróć do wyboru przedmiotu
          </Link>

          <div className="max-w-3xl space-y-3">
            <p className="text-sm font-medium text-sky-400">Konto nauczyciela</p>
            <h1 className="text-3xl font-bold tracking-tight text-zinc-50 md:text-4xl">
              Subskrypcja
            </h1>
          </div>
        </header>

        <section className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-red-100">
          <div className="flex gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
            <div>
              <h2 className="font-semibold">Nie udało się pobrać subskrypcji</h2>
              <p className="mt-2 text-sm leading-6 text-red-100/80">
                {loadError}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleStatusRefresh}
            className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl border border-red-300/30 bg-red-950/30 px-5 py-3 text-sm font-semibold text-red-50 transition hover:bg-red-950/50 focus:outline-none focus:ring-2 focus:ring-red-400/30"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Spróbuj ponownie
          </button>
        </section>
      </div>
    );
  }

  if (!billing) {
    return null;
  }

  const planPrice = formatCurrency(
    billing.plan.priceGrossMinor,
    billing.plan.currency
  );
  const billingInterval =
    BILLING_INTERVAL_LABELS[billing.plan.billingInterval] ||
    billing.plan.billingInterval;
  const statusLabel = isInternalAccess
    ? "Dostęp właścicielski"
    : isFreeAccess
      ? "Aktywny Plan Free"
    : isStripeAccess
      ? "Aktywna subskrypcja"
      : getSubscriptionStatusLabel(billing.subscription.status);
  const showPortalAction =
    billing.actions.portalAvailable &&
    (billing.access.source === "stripe" || !isAccessActive);

  return (
    <div className="space-y-8">
      <header className="space-y-4">
        <Link
          href="/dashboard"
          className="inline-flex items-center text-sm text-zinc-400 transition-colors hover:text-zinc-100"
        >
          ← Wróć do wyboru przedmiotu
        </Link>

        <div className="max-w-3xl space-y-3">
          <p className="text-sm font-medium text-sky-400">Konto nauczyciela</p>

          <h1 className="text-3xl font-bold tracking-tight text-zinc-50 md:text-4xl">
            Subskrypcja
          </h1>

          <p className="text-sm leading-6 text-zinc-400">
            Sprawdź swój dostęp, wykorzystanie limitu i zarządzaj płatnościami.
          </p>
        </div>
      </header>

      <div className="space-y-4" aria-live="polite">
        {loadError ? (
          <div className="flex flex-col gap-4 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-100 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-3">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <p>{loadError}</p>
            </div>

            <button
              type="button"
              onClick={handleStatusRefresh}
              disabled={isLoading}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-red-300/30 bg-red-950/30 px-4 py-2 font-semibold text-red-50 transition hover:bg-red-950/50 disabled:cursor-wait disabled:opacity-60"
            >
              <RefreshCw
                className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
                aria-hidden="true"
              />
              Spróbuj ponownie
            </button>
          </div>
        ) : null}

        {checkoutResult === "cancelled" ? (
          <div className="flex gap-3 rounded-xl border border-zinc-700 bg-zinc-900/70 p-4 text-sm text-zinc-300">
            <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400" aria-hidden="true" />
            <p>Płatność została anulowana. Twój dostęp nie uległ zmianie.</p>
          </div>
        ) : null}

        {checkoutResult === "success" && isStripeAccess ? (
          <div className="flex gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-100">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <p>Płatność została zakończona, a dostęp jest aktywny.</p>
          </div>
        ) : null}

        {isWaitingForCheckoutSync ? (
          <div className="flex flex-col gap-4 rounded-xl border border-sky-500/30 bg-sky-500/10 p-4 text-sm text-sky-100 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-3">
              <Clock3 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <p>
                Płatność została zakończona. Czekamy na potwierdzenie Stripe i
                aktualizację dostępu.
              </p>
            </div>

            <button
              type="button"
              onClick={handleStatusRefresh}
              disabled={isLoading}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-sky-300/30 bg-sky-950/20 px-4 py-2 font-semibold text-sky-50 transition hover:bg-sky-950/40 disabled:cursor-wait disabled:opacity-60"
            >
              <RefreshCw
                className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
                aria-hidden="true"
              />
              Odśwież status
            </button>
          </div>
        ) : null}

        {billing.subscription.cancelAtPeriodEnd && isStripeAccess ? (
          <div className="flex gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <p>
              Subskrypcja została anulowana, ale dostęp pozostaje aktywny
              {billing.subscription.currentPeriodEnd
                ? ` do ${formatDate(billing.subscription.currentPeriodEnd)}.`
                : " do końca bieżącego okresu."}
            </p>
          </div>
        ) : null}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-6 shadow-sm">
          <div className="flex flex-col gap-5 border-b border-zinc-800 pb-6 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-400">
                Twój plan
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-zinc-50">
                {billing.plan.name}
              </h2>
            </div>

            <span
              className={`inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium ${
                isAccessActive
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
                  : "border-amber-500/30 bg-amber-500/10 text-amber-200"
              }`}
            >
              {isAccessActive ? (
                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
              ) : (
                <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              {statusLabel}
            </span>
          </div>

          <div className="py-7">
            <div className="flex flex-wrap items-end gap-x-3 gap-y-1">
              <span className="text-4xl font-bold tracking-tight text-zinc-50">
                {planPrice}
              </span>
              <span className="pb-1 text-sm text-zinc-500">{billingInterval}</span>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
                <p className="text-xs uppercase tracking-[0.14em] text-zinc-500">
                  Limit planu
                </p>
                <p className="mt-2 text-lg font-semibold text-zinc-100">
                  {billing.plan.generationLimit}{" "}
                  {isFreeAccess
                    ? "materiały"
                    : "kompletów"}
                </p>
                <p className="mt-1 text-xs leading-5 text-zinc-500">
                  {isFreeAccess
                    ? "Jedna karta pracy i jedna kartkówka z tego samego tematu."
                    : "Materiały generowane w każdym okresie rozliczeniowym."}
                </p>
              </div>

              <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
                <p className="text-xs uppercase tracking-[0.14em] text-zinc-500">
                  Stan dostępu
                </p>
                <p className="mt-2 text-lg font-semibold text-zinc-100">
                  {isAccessActive ? "Aktywny" : "Nieaktywny"}
                </p>
                <p className="mt-1 text-xs leading-5 text-zinc-500">
                  {isInternalAccess
                    ? "Dostęp przyznany bez rozliczenia Stripe."
                    : isFreeAccess
                      ? "Jednorazowy dostęp bez karty płatniczej."
                    : isAccessActive
                      ? "Dostęp rozliczany przez Stripe."
                      : "Aktywacja jest wymagana do generowania materiałów."}
                </p>
              </div>
            </div>
          </div>

          {!isAccessActive && billing.actions.portalAvailable ? (
            <div className="mb-5 flex gap-3 rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-100/90">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <p>
                Dostęp jest nieaktywny. Otwórz portal klienta, aby sprawdzić
                płatność lub stan wcześniejszej subskrypcji.
              </p>
            </div>
          ) : null}

          {actionError ? (
            <div className="mb-5 flex gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200" role="alert">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <p>{actionError}</p>
            </div>
          ) : null}

          <div className="flex flex-col gap-3 border-t border-zinc-800 pt-6 sm:flex-row sm:items-center">
            {billing.actions.checkoutAvailable && !isWaitingForCheckoutSync ? (
              <button
                type="button"
                onClick={() => handleRedirectAction("checkout")}
                disabled={Boolean(activeAction)}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-sky-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/30 disabled:cursor-wait disabled:opacity-60"
              >
                {activeAction === "checkout" ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <CreditCard className="h-4 w-4" aria-hidden="true" />
                )}
                {activeAction === "checkout"
                  ? "Otwieranie płatności..."
                  : isFreeAccess
                    ? "Przejdź na plan miesięczny"
                    : "Aktywuj subskrypcję"}
              </button>
            ) : null}

            {showPortalAction ? (
              <button
                type="button"
                onClick={() => handleRedirectAction("portal")}
                disabled={Boolean(activeAction)}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900 px-6 py-3 text-sm font-semibold text-zinc-100 transition hover:border-zinc-600 hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-500/30 disabled:cursor-wait disabled:opacity-60"
              >
                {activeAction === "portal" ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <ExternalLink className="h-4 w-4" aria-hidden="true" />
                )}
                {activeAction === "portal"
                  ? "Otwieranie portalu..."
                  : "Zarządzaj płatnością"}
              </button>
            ) : null}

            {!billing.actions.checkoutAvailable && !showPortalAction ? (
              <p className="text-sm text-zinc-500">
                {isInternalAccess
                  ? "Dostęp właścicielski nie wymaga płatności."
                  : "Dla tego konta nie ma obecnie dostępnej akcji płatniczej."}
              </p>
            ) : null}
          </div>
        </section>

        <aside className="space-y-4">
          {isAccessActive ? (
            <section className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-6 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-400">
                Wykorzystanie
              </p>

              <div className="mt-4 flex items-end justify-between gap-4">
                <div>
                  <p className="text-3xl font-bold text-zinc-50">
                    {billing.usage.remainingCount}
                  </p>
                  <p className="mt-1 text-sm text-zinc-400">
                    {isFreeAccess
                      ? "materiałów pozostało"
                      : "kompletów pozostało"}
                  </p>
                </div>

                <p className="text-right text-sm text-zinc-500">
                  {billing.usage.usedCount + billing.usage.reservedCount} z{" "}
                  {billing.usage.generationLimit}
                </p>
              </div>

              <div
                className="mt-5 h-2 overflow-hidden rounded-full bg-zinc-800"
                role="progressbar"
                aria-label="Wykorzystanie limitu generowania"
                aria-valuemin="0"
                aria-valuemax={billing.usage.generationLimit}
                aria-valuenow={
                  billing.usage.usedCount + billing.usage.reservedCount
                }
              >
                <div
                  className="h-full rounded-full bg-sky-500 transition-[width]"
                  style={{ width: `${usagePercent}%` }}
                />
              </div>

              <dl className="mt-5 space-y-3 text-sm">
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-zinc-500">Wykorzystane</dt>
                  <dd className="font-semibold text-zinc-200">
                    {billing.usage.usedCount}
                  </dd>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <dt className="text-zinc-500">Zarezerwowane</dt>
                  <dd className="font-semibold text-zinc-200">
                    {billing.usage.reservedCount}
                  </dd>
                </div>

                {isFreeAccess ? (
                  <>
                    <div className="border-t border-zinc-800 pt-3">
                      <dt className="text-zinc-500">Karta pracy</dt>
                      <dd className="mt-1 font-medium text-zinc-200">
                        {billing.freePlan?.worksheetUsed
                          ? "Wykorzystana"
                          : billing.freePlan?.worksheetReserved
                            ? "W trakcie generowania"
                            : "Dostępna"}
                      </dd>
                    </div>

                    <div>
                      <dt className="text-zinc-500">Kartkówka</dt>
                      <dd className="mt-1 font-medium text-zinc-200">
                        {billing.freePlan?.quizUsed
                          ? "Wykorzystana"
                          : billing.freePlan?.quizReserved
                            ? "W trakcie generowania"
                            : "Dostępna"}
                      </dd>
                    </div>

                    <div>
                      <dt className="text-zinc-500">Zakres</dt>
                      <dd className="mt-1 font-medium leading-6 text-zinc-200">
                        {billing.freePlan?.topicAssigned
                          ? "Jeden temat został już przypisany."
                          : "Temat zostanie przypisany po pierwszym udanym generowaniu."}
                      </dd>
                    </div>
                  </>
                ) : (
                  <div className="border-t border-zinc-800 pt-3">
                    <dt className="text-zinc-500">Bieżący okres</dt>
                    <dd className="mt-1 font-medium leading-6 text-zinc-200">
                      {formatDate(billing.usage.periodStart)} –{" "}
                      {formatDate(billing.usage.periodEnd)}
                    </dd>
                  </div>
                )}
              </dl>
            </section>
          ) : (
            <section className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-6 shadow-sm">
              <ShieldCheck className="h-8 w-8 text-sky-400" aria-hidden="true" />
              <h2 className="mt-4 text-lg font-semibold text-zinc-50">
                Aktywuj dostęp
              </h2>
              <p className="mt-2 text-sm leading-6 text-zinc-400">
                Po aktywacji limit i bieżący okres rozliczeniowy pojawią się w
                tym miejscu.
              </p>
            </section>
          )}

          {isFreeAccess ? (
            <section className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-6">
              <h2 className="text-sm font-semibold text-zinc-100">
                Zestaw startowy
              </h2>
              <p className="mt-2 text-sm leading-6 text-zinc-400">
                Tutaj będzie można pobrać przygotowany CSV z jednym tematem i odpowiadający mu materiał DOCX.
              </p>
              <button
                type="button"
                disabled
                className="mt-4 w-full cursor-not-allowed rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-sm font-medium text-zinc-500"
              >
                Zestaw w przygotowaniu
              </button>
            </section>
          ) : null}

          <section className="rounded-2xl border border-sky-500/20 bg-sky-500/10 p-6">
            <h2 className="text-sm font-semibold text-sky-100">
              Jak liczony jest limit?
            </h2>
            <p className="mt-2 text-sm leading-6 text-sky-100/80">
              {isFreeAccess
                ? "Plan Free rozlicza osobno jedną kartę pracy i jedną kartkówkę. Cache HIT oraz ponowne otwarcie materiału nie zużywają kolejnej jednostki."
                : "Jeden komplet to pojedyncze generowanie wybranego materiału dla wskazanych profili. Rezerwacja oznacza generowanie, które jest w trakcie rozliczania."}
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}
