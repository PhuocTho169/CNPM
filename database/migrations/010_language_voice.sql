-- 010: per-language voice metadata (bcl, voice_note)
--
-- WHY
-- The admin language form (apps/web/src/admin/AdminLanguages.jsx) and the
-- language service (server/src/services/catalogService.js) already read and
-- write `bcl` and `voice_note`, but no migration ever created them — so saving
-- or editing a language failed with `column "bcl" of relation "languages"
-- does not exist`.
--
-- WHAT
--   bcl         BCP-47 locale every TTS path derives from (Google Translate
--               `tl`, Google Cloud `languageCode`, browser speechSynthesis).
--   voice_note  Optional per-provider voice override, parsed by the TTS layer:
--               "Edge: fr-FR-HenriNeural", "Google: fr-FR-Neural2-A",
--               "ElevenLabs: <voice-id>".
--
-- A language an admin registers from the dashboard therefore narrates without
-- any code change: locale comes from `bcl` (or the code itself), and a missing
-- provider voice falls back to the keyless Google Translate voice.

ALTER TABLE languages ADD COLUMN IF NOT EXISTS bcl VARCHAR(20);
ALTER TABLE languages ADD COLUMN IF NOT EXISTS voice_note VARCHAR(200);

-- Seed the locales of the languages the project ships with, so an existing
-- database (where these columns were just created as NULL) immediately has a
-- correct locale. Anything else keeps NULL and falls back to its `code`.
UPDATE languages
   SET bcl = CASE code
                WHEN 'vi' THEN 'vi-VN'
                WHEN 'en' THEN 'en-US'
                WHEN 'zh' THEN 'zh-CN'
                WHEN 'ko' THEN 'ko-KR'
                WHEN 'ja' THEN 'ja-JP'
              END
 WHERE bcl IS NULL
   AND code IN ('vi', 'en', 'zh', 'ko', 'ja');
