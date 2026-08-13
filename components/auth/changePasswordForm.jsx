/*
→ tylko formularz ustawienia nowego hasła po wejściu z linku resetującego
→ docelowo używany na osobnej stronie, np. /zmien-haslo
*/

"use client"

import React, { useState } from "react"
import { Eye, EyeOff } from "lucide-react"
import { Button } from "../ui/button"

export default function ChangePasswordForm({ handleChangePassword }) {
  const [password, setPassword] = useState("")
  const [passwordRepeat, setPasswordRepeat] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showPasswordRepeat, setShowPasswordRepeat] = useState(false)
  const [formError, setFormError] = useState("")
  const [formMessage, setFormMessage] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function onSubmit(event) {
    event.preventDefault()
    setFormError("")
    setFormMessage("")

    const hasMinimumLength = password.length >= 8
    const hasLetter = /\p{L}/u.test(password)
    const hasDigit = /\d/.test(password)

    if (!hasMinimumLength || !hasLetter || !hasDigit) {
      setFormError(
        "Hasło musi mieć co najmniej 8 znaków oraz zawierać co najmniej jedną literę i jedną cyfrę."
      )
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

        <div className="relative">
          <input
            id="new-password"
            name="new-password"
            type={showPassword ? "text" : "password"}
            required
            minLength={8}
            autoComplete="off"
            placeholder="Wpisz bezpieczne hasło, min. 8 znaków"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 pr-10 text-sm text-zinc-200 transition-colors placeholder:text-zinc-600 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />

          <button
            type="button"
            onClick={() => setShowPassword((current) => !current)}
            aria-label={showPassword ? "Ukryj hasło" : "Pokaż hasło"}
            aria-pressed={showPassword}
            className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-zinc-500 transition-colors hover:text-zinc-200 focus:outline-none focus-visible:text-zinc-200"
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Eye className="h-4 w-4" aria-hidden="true" />
            )}
          </button>
        </div>

        <p className="text-xs leading-relaxed text-zinc-500">
          Hasło musi mieć co najmniej 8 znaków oraz zawierać literę i cyfrę.
        </p>
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="new-password-repeat"
          className="text-xs font-medium text-zinc-300"
        >
          Powtórz nowe hasło
        </label>

        <div className="relative">
          <input
            id="new-password-repeat"
            name="new-password-repeat"
            type={showPasswordRepeat ? "text" : "password"}
            required
            minLength={8}
            autoComplete="off"
            placeholder="Wpisz bezpieczne hasło, min. 8 znaków"
            value={passwordRepeat}
            onChange={(event) => setPasswordRepeat(event.target.value)}
            className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 pr-10 text-sm text-zinc-200 transition-colors placeholder:text-zinc-600 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />

          <button
            type="button"
            onClick={() => setShowPasswordRepeat((current) => !current)}
            aria-label={
              showPasswordRepeat ? "Ukryj powtórzone hasło" : "Pokaż powtórzone hasło"
            }
            aria-pressed={showPasswordRepeat}
            className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-zinc-500 transition-colors hover:text-zinc-200 focus:outline-none focus-visible:text-zinc-200"
          >
            {showPasswordRepeat ? (
              <EyeOff className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Eye className="h-4 w-4" aria-hidden="true" />
            )}
          </button>
        </div>
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
