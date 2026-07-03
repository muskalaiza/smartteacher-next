"use client";

import { useEffect, useState } from "react";
import { getSmartTeacherCatalog } from "@/lib/catalog/getSmartTeacherCatalog";

export default function TestCatalogPage() {
  const [status, setStatus] = useState("Ładowanie...");
  const [topics, setTopics] = useState([]);

  useEffect(() => {
    async function loadCatalog() {
      try {
        const catalogTopics = await getSmartTeacherCatalog();

        setTopics(catalogTopics);
        setStatus(`OK — odczytano ${catalogTopics.length} tematów.`);
      } catch (error) {
        setStatus(error.message);
      }
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
