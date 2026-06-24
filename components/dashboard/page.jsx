"use client";

import { useRouter } from "next/navigation";
import DashboardPage from "@/components/dashboard/DashboardPage";

export default function Dashboard() {
  return <DashboardPage />;
}

export default function DashboardPage() {
  const router = useRouter();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-zinc-100">
          Dzień dobry, Izabela 👋
        </h1>

        <p className="text-zinc-400 mt-2">
          Wybierz przedmiot, z którym chcesz pracować.
        </p>
      </div>

      <div>
        <h2 className="text-xl font-semibold text-zinc-100 mb-4">
          Twoje przedmioty
        </h2>

        <div className="grid gap-4 md:grid-cols-3">
          <button
            onClick={() => router.push("/generator")}
            className="rounded-xl border border-zinc-800 bg-zinc-900 p-6 text-left hover:border-violet-500 transition-colors"
          >
            Informatyka
          </button>

          <button
            onClick={() => router.push("/generator")}
            className="rounded-xl border border-zinc-800 bg-zinc-900 p-6 text-left hover:border-violet-500 transition-colors"
          >
            Programowanie obiektowe
          </button>

          <button
            className="rounded-xl border border-dashed border-zinc-700 p-6 text-left text-zinc-400"
          >
            Dodaj przedmiot
          </button>
        </div>
      </div>
    </div>
  );
}
