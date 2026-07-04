"use client"

import React, { useEffect, useState } from "react"
import Link from "next/link"
import { HelpCircle, LogOut, Settings } from "lucide-react"
import { Button } from "../ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover"
import { useSidebarToggle } from "./AppShell"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"

export default function Topbar() {
  const toggleData = useSidebarToggle()
  const router = useRouter()

  const [teacherEmail, setTeacherEmail] = useState("")
  const [teacherName, setTeacherName] = useState("")

  useEffect(() => {
    let isMounted = true

    async function loadCurrentUser() {
      const { data, error } = await supabase.auth.getUser()

      if (!isMounted) return

      if (error || !data?.user) {
        setTeacherEmail("")
        setTeacherName("")
        return
      }

      setTeacherEmail(data.user.email || "")
      setTeacherName(data.user.user_metadata?.full_name || "")
    }

    loadCurrentUser()

    return () => {
      isMounted = false
    }
  }, [])

  if (!toggleData) return null

  const { toggleSidebar } = toggleData

  const accountLabel = teacherName || teacherEmail || "Konto nauczyciela"
  const accountEmail = teacherEmail || "Ładowanie..."

  const teacherInitials = teacherName
    ? teacherName
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0])
        .join("")
        .toUpperCase()
    : teacherEmail
        .split("@")[0]
        .slice(0, 2)
        .toUpperCase() || "ST"

  async function handleLogout() {
    const { error } = await supabase.auth.signOut({ scope: "local" })

    if (error) {
      console.error("Błąd wylogowania:", error.message)
      return
    }

    setTeacherEmail("")
    setTeacherName("")

    router.push("/")
    router.refresh()
  }


  if (!toggleData) return null

  return (
    <header className="flex h-12 items-center justify-between border-b border-zinc-200 bg-background px-4">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleSidebar}
          className="h-8 w-8 p-0"
        >
          ☰
        </Button>

        <span className="text-sm font-medium text-muted-foreground">
          Panel nauczyciela
        </span>
      </div>

      <div className="flex items-center gap-2">
        <Link
  href="/pomoc"
  className="group flex h-8 items-center gap-2 rounded-md px-2.5 py-2 text-sm font-medium text-zinc-400 transition-all duration-150 hover:bg-zinc-900 hover:text-zinc-100"
>
  <HelpCircle className="h-4 w-4 text-zinc-500 transition-colors group-hover:text-zinc-300" />
  <span>Pomoc</span>
</Link>
         
        <Popover>
          <PopoverTrigger asChild>
           <button
  type="button"
  className="group flex h-8 items-center gap-3 rounded-md px-2.5 py-2 text-zinc-400 transition-all duration-150 hover:bg-zinc-900 hover:text-zinc-100"
>
  <div className="flex h-6 w-6 items-center justify-center rounded-full border border-zinc-700 bg-zinc-800 text-xs font-bold text-zinc-300 transition-colors group-hover:border-zinc-500">
    {teacherInitials}
  </div>

  <span className="hidden text-sm font-medium leading-tight sm:inline">
    Konto
  </span>
</button>
          </PopoverTrigger>

          <PopoverContent
            side="bottom"
            align="end"
            className="w-64 rounded-lg border border-zinc-800 bg-zinc-900 p-1 font-sans text-zinc-200 shadow-xl"
          >
            <div className="mb-1 border-b border-zinc-800 px-2.5 py-2 text-[11px] text-zinc-500">
              Zalogowano jako:
              <br />
              <span className="block truncate font-medium text-zinc-300">
  {accountLabel}
</span>

{teacherName && teacherEmail && (
  <span className="block truncate text-[11px] text-zinc-500">
    {accountEmail}
  </span>
)}
            </div>

            <Link
              href="/ustawienia"
              className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-zinc-100"
            >
              <Settings className="h-4 w-4 text-zinc-500" />
              <span>Ustawienia konta</span>
            </Link>

           <button
  type="button"
  onClick={handleLogout}
  className="mt-0.5 flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm font-medium text-red-400 transition-colors hover:bg-red-950/40 hover:text-red-300"
>
              <LogOut className="h-4 w-4 text-red-500/70" />
              <span>Wyloguj się</span>
            </button>
          </PopoverContent>
        </Popover>
      </div>
    </header>
  )
}
