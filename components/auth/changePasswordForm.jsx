
/*
→ tylko formularz ustawienia nowego hasła po wejściu z linku resetującego
→ docelowo używany na osobnej stronie, np. /zmien-haslo
*/

"use client"

import React, { useState } from "react"
import { Button } from "../ui/button"

export default function ChangePasswordForm({ handleChangePassword }) {
  const [password, setPassword] = useState("")
  const [passwordRepeat, setPasswordRepeat] = useState("")
  const [formError, setFormError] = useState("")
  const [formMessage, setFormMessage] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function onSubmit(event) {
    event.preventDefault()
    setFormError("")
    setFormMessage("")

    if (password.length < 8) {
      setFormError("Nowe hasło powinno mieć co najmniej 8 znaków.")
      return
    }

    if (password !== passwordRepeat) {
      setFormError("Hasła nie są takie same.")
      return
    }

    if (typeof handleChangePassword !== "function") {
      setFormError("Nie można teraz zmienić hasła.")
      return
    }

    setIsSubmitting(true)

    try {
      await handleChangePassword(password)

      setPassword("")
      setPasswordRepeat("")
      setFormMessage("Hasło zostało zmienione. Możesz się teraz zalogować.")
    } catch (error) {
      setFormError(
        error?.message || "Nie udało się zmienić hasła. Spróbuj ponownie."
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={onSubmit} autoComplete="off" className="space-y-4">
      {formError && (
        <div className="rounded-md border border-red-900/50 bg-red-950/30 p-2.5 text-center text-xs text-red-400">
          {formError}
        </div>
      )}

      {formMessage && (
        <div className="rounded-md border border-emerald-900/50 bg-emerald-950/30 p-2.5 text-center text-xs leading-relaxed text-emerald-400">
          {formMessage}
        </div>
      )}

      <div className="space-y-1.5">
        <label
          htmlFor="new-password"
          className="text-xs font-medium text-zinc-300"
        >
          Nowe hasło
        </label>

        <input
          id="new-password"
          name="new-password"
          type="password"
          required
          autoComplete="off"
          placeholder="Wpisz bezpieczne hasło"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-200 transition-colors placeholder:text-zinc-600 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="new-password-repeat"
          className="text-xs font-medium text-zinc-300"
        >
          Powtórz nowe hasło
        </label>

        <input
          id="new-password-repeat"
          name="new-password-repeat"
          type="password"
          required
          autoComplete="off"
          placeholder="Powtórz nowe hasło"
          value={passwordRepeat}
          onChange={(event) => setPasswordRepeat(event.target.value)}
          className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-200 transition-colors placeholder:text-zinc-600 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>

      <Button
        type="submit"
        disabled={isSubmitting}
        className="mt-2 w-full bg-indigo-600 py-2 font-medium text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? "Zapisywanie..." : "Zmień hasło"}
      </Button>
    </form>
  )
}
