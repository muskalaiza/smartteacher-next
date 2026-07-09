export async function getCurrentLessonCatalogUserId(supabase) {
  if (!supabase) {
    throw new Error("Brakuje klienta Supabase.");
  }

  const { data, error } = await supabase.auth.getUser();

  if (error || !data?.user) {
    throw new Error("Musisz być zalogowana, aby pobrać katalog lekcji.");
  }

  return data.user.id;
}

export async function listGradeLevels({ supabase }) {
  if (!supabase) {
    throw new Error("Brakuje klienta Supabase.");
  }

  const { data, error } = await supabase
    .from("grade_levels")
    .select("id, grade_key, label, order_index")
    .order("order_index", { ascending: true });

  if (error) {
    throw new Error(`Nie udało się pobrać listy klas: ${error.message}`);
  }

  return data || [];
}

export async function getPrivateLessonCatalogForGrade({
  supabase,
  userId,
  subjectId,
  gradeLevelId,
}) {
  if (!supabase) {
    throw new Error("Brakuje klienta Supabase.");
  }

  if (!userId) {
    throw new Error("Musisz być zalogowana, aby pobrać katalog lekcji.");
  }

  if (!subjectId) {
    throw new Error("Nie udało się ustalić aktywnego przedmiotu.");
  }

  if (!gradeLevelId) {
    throw new Error("Wybierz klasę.");
  }

  const { data, error } = await supabase
    .from("lesson_catalogs")
    .select(
      `
      id,
      owner_id,
      subject_id,
      grade_level_id,
      source_type,
      curriculum_level,
      language,
      title,
      is_active,
      created_at
    `
    )
    .eq("owner_id", userId)
    .eq("subject_id", subjectId)
    .eq("grade_level_id", gradeLevelId)
    .eq("source_type", "teacher_private")
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1);

  if (error) {
    throw new Error(`Nie udało się pobrać katalogu lekcji: ${error.message}`);
  }

  return data?.[0] || null;
}

export async function listLessonSections({ supabase, catalogId }) {
  if (!supabase) {
    throw new Error("Brakuje klienta Supabase.");
  }

  if (!catalogId) {
    return [];
  }

  const { data, error } = await supabase
    .from("lesson_sections")
    .select(
      `
      id,
      catalog_id,
      section_key,
      display_name,
      order_index,
      is_active
    `
    )
    .eq("catalog_id", catalogId)
    .eq("is_active", true)
    .order("order_index", { ascending: true });

  if (error) {
    throw new Error(`Nie udało się pobrać działów: ${error.message}`);
  }

  return data || [];
}

export async function listLessonTopics({ supabase, catalogId, sectionId }) {
  if (!supabase) {
    throw new Error("Brakuje klienta Supabase.");
  }

  if (!catalogId || !sectionId) {
    return [];
  }

  const { data, error } = await supabase
    .from("lesson_topics")
    .select(
      `
      id,
      catalog_id,
      section_id,
      lesson_key,
      subtopic_key,
      display_title,
      order_index,
      is_active
    `
    )
    .eq("catalog_id", catalogId)
    .eq("section_id", sectionId)
    .eq("is_active", true)
    .order("order_index", { ascending: true });

  if (error) {
    throw new Error(`Nie udało się pobrać tematów lekcji: ${error.message}`);
  }

  return data || [];
}
