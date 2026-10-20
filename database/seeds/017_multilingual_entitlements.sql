-- 17: language packages
--
-- Ships the two packages the product models:
--   - 'one-language'  : the guest's free language + exactly one additional
--                       language, priced and configured here.
--   - 'all-languages' : one explicit row per active language, surfaced by the
--                       `unlocks_all_languages = true` flag.
--
-- Every language in the DB gets one row in each package. Because a package
-- either carries explicit mappings or the blanket `unlocks_all_languages = true`
-- flag (the constraint is enforced on the table), the two DO blocks are
-- deliberately separate: the blanket block cannot assign explicit mappings and
-- the mapping block cannot set the blanket flag.

-- One-lifetime validity window is a business decision, not a schema default, so
-- the seed sets it here and every admin-configured package is re-planted from
-- the same payload on each deploy.

-- Flag-blocked package: one explicit mapping row per active language.
DO $$ BEGIN
  INSERT INTO access_packages (code, name, description, price_amount, currency, unlocks_all_languages, is_active, validity_start, validity_end)
  VALUES ('all-languages', 'All languages', 'Free language plus every other supported narration language, valid for the guest session', 99.00, 'VND', true, true, now() - interval '7 days', now() + interval '90 days')
  ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    price_amount = EXCLUDED.price_amount,
    currency = EXCLUDED.currency,
    unlocks_all_languages = EXCLUDED.unlocks_all_languages,
    is_active = EXCLUDED.is_active,
    validity_start = EXCLUDED.validity_start,
    validity_end = EXCLUDED.validity_end,
    updated_at = now();

  INSERT INTO language_package_languages (package_id, language_id)
  SELECT ap.id, l.id
  FROM access_packages ap
  CROSS JOIN languages l
  WHERE ap.code = 'all-languages'
    AND l.is_active
  ON CONFLICT (package_id, language_id) DO NOTHING;
EXCEPTION WHEN unique_violation THEN
  -- Package rows may already exist from a previous run; leave them untouched.
  NULL;
END $$;

-- Explicit mapping package: exactly one additional language.
-- The admin decides which language (and how many) by editing the rows below;
-- nothing here hard-codes a language.
DO $$ BEGIN
  INSERT INTO access_packages (code, name, description, price_amount, currency, unlocks_all_languages, is_active, validity_start, validity_end)
  VALUES ('one-language', 'One additional language', 'Free language plus exactly one additional supported narration language, valid for the guest session', 30.00, 'VND', false, true, now() - interval '7 days', now() + interval '90 days')
  ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    price_amount = EXCLUDED.price_amount,
    currency = EXCLUDED.currency,
    unlocks_all_languages = EXCLUDED.unlocks_all_languages,
    is_active = EXCLUDED.is_active,
    validity_start = EXCLUDED.validity_start,
    validity_end = EXCLUDED.validity_end,
    updated_at = now();

  INSERT INTO language_package_languages (package_id, language_id)
  SELECT ap.id, l.id
  FROM access_packages ap
  CROSS JOIN languages l
  WHERE ap.code = 'one-language'
    AND l.is_active
    AND l.id NOT IN (SELECT l2.id FROM languages l2 JOIN language_package_languages lpl ON lpl.language_id = l2.id WHERE lpl.package_id = ap.id)
  ON CONFLICT (package_id, language_id) DO NOTHING;
EXCEPTION WHEN unique_violation THEN
  NULL;
END $$;
