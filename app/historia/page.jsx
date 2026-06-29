"use client";

import Link from "next/link";

export default function HistoriaPage() {
  return (
    <div className="space-y-6">
       <Link
        href="/dashboard"
        className="inline-flex items-center text-sm text-zinc-400 hover:text-zinc-100 transition-colors"
      >
        ← Wróć do wyboru przedmiotu
      </Link>

      <h1 className="text-3xl font-bold">
        Historia generowań
      </h1>
      
    </div>
  )
}
