"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import AuthPanel from "@/components/auth/authPanel"

export default function HomePage() {
  const router = useRouter()

  const [loginEmail, setLoginEmail] = useState("")
  const [loginPassword, setLoginPassword] = useState("")
  const [loginError, setLoginError] = useState("")

  function handleLogin(event) {
    event.preventDefault()

    if (!loginEmail.trim() || !loginPassword.trim()) {
      setLoginError("Wprowadź poprawne dane logowania.")
      return
    }

    setLoginError("")
    router.push("/dashboard")
  }

  return (
    <AuthPanel
      loginEmail={loginEmail}
      loginPassword={loginPassword}
      loginError={loginError}
      setLoginEmail={setLoginEmail}
      setLoginPassword={setLoginPassword}
      handleLogin={handleLogin}
    />
  )
}
