"use client"

import Link from "next/link"
import ChangePasswordForm from "@/components/auth/changePasswordForm"

export default function ChangePasswordPage() {
  async function handleChangePassword() {
    throw new Error(
      "Zmiana hasła wymaga podłączenia Supabase. Ten etap zostanie wykonany później."
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 p-4 font-sans">
      <div className="w-full max-w-sm space-y-6 rounded-xl border border-zinc-800 bg-zinc-900/50 p-8 shadow-2xl backdrop-blur-sm">
        <div className="space-y-2 text-center">
          <div className="mb-2 inline-flex h-9 w-9 items-center justify-center rounded bg-indigo-600 text-sm font-black text-white">
            ST
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-zinc-100">
            Ustaw nowe hasło
          </h1>

          <p className="text-sm leading-6 text-zinc-400">
            Wpisz nowe hasło do konta SmartTeacher.
          </p>
        </div>

        <ChangePasswordForm handleChangePassword={handleChangePassword} />

        <div className="border-t border-zinc-800 pt-4 text-center">
          <Link
            href="/"
            className="text-xs font-medium text-zinc-400 transition-colors hover:text-zinc-100"
          >
            Wróć do logowania
          </Link>
        </div>
      </div>
    </div>
  )
}

