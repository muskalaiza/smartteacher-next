"use client";

import Link from "next/link";

export default function KontaktPage() {
  return (
     <div className="space-y-6">
       <Link
        href="/dashboard"
        className="inline-flex items-center text-sm text-zinc-400 hover:text-zinc-100 transition-colors"
      >
        ← Dashboard
      </Link>

      <h1 className="text-3xl font-bold">
        Napisz do mnie
      </h1>
    </div>
  )
}
