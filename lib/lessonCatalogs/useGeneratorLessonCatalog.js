"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  getCurrentLessonCatalogUserId,
  getPrivateLessonCatalogForGrade,
  listGradeLevels,
  listLessonSections,
  listLessonTopics,
} from "@/lib/lessonCatalogs/lessonCatalogsApi";

function getErrorMessage(error) {
  return error instanceof Error
    ? error.message
    : "Wystąpił nieznany błąd podczas pobierania katalogu lekcji.";
}

export function useGeneratorLessonCatalog(subjectId) {
    // stany klas
  const [gradeLevels, setGradeLevels] = useState([]);
  const [gradeLevelsLoading, setGradeLevelsLoading] = useState(true);
  const [gradeLevelsError, setGradeLevelsError] = useState("");
  const [selectedGradeLevelId, setSelectedGradeLevelId] = useState("");
//stany tematów lekcji
  const [selectedLessonCatalogId, setSelectedLessonCatalogId] = useState("");

  const [lessonSections, setLessonSections] = useState([]);
  const [sectionsLoading, setSectionsLoading] = useState(false);
  const [sectionsError, setSectionsError] = useState("");
  const [selectedLessonSectionId, setSelectedLessonSectionId] = useState("");

  const [lessonTopics, setLessonTopics] = useState([]);
  const [topicsLoading, setTopicsLoading] = useState(false);
  const [topicsError, setTopicsError] = useState("");
  const [selectedLessonTopicId, setSelectedLessonTopicId] = useState("");

  function resetSections() {
    setSelectedLessonSectionId("");
    setLessonSections([]);
    setSectionsError("");
    setSectionsLoading(false);
  }

  function resetTopics() {
    setSelectedLessonTopicId("");
    setLessonTopics([]);
    setTopicsError("");
    setTopicsLoading(false);
  }

  function handleGradeLevelChange(event) {
    const gradeLevelId = event.target.value;

    setSelectedGradeLevelId(gradeLevelId);
    setSelectedLessonCatalogId("");
    resetSections();
    resetTopics();

    if (gradeLevelId && subjectId) {
      setSectionsLoading(true);
    }
  }

  function handleLessonSectionChange(event) {
    const lessonSectionId = event.target.value;

    setSelectedLessonSectionId(lessonSectionId);
    resetTopics();

    if (lessonSectionId && selectedLessonCatalogId) {
      setTopicsLoading(true);
    }
  }

  function handleLessonTopicChange(event) {
    setSelectedLessonTopicId(event.target.value);
  }

  useEffect(() => {
    let isMounted = true;

    async function loadGradeLevels() {
      try {
        const loadedGradeLevels = await listGradeLevels({ supabase });

        if (!isMounted) return;

        setGradeLevels(loadedGradeLevels);
        setGradeLevelsError("");
      } catch (error) {
        if (!isMounted) return;

        setGradeLevels([]);
        setGradeLevelsError(getErrorMessage(error));
      } finally {
        if (isMounted) {
          setGradeLevelsLoading(false);
        }
      }
    }

    loadGradeLevels();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadLessonSectionsForGrade() {
      if (!selectedGradeLevelId || !subjectId) {
        return;
      }

      try {
        const userId = await getCurrentLessonCatalogUserId(supabase);

        if (!isMounted) return;

        const catalog = await getPrivateLessonCatalogForGrade({
          supabase,
          userId,
          subjectId,
          gradeLevelId: selectedGradeLevelId,
        });

        if (!isMounted) return;

        if (!catalog) {
          setSelectedLessonCatalogId("");
          setLessonSections([]);
          setSectionsError(
            "Brak prywatnego katalogu lekcji dla wybranej klasy. Najpierw zaimportuj plan lekcji CSV w Bibliotece."
          );
          return;
        }

        setSelectedLessonCatalogId(catalog.id);

        const loadedSections = await listLessonSections({
          supabase,
          catalogId: catalog.id,
        });

        if (!isMounted) return;

        setLessonSections(loadedSections);
        setSectionsError("");
      } catch (error) {
        if (!isMounted) return;

        setSelectedLessonCatalogId("");
        setLessonSections([]);
        setSectionsError(getErrorMessage(error));
      } finally {
        if (isMounted) {
          setSectionsLoading(false);
        }
      }
    }

    loadLessonSectionsForGrade();

    return () => {
      isMounted = false;
    };
  }, [selectedGradeLevelId, subjectId]);

  useEffect(() => {
    let isMounted = true;

    async function loadLessonTopicsForSection() {
      if (!selectedLessonCatalogId || !selectedLessonSectionId) {
        return;
      }

      try {
        const loadedTopics = await listLessonTopics({
          supabase,
          catalogId: selectedLessonCatalogId,
          sectionId: selectedLessonSectionId,
        });

        if (!isMounted) return;

        setLessonTopics(loadedTopics);
        setTopicsError("");
      } catch (error) {
        if (!isMounted) return;

        setLessonTopics([]);
        setTopicsError(getErrorMessage(error));
      } finally {
        if (isMounted) {
          setTopicsLoading(false);
        }
      }
    }

    loadLessonTopicsForSection();

    return () => {
      isMounted = false;
    };
  }, [selectedLessonCatalogId, selectedLessonSectionId]);

  return {
    gradeLevels,
    gradeLevelsLoading,
    gradeLevelsError,
    selectedGradeLevelId,

    lessonSections,
    sectionsLoading,
    sectionsError,
    selectedLessonSectionId,

    lessonTopics,
    topicsLoading,
    topicsError,
    selectedLessonTopicId,

    handleGradeLevelChange,
    handleLessonSectionChange,
    handleLessonTopicChange,
  };
}
