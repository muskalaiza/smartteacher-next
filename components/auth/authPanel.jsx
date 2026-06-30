/*
→ trzyma stan: aktualny widok formularza
→ przełącza formularze: login / register / reset
→ nie zawiera pól formularzy
*/

"use client"

import React, { useState } from "react"
import LoginForm from "./loginForm"
import RegisterForm from "./registerForm"
import ResetPasswordForm from "./resetPasswordForm"

export default function AuthPanel({
  loginEmail,
  loginPassword,
  loginError,
  setLoginEmail,
  setLoginPassword,
  handleLogin,
  handleRegister,
  handleResetPassword,
}) {
  const [mode, setMode] = useState("login")

  const isLoginMode = mode === "login"
  const isRegisterMode = mode === "register"
  const isResetMode = mode === "reset"

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
            onRegisterClick={() => setMode("register")}
            onResetPasswordClick={() => setMode("reset")}
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
