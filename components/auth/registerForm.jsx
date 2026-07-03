/*
→ tylko formularz rejestracji
*/

"use client"

import React, { useState } from "react"
import { Button } from "../ui/button"

export default function RegisterForm({
  loginEmail,
  setLoginEmail,
  handleRegister,
  onLoginClick,
}) {
  const [fullName, setFullName] = useState("")
  const [password, setPassword] = useState("")
  const [passwordRepeat, setPasswordRepeat] = useState("")
  const [registerError, setRegisterError] = useState("")
  const [registerMessage, setRegisterMessage] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function onSubmit(event) {
    event.preventDefault()
    setRegisterError("")
    setRegisterMessage("")
    
    const trimmedFullName = fullName.trim()
    const trimmedEmail = loginEmail.trim()

    if (!trimmedFullName) {
      setRegisterError("Podaj imię i nazwisko.")
      return
    }

    if (!trimmedEmail) {
      setRegisterError("Podaj adres e-mail.")
      return
    }

    if (password.length < 8) {
      setRegisterError("Hasło powinno mieć co najmniej 8 znaków.")
      return
    }

    if (password !== passwordRepeat) {
      setRegisterError("Hasła nie są takie same.")
      return
    }

    if (!handleRegister) {
      setRegisterError("Rejestracja nie jest jeszcze aktywna.")
      return
    }

    
    setIsSubmitting(true)

    try {
     const message = await handleRegister({
  email: trimmedEmail,
  password,
  fullName: trimmedFullName,
})
setFullName("")
setPassword("")
setPasswordRepeat("")
setRegisterMessage(
  message || "Konto zostało utworzone. Sprawdź skrzynkę e-mail, aby potwierdzić rejestrację."
)
    } catch (error) {
      setRegisterError(
        error?.message || "Nie udało się utworzyć konta. Spróbuj ponownie."
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={onSubmit} autoComplete="off" className="space-y-4">
      {registerError && (
        <div className="rounded-md border border-red-900/50 bg-red-950/30 p-2.5 text-center text-xs text-red-400">
          {registerError}
        </div>
      )}

      {registerMessage && (
  <div className="rounded-md border border-emerald-900/50 bg-emerald-950/30 p-2.5 text-center text-xs leading-relaxed text-emerald-400">
    {registerMessage}
  </div>
)}


      <div className="space-y-1.5">
        <label
          htmlFor="register-full-name"
          className="text-xs font-medium text-zinc-300"
        >
          Imię i nazwisko
        </label>

        <input
          id="register-full-name"
          name="register-full-name"
          type="text"
          required
          autoComplete="off"
          placeholder="Imię i nazwisko"
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
          className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-200 transition-colors placeholder:text-zinc-600 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="register-email"
          className="text-xs font-medium text-zinc-300"
        >
          Adres e-mail
        </label>

        <input
          id="register-email"
          name="register-email"
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
          htmlFor="register-password"
          className="text-xs font-medium text-zinc-300"
        >
          Hasło
        </label>

        <input
          id="register-password"
          name="register-password"
          type="password"
          required
          autoComplete="off"
          placeholder="Minimum 8 znaków"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-200 transition-colors placeholder:text-zinc-600 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="register-password-repeat"
          className="text-xs font-medium text-zinc-300"
        >
          Powtórz hasło
        </label>

        <input
          id="register-password-repeat"
          name="register-password-repeat"
          type="password"
          required
          autoComplete="off"
          placeholder="Powtórz hasło"
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
        {isSubmitting ? "Tworzenie konta..." : "Utwórz konto"}
      </Button>

      <p className="text-center text-sm text-zinc-400">
        Masz już konto?{" "}
        <button
          type="button"
          onClick={onLoginClick}
          className="font-medium text-zinc-200 underline-offset-4 transition-colors hover:text-white hover:underline"
        >
          Zaloguj się
        </button>
      </p>
    </form>
  )
}
