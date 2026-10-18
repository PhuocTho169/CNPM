-- 009: English guide language
--
-- The GPS audio guide offers Vietnamese, English, Korean, Japanese and Chinese.
-- English was the missing one.
--
-- IMPORTANT ORDERING TRAP
-- The docker dev command runs `migrate.js && seed.js`, i.e. migrations run
-- BEFORE the seed that inserts culinary_places. Any data-dependent migration
-- therefore finds an empty table and silently inserts 0 rows while still being
-- marked applied. Only the schema-free part belongs here: the language row.
--
-- The English translations themselves depend on the seeded places and live in
-- database/seeds/011_english_translations.sql, which runs after the places
-- exist. Keep them ON CONFLICT DO NOTHING so re-running the seed is safe.
INSERT INTO languages (code, name, native_name)
VALUES ('en', 'English', 'English')
ON CONFLICT (code) DO NOTHING;
