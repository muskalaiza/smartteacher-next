"use client";

import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const router = useRouter();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-zinc-100">
          Dzień dobry, Izabela 👋
        </h1>

        <p className="text-zinc-400 mt-2">
          Wybierz lub dodaj swój przedmiot.
        </p>
      </div>

      <div>
        <h2 className="text-xl font-semibold text-zinc-100 mb-4">
          Przedmioty dodane do bazy
        </h2>

        <div className="grid gap-4 md:grid-cols-3">
          <button
          onClick={() => router.push("/generator?subject=informatyka")}
           
            className="group rounded-xl border border-zinc-800 bg-zinc-900 p-6 text-left text-zinc-300 transition-all duration-150 hover:border-zinc-700 hover:bg-zinc-800 hover:text-zinc-100"
          >
            Informatyka
          </button>

          <button
         onClick={() => router.push("/generator?subject=programowanie-obiektowe")}
            className="group rounded-xl border border-zinc-800 bg-zinc-900 p-6 text-left text-zinc-300 transition-all duration-150 hover:border-zinc-700 hover:bg-zinc-800 hover:text-zinc-100"
          >
            Programowanie obiektowe
          </button>
          <button
          onClick={() => router.push("/generator?subject=aplikacje-mobilne")}
           
            className="group rounded-xl border border-zinc-800 bg-zinc-900 p-6 text-left text-zinc-300 transition-all duration-150 hover:border-zinc-700 hover:bg-zinc-800 hover:text-zinc-100"
          >
            Aplikacje mobilne
          </button>
          <button
          onClick={() => router.push("/generator?subject=aplikacje-desktopowe")}
           
           className="group rounded-xl border border-zinc-800 bg-zinc-900 p-6 text-left text-zinc-300 transition-all duration-150 hover:border-zinc-700 hover:bg-zinc-800 hover:text-zinc-100"
          >
            Aplikacje desktopowe
          </button>
          <button
          
  className="rounded-xl border border-dashed border-zinc-700 p-6 text-left text-zinc-400 transition-all duration-150 hover:border-zinc-500 hover:bg-zinc-900 hover:text-zinc-100"
>
  + Dodaj przedmiot
</button>
        </div>
      </div>
    </div>
  );
}
