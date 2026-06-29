"use client"

import React from "react"
import { Button } from "../ui/button"

export default function LoginForm({
  loginEmail,
  loginPassword,
  loginError,
  setLoginEmail,
  setLoginPassword,
  handleLogin
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 p-4 font-sans">
      <div className="w-full max-w-sm space-y-6 rounded-xl border border-zinc-800 bg-zinc-900/50 p-8 shadow-2xl backdrop-blur-sm">
        
        <div className="space-y-2 text-center">
          <div className="inline-flex h-9 w-9 items-center justify-center rounded bg-indigo-600 text-white text-sm font-black mb-2">
            ST
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-100">
            Zaloguj się do SmartTeacher
          </h1>
        </div>

        {/* Wyświetlanie błędu logowania */}
        {loginError && (
          <div className="p-2.5 text-xs text-red-400 bg-red-950/30 border border-red-900/50 rounded-md text-center">
            {loginError}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-300">Adres e-mail</label>
            <input
              type="email"
              required
              placeholder="nazwa@szkola.pl"
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
              className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-200 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-300">Hasło</label>
            <input
              type="password"
              required
              placeholder="••••••••"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-200 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors"
            />
          </div>

          <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-2 mt-2 transition-colors">
            Zaloguj się
          </Button>
        </form>

      </div>
    </div>
  )
}
