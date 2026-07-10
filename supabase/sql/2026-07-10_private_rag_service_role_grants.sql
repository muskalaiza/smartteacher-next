-- SmartTeacher Next
-- Uprawnienia serwerowego Private RAG
-- Data: 2026-07-10
--
-- Endpoint Private RAG używa Supabase Secret Key / service_role.
-- Rola service_role omija RLS, ale nadal wymaga uprawnień
-- tabelowych przez Data API.

grant usage
on schema public
to service_role;

-- ingestTeacherDocumentBlocks:
-- - pobiera metadane dokumentu,
-- - aktualizuje status i error_message.

grant select, update
on table public.teacher_documents
to service_role;

-- ingestTeacherDocumentBlocks:
-- - sprawdza istniejące bloki,
-- - zapisuje nowe bloki source-only.

grant select, insert
on table public.document_blocks
to service_role;
