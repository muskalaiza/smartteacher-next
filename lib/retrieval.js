import { learningUnits } from "../data/learningUnits";

 export function getLearningUnits({
  topic,
  subtopic,
  curriculum_level,
  language
}) {
  if (!topic || !subtopic) return null;

  // Przygotowanie filtrów dla szybszego porównywania
  const targetTopic = topic.trim().toLowerCase();
  const targetSubtopic = subtopic.trim().toLowerCase();
  
  // Konwersja poziomów na Set dla wyszukiwania O(1)
  const levelsSet = curriculum_level 
    ? new Set(Array.isArray(curriculum_level) ? curriculum_level : [curriculum_level])
    : null;

  // Konwersja języków na Set dla wyszukiwania O(1)
  const langSet = language 
    ? new Set(Array.isArray(language) ? language : [language])
    : null;

  // Inicjalizacja struktury wynikowej
  const result = { concepts: [], structures: [], errors: [], tasks: [] };
  let hasResults = false;

  for (const u of learningUnits) {
    // 1. Podstawowa walidacja i bezpieczne porównanie (Case-insensitive)
    if (!u?.topic || !u?.subtopic) continue;
    if (u.topic.trim().toLowerCase() !== targetTopic) continue;
    if (u.subtopic.trim().toLowerCase() !== targetSubtopic) continue;

    // 2. Filtr poziomu nauczania (curriculum_level)
    if (levelsSet && !levelsSet.has(u.curriculum_level)) continue;

    // 3. Filtr języka
    if (langSet && u.language) {
      const hasMatchingLang = u.language.some(lang => langSet.has(lang));
      if (!hasMatchingLang) continue;
    }

    // 4. Agregacja do odpowiedniego typu (zastępuje końcowe 4 filtry)
    if (u.type === "concept") result.concepts.push(u);
    else if (u.type === "structure") result.structures.push(u);
    else if (u.type === "error") result.errors.push(u);
    else if (u.type === "task") result.tasks.push(u);
    
    hasResults = true;
  }

  return hasResults ? result : null;
}


