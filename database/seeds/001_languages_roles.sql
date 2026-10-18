-- 001: Languages (4), roles, permissions, role bindings
INSERT INTO languages (code, name, native_name, is_active) VALUES
  ('vi', 'Vietnamese', 'Tiếng Việt', true),
  ('zh', 'Chinese',   '中文',      true),
  ('ko', 'Korean',    '한국어',    true),
  ('ja', 'Japanese',  '日本語',    true)
ON CONFLICT (code) DO NOTHING;

INSERT INTO permissions (code, description) VALUES
  ('place_read',        'View culinary places'),
  ('place_create',      'Create culinary places'),
  ('place_update',      'Edit culinary places'),
  ('place_delete',      'Delete culinary places'),
  ('place_publish',     'Publish / archive culinary places'),
  ('category_manage',   'Manage categories'),
  ('dish_manage',       'Manage dishes'),
  ('translation_manage','Manage translations'),
  ('audio_manage',      'Manage audio guides'),
  ('qr_manage',         'Manage QR codes'),
  ('route_manage',      'Manage culinary routes'),
  ('language_manage',   'Manage languages'),
  ('image_manage',      'Manage images'),
  ('analytics_view',    'View analytics'),
  ('user_manage',       'Manage users'),
  ('role_manage',       'Manage roles & permissions'),
  ('settings_manage',   'Manage system settings')
ON CONFLICT (code) DO NOTHING;

INSERT INTO roles (code, name, description) VALUES
  ('ADMIN', 'Administrator', 'Full permissions'),
  ('STAFF', 'Staff',         'Manage places, dishes, translations, images, audio, QR')
ON CONFLICT (code) DO NOTHING;

-- ADMIN: all permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p WHERE r.code = 'ADMIN'
ON CONFLICT DO NOTHING;

-- STAFF: everything except user/role/settings management
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.code = 'STAFF'
  AND p.code NOT IN ('user_manage', 'role_manage', 'settings_manage')
ON CONFLICT DO NOTHING;
