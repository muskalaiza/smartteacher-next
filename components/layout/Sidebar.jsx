"use client"

import React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Sparkles, History, Mail, Library } from "lucide-react"

function getSubjectKeyFromPathname(pathname) {
  const segments = pathname.split("/").filter(Boolean)

  if (segments[0] !== "przedmioty") {
    return ""
  }

  return segments[1] || ""
}

function buildSubjectHref(subjectKey, section) {
  if (!subjectKey) {
    return "/dashboard"
  }

  return `/przedmioty/${encodeURIComponent(subjectKey)}/${section}`
}

export default function Sidebar() {
  const pathname = usePathname()
  const subjectKey = getSubjectKeyFromPathname(pathname)

  const menuItems = [
    {
      name: "Generator",
      icon: Sparkles,
      href: buildSubjectHref(subjectKey, "generator"),
    },
    {
      name: "Historia",
      icon: History,
      href: buildSubjectHref(subjectKey, "historia"),
    },
    {
      name: "Biblioteka materiałów",
      icon: Library,
      href: buildSubjectHref(subjectKey, "biblioteka"),
    },
    {
      name: "Kontakt",
      icon: Mail,
      href: subjectKey ? buildSubjectHref(subjectKey, "kontakt") : "/kontakt",
    },
  ]

  return (
    <div className="flex h-screen w-60 flex-col border-r border-zinc-900 bg-zinc-950 p-4 font-sans text-zinc-200 select-none">
      <div className="flex flex-col gap-5">
        <Link
          href="/dashboard"
          className="flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm font-semibold tracking-tight text-zinc-100 transition-colors hover:bg-zinc-900"
        >
          <div className="flex h-5 w-5 items-center justify-center rounded bg-indigo-600 text-[10px] font-bold text-white">
            ST
          </div>
          <span>SmartTeacher</span>
        </Link>

        <nav className="flex flex-col gap-0.5 text-sm font-medium text-zinc-400">
          {menuItems.map((item) => {
            const Icon = item.icon

            return (
              <Link
                key={item.name}
                href={item.href}
                className="group flex items-center gap-3 rounded-md px-2.5 py-2 transition-all duration-150 hover:bg-zinc-900 hover:text-zinc-100"
              >
                <Icon className="h-4 w-4 text-zinc-500 transition-colors group-hover:text-zinc-300" />
                <span>{item.name}</span>
              </Link>
            )
          })}
        </nav>
      </div>
    </div>
  )
}
