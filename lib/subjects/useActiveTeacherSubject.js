"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export function useActiveTeacherSubject(subjectKey) {
  const router = useRouter();

  const [subject, setSubject] = useState(null);
  const [teacherSubject, setTeacherSubject] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadActiveTeacherSubject() {
      setIsLoading(true);
      setErrorMessage("");
      setSubject(null);
      setTeacherSubject(null);

      if (!subjectKey) {
        setErrorMessage("Brak identyfikatora przedmiotu w adresie strony.");
        setIsLoading(false);
        return;
      }

      const { data: userData, error: userError } =
        await supabase.auth.getUser();

      if (!isMounted) return;

      if (userError || !userData?.user) {
        router.push("/");
        return;
      }

      const { data, error } = await supabase
        .from("teacher_subjects")
        .select(`
          id,
          subject_id,
          is_active,
          subjects!inner (
            id,
            subject_key,
            name
          )
        `)
        .eq("owner_id", userData.user.id)
        .eq("is_active", true)
        .eq("subjects.subject_key", subjectKey)
        .maybeSingle();

      if (!isMounted) return;

      if (error) {
        console.error("Błąd pobierania aktywnego przedmiotu:", error.message);
        setErrorMessage("Nie udało się pobrać przedmiotu z bazy.");
        setIsLoading(false);
        return;
      }

      if (!data?.subjects) {
        setErrorMessage("Ten przedmiot nie jest aktywny na Twoim koncie.");
        setIsLoading(false);
        return;
      }

      setTeacherSubject(data);
      setSubject(data.subjects);
      setIsLoading(false);
    }

    loadActiveTeacherSubject();

    return () => {
      isMounted = false;
    };
  }, [router, subjectKey]);

  return {
    subject,
    teacherSubject,
    isLoading,
    errorMessage,
  };
}