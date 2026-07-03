"use client"; 

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function TestCatalogPage() {
  const [status, setStatus] = useState("Ładowanie...");
  const [topics, setTopics] = useState([]);

  useEffect(() => {
    async function loadCatalog() {
      const { data: catalogs, error: catalogError } = await supabase
        .from("lesson_catalogs")
        .select("id, title, curriculum_level, language")
        .eq("source_type", "smartteacher_base")
        .eq("is_active", true);

      if (catalogError) {
        setStatus(`Błąd katalogów: ${catalogError.message}`);
        return;
      }

      if (!catalogs || catalogs.length === 0) {
        setStatus("Nie znaleziono aktywnego katalogu.");
        return;
      }

      const catalogId = catalogs[0].id;

      const { data: sections, error: sectionsError } = await supabase
        .from("lesson_sections")
        .select("id, section_key, display_name, order_index")
        .eq("catalog_id", catalogId)
        .eq("is_active", true);

      if (sectionsError) {
        setStatus(`Błąd działów: ${sectionsError.message}`);
        return;
      }

      const { data: lessonTopics, error: topicsError } = await supabase
        .from("lesson_topics")
        .select("id, section_id, lesson_key, subtopic_key, display_title, order_index")
        .eq("catalog_id", catalogId)
        .eq("is_active", true);

      if (topicsError) {
        setStatus(`Błąd tematów: ${topicsError.message}`);
        return;
      }

      const sectionById = new Map(
        (sections ?? []).map((section) => [section.id, section])
      );

      const normalizedTopics = (lessonTopics ?? [])
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

      setTopics(normalizedTopics);
      setStatus(`OK — odczytano ${normalizedTopics.length} tematów.`);
    }

    loadCatalog();
  }, []);

  return (
    <main className="mx-auto max-w-4xl p-8">
      <h1 className="mb-4 text-2xl font-bold">Test katalogu SmartTeacher</h1>

      <p className="mb-6 rounded border p-3 text-sm">{status}</p>

      <div className="space-y-3">
        {topics.map((topic) => (
          <div key={topic.id} className="rounded border p-4">
            <div className="text-sm text-muted-foreground">
              {topic.section_name}
            </div>

            <div className="font-medium">{topic.display_title}</div>

            <div className="mt-1 text-xs text-muted-foreground">
              {topic.lesson_key}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
