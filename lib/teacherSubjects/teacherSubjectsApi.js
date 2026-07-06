export async function getCurrentDashboardUser(supabase) {
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData?.user) {
    throw new Error("AUTH_REQUIRED");
  }

  return userData.user;
}

export async function listActiveTeacherSubjects({ supabase, userId }) {
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
    throw new Error("Nie udało się pobrać Twoich przedmiotów.");
  }

  return data || [];
}

export async function listAllActiveSubjects(supabase) {
  const { data, error } = await supabase
    .from("subjects")
    .select("id, subject_key, name")
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (error) {
    throw new Error("Nie udało się pobrać katalogu przedmiotów.");
  }

  return data || [];
}

export async function addOrReactivateTeacherSubject({
  supabase,
  userId,
  subjectId,
}) {
  if (!userId) {
    throw new Error("Nie znaleziono zalogowanego użytkownika.");
  }

  if (!subjectId) {
    throw new Error("Wybierz przedmiot z listy.");
  }

  const { data: existingSubject, error: existingError } = await supabase
    .from("teacher_subjects")
    .select("id, is_active")
    .eq("owner_id", userId)
    .eq("subject_id", subjectId)
    .maybeSingle();

  if (existingError) {
    throw new Error("Nie udało się sprawdzić, czy przedmiot już istnieje.");
  }

  if (existingSubject) {
    const { error: updateError } = await supabase
      .from("teacher_subjects")
      .update({ is_active: true })
      .eq("id", existingSubject.id);

    if (updateError) {
      throw new Error("Nie udało się ponownie aktywować przedmiotu.");
    }

    return;
  }

  const { error: insertError } = await supabase
    .from("teacher_subjects")
    .insert({
      owner_id: userId,
      subject_id: subjectId,
      is_active: true,
    });

  if (insertError) {
    throw new Error("Nie udało się dodać przedmiotu.");
  }
}

export async function deactivateTeacherSubject({
  supabase,
  userId,
  teacherSubjectId,
}) {
  if (!userId) {
    throw new Error("Nie znaleziono zalogowanego użytkownika.");
  }

  if (!teacherSubjectId) {
    throw new Error("Nie znaleziono przedmiotu do usunięcia.");
  }

  const { error } = await supabase
    .from("teacher_subjects")
    .update({ is_active: false })
    .eq("id", teacherSubjectId)
    .eq("owner_id", userId);

  if (error) {
    throw new Error("Nie udało się usunąć przedmiotu z panelu.");
  }
}