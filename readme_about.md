# About / Nổi bật expansion (done)

- Web (PlaceGuide): now renders About → History → Food culture → Visitor tips in that order, using `currentTranslation.history`, `cultural_significance`, `tourist_tips` when present. Reuses same `t()` and same UI labels as existing History/Food culture/Visitor tips sections.
- Mobile (PlaceDetailScreen): now renders same 4 sections (About / History / Food culture / Visitor tips) with translated headings via `t()` + `currentLocale` derived from current picker language. Content pulled from `current.history`, `current.cultural_significance`, `current.tourist_tips`.
- New file: `apps/mobile/src/utils/i18n.js` small key map for these 5 shared labels so mobile can render headings in the right language without duplicating web strings.
- Web admin: added inline hint above Save row when dish description is short (< 40 chars).
- Mobile: expanded dish card to show `description` (6 lines) + `ingredients` line.
