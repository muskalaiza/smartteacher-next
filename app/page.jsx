//tymczasowa, prosta walidacja logowania (dowolny e-mail i hasło dające sukces) i renderuje strukturę aplikacji

"use client"

import { useRouter } from "next/navigation";
import { useState } from "react"
import LoginForm from "@/components/auth/loginForm"

export default function HomePage() {
  // Stany wymagane przez Twój komponent LoginForm
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const router = useRouter();

  const processLogin = (e) => {
    e.preventDefault()
    
    // Prosta weryfikacja na czas pracy bez bazy danych
    if (email && password) {
      setError("")
      router.push("/dashboard")
    } else {
      setError("Wprowadź poprawne dane logowania.")
    }
  }
    return (
    <LoginForm
      loginEmail={email}
      loginPassword={password}
      loginError={error}
      setLoginEmail={setEmail}
      setLoginPassword={setPassword}
      handleLogin={processLogin}
    />
  )
}

