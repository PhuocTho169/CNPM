-- 001: Languages (5) — RBAC is now a role column on users; no roles/permissions tables
INSERT INTO languages (code, name, native_name, is_active, bcl, voice_note) VALUES
  ('vi', 'Vietnamese', 'Tiếng Việt', true, 'vi-VN', NULL),
  ('en', 'English',    'English',     true, 'en-US', NULL),
  ('zh', 'Chinese',    '简体中文',     true, 'zh-CN', NULL),
  ('ko', 'Korean',     '한국어',       true, 'ko-KR', NULL),
  ('ja', 'Japanese',   '日本語',       true, 'ja-JP', NULL)
ON CONFLICT (code) DO NOTHING;
