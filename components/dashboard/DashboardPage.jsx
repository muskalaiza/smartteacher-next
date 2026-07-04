"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function DashboardPage() {
  const router = useRouter();

  const [user, setUser] = useState(null);
  const [teacherSubjects, setTeacherSubjects] = useState([]);
  const [allSubjects, setAllSubjects] = useState([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function loadDashboard() {
      setIsLoading(true);
      setErrorMessage("");
      setMessage("");

      const { data: userData, error: userError } = await supabase.auth.getUser();

      if (userError || !userData?.user) {
        router.push("/");
        return;
      }

      setUser(userData.user);

      await Promise.all([
        loadTeacherSubjects(userData.user.id),
        loadAllSubjects(),
      ]);

      setIsLoading(false);
    }

    loadDashboard();
  }, [router]);

  async function loadTeacherSubjects(userId) {
    const { data, error } = await supabase
      .from("teacher_subjects")
      .select(`
        id,
        subject_id,
        is_active,
        subjects (
          id,
          subject_key,
          name
        )
      `)
      .eq("owner_id", userId)
      .eq("is_active", true)
      .order("created_at", { ascending: true });

    if (error) {
      setErrorMessage("Nie udało się pobrać Twoich przedmiotów.");
      console.error("Błąd pobierania teacher_subjects:", error.message);
      return;
    }

    setTeacherSubjects(data || []);
  }

  async function loadAllSubjects() {
    const { data, error } = await supabase
      .from("subjects")
      .select("id, subject_key, name")
      .eq("is_active", true)
      .order("name", { ascending: true });

    if (error) {
      setErrorMessage("Nie udało się pobrać katalogu przedmiotów.");
      console.error("Błąd pobierania subjects:", error.message);
      return;
    }

    setAllSubjects(data || []);
  }

  const availableSubjects = useMemo(() => {
    const addedSubjectIds = new Set(
      teacherSubjects.map((item) => item.subject_id)
    );

    return allSubjects.filter((subject) => !addedSubjectIds.has(subject.id));
  }, [allSubjects, teacherSubjects]);

  const teacherFirstName = useMemo(() => {
  const fullName = user?.user_metadata?.full_name?.trim()

  if (!fullName) {
    return ""
  }

  return fullName.split(/\s+/)[0]
}, [user])

  async function handleAddSubject(event) {
    event.preventDefault();

    if (!user?.id) {
      setErrorMessage("Nie znaleziono zalogowanego użytkownika.");
      return;
    }

    if (!selectedSubjectId) {
      setErrorMessage("Wybierz przedmiot z listy.");
      return;
    }

    setIsAdding(true);
    setErrorMessage("");
    setMessage("");

    const { data: existingSubject, error: existingError } = await supabase
      .from("teacher_subjects")
      .select("id, is_active")
      .eq("owner_id", user.id)
      .eq("subject_id", selectedSubjectId)
      .maybeSingle();

    if (existingError) {
      setIsAdding(false);
      setErrorMessage("Nie udało się sprawdzić, czy przedmiot już istnieje.");
      console.error("Błąd sprawdzania teacher_subjects:", existingError.message);
      return;
    }

    if (existingSubject) {
      const { error: updateError } = await supabase
        .from("teacher_subjects")
        .update({ is_active: true })
        .eq("id", existingSubject.id);

      if (updateError) {
        setIsAdding(false);
        setErrorMessage("Nie udało się ponownie aktywować przedmiotu.");
        console.error("Błąd aktualizacji teacher_subjects:", updateError.message);
        return;
      }
    } else {
      const { error: insertError } = await supabase
        .from("teacher_subjects")
        .insert({
          owner_id: user.id,
          subject_id: selectedSubjectId,
          is_active: true,
        });

      if (insertError) {
        setIsAdding(false);
        setErrorMessage("Nie udało się dodać przedmiotu.");
        console.error("Błąd dodawania teacher_subjects:", insertError.message);
        return;
      }
    }

    setSelectedSubjectId("");
    setMessage("Przedmiot został dodany do Twojego panelu.");
    await loadTeacherSubjects(user.id);
    setIsAdding(false);
  }

  function handleOpenSubject(subjectKey) {
    router.push(`/generator?subject=${encodeURIComponent(subjectKey)}`);
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-bold text-zinc-100">
          Ładowanie panelu...
        </h1>
        <p className="text-zinc-400">
          Sprawdzamy Twoje konto i przedmioty.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
       <h1 className="text-3xl font-bold text-zinc-100">
          Dzień dobry{teacherFirstName ? `, ${teacherFirstName}` : ""} 👋
      </h1>

        <p className="mt-2 text-zinc-400">
          Wybierz przedmiot, którego uczysz, albo dodaj nowy z katalogu.
        </p>
      </div>

      {errorMessage && (
        <div className="rounded-lg border border-red-900/50 bg-red-950/30 p-3 text-sm text-red-300">
          {errorMessage}
        </div>
      )}

      {message && (
        <div className="rounded-lg border border-emerald-900/50 bg-emerald-950/30 p-3 text-sm text-emerald-300">
          {message}
        </div>
      )}

      <section>
        <h2 className="mb-4 text-xl font-semibold text-zinc-100">
          Moje przedmioty
        </h2>

        {teacherSubjects.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-700 bg-zinc-900/40 p-6 text-zinc-400">
            Nie masz jeszcze dodanych przedmiotów. Dodaj pierwszy przedmiot z
            katalogu poniżej.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-3">
            {teacherSubjects.map((item) => {
              const subject = item.subjects;

              if (!subject) return null;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleOpenSubject(subject.subject_key)}
                  className="group rounded-xl border border-zinc-800 bg-zinc-900 p-6 text-left text-zinc-300 transition-all duration-150 hover:border-zinc-700 hover:bg-zinc-800 hover:text-zinc-100"
                >
                  <span className="block text-base font-semibold">
                    {subject.name}
                  </span>

                  <span className="mt-2 block text-xs text-zinc-500">
                    {subject.subject_key}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </section>

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
        <h2 className="text-lg font-semibold text-zinc-100">
          Dodaj przedmiot
        </h2>

        <p className="mt-1 text-sm text-zinc-400">
          Wybierz przedmiot ze wspólnego katalogu SmartTeacher.
        </p>

        <form onSubmit={handleAddSubject} className="mt-4 flex flex-col gap-3 md:flex-row">
          <select
            value={selectedSubjectId}
            onChange={(event) => setSelectedSubjectId(event.target.value)}
            disabled={availableSubjects.length === 0 || isAdding}
            className="min-h-10 flex-1 rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-200 outline-none transition-colors focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <option value="">
              {availableSubjects.length === 0
                ? "Wszystkie dostępne przedmioty są już dodane"
                : "Wybierz przedmiot"}
            </option>

            {availableSubjects.map((subject) => (
              <option key={subject.id} value={subject.id}>
                {subject.name}
              </option>
            ))}
          </select>

          <button
            type="submit"
            disabled={!selectedSubjectId || isAdding}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isAdding ? "Dodawanie..." : "+ Dodaj przedmiot"}
          </button>
        </form>
      </section>
    </div>
  );
}

