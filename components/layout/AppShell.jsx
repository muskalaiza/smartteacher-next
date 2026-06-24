"use client"
import { createContext, useContext, useState } from "react"
import Sidebar from "./Sidebar"
import Topbar from "./Topbar"


// Tworzymy stan otwarcia/zamknięcia menu bocznego
const SidebarContext = createContext(null)

export const useSidebarToggle = () => useContext(SidebarContext)

export default function AppShell({ children }) {
  const [isOpen, setIsOpen] = useState(true)

  const toggleSidebar = () => setIsOpen(!isOpen)

  return (
    <SidebarContext.Provider value={{ isOpen, toggleSidebar }}>
      <div className="flex min-h-screen w-full bg-background text-foreground antialiased">
        
        {/* Lewa strona - Twój pasek boczny */}
     <aside 
          className={`border-r bg-card transition-all duration-200 ease-in-out ${
            isOpen ? "w-60" : "w-0 -translate-x-full overflow-hidden border-r-0"
          }`}
        >
          <Sidebar />
        </aside>

        {/* Prawa strona - Górna belka i treść główna */}
       <div className="flex flex-1 flex-col overflow-hidden">
          <Topbar />
          <main className="flex-1 p-6">
            {children}
          </main>
        </div>

      </div>
    </SidebarContext.Provider>
  )
}
