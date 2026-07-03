import { supabase } from "@/lib/supabaseClient";

export async function getSmartTeacherCatalog() {
  const { data: catalogs, error: catalogError } = await supabase
    .from("lesson_catalogs")
    .select("id, title, curriculum_level, language")
    .eq("source_type", "smartteacher_base")
    .eq("is_active", true);

  if (catalogError) {
    throw new Error(`Błąd katalogów: ${catalogError.message}`);
  }

  if (!catalogs || catalogs.length === 0) {
    return [];
  }

  const catalogId = catalogs[0].id;

  const { data: sections, error: sectionsError } = await supabase
    .from("lesson_sections")
    .select("id, section_key, display_name, order_index")
    .eq("catalog_id", catalogId)
    .eq("is_active", true);

  if (sectionsError) {
    throw new Error(`Błąd działów: ${sectionsError.message}`);
  }

  const { data: topics, error: topicsError } = await supabase
    .from("lesson_topics")
    .select("id, section_id, lesson_key, subtopic_key, display_title, order_index")
    .eq("catalog_id", catalogId)
    .eq("is_active", true);

  if (topicsError) {
    throw new Error(`Błąd tematów: ${topicsError.message}`);
  }

  const sectionById = new Map(
    (sections ?? []).map((section) => [section.id, section])
  );

  return (topics ?? [])
    .map((topic) => {
      const section = sectionById.get(topic.section_id);

      return {
        ...topic,
        section_key: section?.section_key ?? "",
        section_name: section?.display_name ?? "",
        section_order: section?.order_index ?? 0,
      };
    })
    .sort((a, b) => {
      if (a.section_order !== b.section_order) {
        return a.section_order - b.section_order;
      }

      return a.order_index - b.order_index;
    });
}
