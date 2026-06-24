import React from "react"
import Link from "next/link"
import { Sparkles, History, HelpCircle, Mail, LogOut, Settings, Library } from "lucide-react"
// Importujemy komponenty Popover z folderu ui
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover"

export default function Sidebar() {
  const menuItems = [
    { name: "Generator", icon: Sparkles, href: "/generator" },
    { name: "Historia", icon: History, href: "/historia" },
    {name: "Biblioteka materiałów", icon: Library, href: "/biblioteka"},
    { name: "Pomoc", icon: HelpCircle, href: "/pomoc" },
    { name: "Kontakt", icon: Mail, href: "/kontakt" },
  ]

  return (
    <div className="flex h-screen w-60 flex-col justify-between p-4 bg-zinc-950 text-zinc-200 select-none border-r border-zinc-900 font-sans">
      
      {/* GÓRNA SEKCJA: Logo i Nawigacja */}
      <div className="flex flex-col gap-5">
        <Link href="/" className="flex items-center gap-2.5 px-2 py-1.5 font-semibold text-sm tracking-tight hover:bg-zinc-900 rounded-md cursor-pointer transition-colors text-zinc-100">
          <div className="w-5 h-5 rounded bg-indigo-600 text-white flex items-center justify-center text-[10px] font-bold">
            ST
          </div>
          <span>SmartTeacher</span>
        </Link>
        
        <nav className="flex flex-col gap-0.5 text-sm font-medium text-zinc-400">
          {menuItems.map((item, index) => {
            const Icon = item.icon
            return (
              <Link 
                key={index} 
                href={item.href}
                className="flex items-center gap-3 px-2.5 py-2 hover:bg-zinc-900 hover:text-zinc-100 rounded-md cursor-pointer transition-all duration-150 group"
              >
                <Icon className="w-4 h-4 stroke-[1.75] text-zinc-500 group-hover:text-zinc-300 transition-colors" />
                <span>{item.name}</span>
              </Link>
            )
          })}
        </nav>
      </div>

      {/* DOLNA SEKCJA: Konto z menu rozwijanym (Popover) - ZOSTAWIONE BEZ ZMIAN */}
      <div className="border-t border-zinc-900 pt-3">
        <Popover>
          <PopoverTrigger asChild>
            <div className="flex items-center gap-3 px-2.5 py-2 hover:bg-zinc-900 rounded-md cursor-pointer transition-all duration-150 group">
              <div className="w-6 h-6 rounded-full bg-zinc-800 text-zinc-300 flex items-center justify-center text-xs font-bold border border-zinc-700 group-hover:border-zinc-500 transition-colors">
                N
              </div>
              <div className="flex flex-col text-left">
                <span className="text-sm font-medium text-zinc-200 leading-tight">Konto</span>
                <span className="text-[11px] text-zinc-500 truncate w-32">profil.nauczyciela</span>
              </div>
            </div>
          </PopoverTrigger>

          <PopoverContent 
            side="top" 
            align="start" 
            className="w-52 p-1 bg-zinc-900 border border-zinc-800 text-zinc-200 shadow-xl rounded-lg font-sans mb-1"
          >
            <div className="px-2.5 py-1.5 text-[11px] text-zinc-500 border-b border-zinc-800 mb-1">
              Zalogowano jako: <br />
              <span className="text-zinc-400 font-medium truncate block">profil.nauczyciela@email.com</span>
            </div>

            <Link 
              href="/ustawienia"
              className="flex items-center gap-2 px-2.5 py-2 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 rounded-md transition-colors w-full text-left"
            >
              <Settings className="w-4 h-4 text-zinc-500 stroke-[1.75]" />
              <span>Ustawienia konta</span>
            </Link>

            <button 
              onClick={() => alert("Tutaj podepniesz logikę wylogowania (np. usuwanie sesji)")}
              className="flex items-center gap-2 px-2.5 py-2 text-sm text-red-400 hover:bg-red-950/40 hover:text-red-300 rounded-md transition-colors w-full text-left font-medium mt-0.5"
            >
              <LogOut className="w-4 h-4 text-red-500/70 stroke-[1.75]" />
              <span>Wyloguj się</span>
            </button>
          </PopoverContent>
        </Popover>
      </div>

    </div>
  )
}
