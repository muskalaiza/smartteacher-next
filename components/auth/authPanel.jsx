"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"
import LoginForm from "./loginForm"
import RegisterForm from "./registerForm"
import ResetPasswordForm from "./resetPasswordForm"

export default function AuthPanel() {
  const router = useRouter()

  const [mode, setMode] = useState("login")
  const [loginEmail, setLoginEmail] = useState("")
  const [loginPassword, setLoginPassword] = useState("")
  const [loginError, setLoginError] = useState("")

  const isLoginMode = mode === "login"
  const isRegisterMode = mode === "register"
  const isResetMode = mode === "reset"

  async function handleLogin(event) {
    event.preventDefault()
    setLoginError("")

    const email = loginEmail.trim()

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: loginPassword,
    })

    if (error) {
      setLoginError("Adres e-mail nie został jeszcze potwierdzony. Sprawdź skrzynkę i kliknij link aktywacyjny.")
      return
    }

    setLoginPassword("")
    router.push("/dashboard")
  }

  async function handleRegister({ email, password, fullName }) {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    })

    if (error) {
      throw new Error(error.message || "Nie udało się utworzyć konta.")
    }

    setLoginEmail(email)

    return "Konto zostało utworzone. Sprawdź skrzynkę pocztową i potwierdź adres e-mail."
  }

  async function handleResetPassword(email) {
    const redirectTo = `${window.location.origin}/zmien-haslo`

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    })

    if (error) {
      throw new Error(
        error.message || "Nie udało się wysłać linku do zmiany hasła."
      )
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 p-4 font-sans">
      <div className="w-full max-w-sm space-y-6 rounded-xl border border-zinc-800 bg-zinc-900/50 p-8 shadow-2xl backdrop-blur-sm">
        <div className="space-y-2 text-center">
          <div className="mb-2 inline-flex h-9 w-9 items-center justify-center rounded bg-indigo-600 text-sm font-black text-white">
            ST
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-zinc-100">
            {isLoginMode && "Zaloguj się do SmartTeacher"}
            {isRegisterMode && "Utwórz konto nauczyciela"}
            {isResetMode && "Zmień hasło"}
          </h1>

          <p className="text-sm text-zinc-400">
            {isLoginMode && "Wróć do swojego panelu nauczyciela."}
            {isRegisterMode &&
              "Załóż konto i rozpocznij pracę ze SmartTeacher."}
            {isResetMode &&
              "Podaj adres e-mail. Wyślemy link do ustawienia nowego hasła."}
          </p>
        </div>

        {isLoginMode && (
          <LoginForm
            loginEmail={loginEmail}
            loginPassword={loginPassword}
            loginError={loginError}
            setLoginEmail={setLoginEmail}
            setLoginPassword={setLoginPassword}
            handleLogin={handleLogin}
            onRegisterClick={() => {
              setLoginError("")
              setMode("register")
            }}
            onResetPasswordClick={() => {
              setLoginError("")
              setMode("reset")
            }}
          />
        )}

        {isRegisterMode && (
          <RegisterForm
            loginEmail={loginEmail}
            setLoginEmail={setLoginEmail}
            handleRegister={handleRegister}
            onLoginClick={() => setMode("login")}
          />
        )}

        {isResetMode && (
          <ResetPasswordForm
            loginEmail={loginEmail}
            setLoginEmail={setLoginEmail}
            handleResetPassword={handleResetPassword}
            onLoginClick={() => setMode("login")}
          />
        )}

        <p className="border-t border-zinc-800 pt-4 text-center text-xs leading-relaxed text-zinc-500">
          Korzystasz ze wspólnego komputera? Po zakończeniu pracy wyloguj się z
          konta.
        </p>
      </div>
    </div>
  )
}
