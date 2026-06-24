"use client"
import React from "react"
import { Button } from "../ui/button" 
import { useSidebarToggle } from "./AppShell" // Upewnij się, że AppShell.js jest w tym samym folderze

export default function Topbar() {
  const toggleData = useSidebarToggle()

  // Zabezpieczenie przed błędem, jeśli Context jeszcze się nie załadował
  if (!toggleData) return null; 

  const { toggleSidebar } = toggleData

  return (
    <header className="flex h-12 items-center border-b px-4 bg-background justify-between">
      <div className="flex items-center gap-3">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={toggleSidebar}
          className="h-8 w-8 p-0"
        >
          ☰
        </Button>
        <span className="text-sm font-medium text-muted-foreground">Workspace / Projekt</span>
      </div>
    </header>
  )
}
