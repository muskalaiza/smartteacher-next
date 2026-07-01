/*
→ tylko formularz logowania
*/
"use client"

import React, { useState } from "react"
import { Button } from "../ui/button"

export default function LoginForm({
  loginEmail,
  loginPassword,
  loginError,
  setLoginEmail,
  setLoginPassword,
  handleLogin,
  onRegisterClick,
  onResetPasswordClick,
}) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function onSubmit(event) {
    event.preventDefault()

    if (!handleLogin) return

    setIsSubmitting(true)

    try {
      await handleLogin(event)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={onSubmit} autoComplete="off" className="space-y-4">
      {loginError && (
        <div className="rounded-md border border-red-900/50 bg-red-950/30 p-2.5 text-center text-xs text-red-400">
          {loginError}
        </div>
      )}

      <div className="space-y-1.5">
        <label
          htmlFor="login-email"
          className="text-xs font-medium text-zinc-300"
        >
          Adres e-mail
        </label>

        <input
          id="login-email"
          name="login-email"
          type="email"
          required
          autoComplete="off"
          placeholder="nazwa@szkola.pl"
          value={loginEmail}
          onChange={(event) => setLoginEmail(event.target.value)}
          className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-200 transition-colors placeholder:text-zinc-600 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="login-password"
          className="text-xs font-medium text-zinc-300"
        >
          Hasło
        </label>

        <input
          id="login-password"
          name="login-password"
          type="password"
          required
          autoComplete="off"
          placeholder="••••••••"
          value={loginPassword}
          onChange={(event) => setLoginPassword(event.target.value)}
          className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-200 transition-colors placeholder:text-zinc-600 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>

      <Button
        type="submit"
        disabled={isSubmitting}
        className="mt-2 w-full bg-indigo-600 py-2 font-medium text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? "Logowanie..." : "Zaloguj się"}
      </Button>

      <p className="text-center text-sm text-zinc-400">
        Nie pamiętasz hasła?{" "}
        <button
          type="button"
          onClick={onResetPasswordClick}
          className="font-medium text-zinc-200 underline-offset-4 transition-colors hover:text-white hover:underline"
        >
          Zresetuj hasło
        </button>
      </p>

      <p className="text-center text-sm text-zinc-400">
        Nie posiadasz jeszcze konta?{" "}
        <button
          type="button"
          onClick={onRegisterClick}
          className="font-medium text-zinc-200 underline-offset-4 transition-colors hover:text-white hover:underline"
        >
          Zarejestruj się
        </button>
      </p>
    </form>
  )
}
