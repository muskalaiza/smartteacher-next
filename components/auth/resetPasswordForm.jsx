/*
→ tylko formularz wysłania linku do zmiany hasła
*/

"use client"

import React, { useState } from "react"
import { Button } from "../ui/button"

export default function ResetPasswordForm({
  loginEmail,
  setLoginEmail,
  handleResetPassword,
  onLoginClick,
}) {
  const [resetError, setResetError] = useState("")
  const [resetMessage, setResetMessage] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function onSubmit(event) {
    event.preventDefault()
    setResetError("")
    setResetMessage("")

    const trimmedEmail = loginEmail.trim()

    if (!trimmedEmail) {
      setResetError("Podaj adres e-mail.")
      return
    }

    if (typeof handleResetPassword !== "function") {
      setResetError("Nie można teraz wysłać linku do zmiany hasła.")
      return
    }

    setIsSubmitting(true)

    try {
      await handleResetPassword(trimmedEmail)

      setResetMessage(
        "Wysłaliśmy instrukcję zmiany hasła na podany adres e-mail."
      )
    } catch (error) {
      setResetError(
        error?.message ||
          "Nie udało się wysłać linku do zmiany hasła. Sprawdź wpisany adres e-mail."
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={onSubmit} autoComplete="off" className="space-y-4">
      {resetError && (
        <div className="rounded-md border border-red-900/50 bg-red-950/30 p-2.5 text-center text-xs text-red-400">
          {resetError}
        </div>
      )}

      {resetMessage && (
        <div className="rounded-md border border-emerald-900/50 bg-emerald-950/30 p-2.5 text-center text-xs leading-relaxed text-emerald-400">
          {resetMessage}
        </div>
      )}

      <div className="space-y-1.5">
        <label
          htmlFor="reset-email"
          className="text-xs font-medium text-zinc-300"
        >
          Adres e-mail
        </label>

        <input
          id="reset-email"
          name="reset-email"
          type="email"
          required
          autoComplete="off"
          placeholder="nazwa@szkola.pl"
          value={loginEmail}
          onChange={(event) => setLoginEmail(event.target.value)}
          className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-200 transition-colors placeholder:text-zinc-600 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>

      <Button
        type="submit"
        disabled={isSubmitting}
        className="mt-2 w-full bg-indigo-600 py-2 font-medium text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? "Wysyłanie..." : "Wyślij link do zmiany hasła"}
      </Button>

      <p className="text-center text-sm text-zinc-400">
        Pamiętasz hasło?{" "}
        <button
          type="button"
          onClick={onLoginClick}
          className="font-medium text-zinc-200 underline-offset-4 transition-colors hover:text-white hover:underline"
        >
          Wróć do logowania
        </button>
      </p>
    </form>
  )
}

