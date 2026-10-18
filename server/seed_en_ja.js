const { Client } = require('pg')
const c = new Client({ host: '127.0.0.1', port: 5432, user: 'district4_user', database: 'district4_food', password: 'district4_user' })
const EN_NAME = [
  'Crab udon-style noodle soup',
  'Fermented anchovy noodle soup',
  'Broken rice with grilled pork chop, shredded pork skin and pork meatloaf',
  'Salt-and-chili grilled snail',
  'Sand snail',
  'Lemongrass-steamed clams',
  'Shrimp and pork sizzling pancake',
  'Crab noodle soup',
  'My Tho noodle soup',
  'Mixed sweet dessert soup',
  'Vietnamese iced coffee with pin filter',
  'Seafood hotpot at Vĩnh Khánh',
]
const JA_NAME = [
  '蟹肉粗米糕',
  '発酵鯰魚魚露米粉',
  '炭烤豬排碎米飯配脆肉皮與肉鬆',
  '鹽椒烤福壽螺',
  '斑玉螺',
  '香茅蒸鮮蛤',
  '蝦肉煎餅',
  '蟹肉番茄麵線',
  '美陀粿條',
  '什錦糖水',
  '傳統滴漏冰咖啡',
  '永慶海鮮火鍋',
]
;(async () => {
  await c.connect()
  await c.query(`SELECT set_config('search_path', 'public,"$user"', false)`)
  const dishes = await c.query('SELECT id,code FROM dishes ORDER BY id')
  const rows = []
  for (let i = 0; i < dishes.rows.length; i++) {
    const id = dishes.rows[i].id
    rows.push([id, 1, EN_NAME[i]])
    rows.push([id, 5, JA_NAME[i]])
  }
  const paramRefs = []
  const params = []
  let n = 1
  for (const r of rows) {
    paramRefs.push(`($${n},$${n+1},$${n+2})`)
    params.push(r[0], r[1], r[2])
    n += 3
  }
  const sql = `INSERT INTO dish_translations (dish_id, language_id, name, description, ingredients, cultural_information)
    SELECT (v.dish_id)::int, (v.lang_id)::int, v.name, NULL, NULL, NULL
    FROM (VALUES ${paramRefs.join(',')}) AS v(dish_id, lang_id, name)
    LEFT JOIN dish_translations dt ON dt.dish_id=(v.dish_id)::int AND dt.language_id=(v.lang_id)::int
    WHERE dt.id IS NULL
    ON CONFLICT (dish_id, language_id) DO NOTHING`
  await c.query(sql, params)
  const cnt = await c.query("SELECT l.code, count(dt.id)::int AS cnt FROM languages l LEFT JOIN dish_translations dt ON dt.language_id=l.id WHERE l.is_active=true GROUP BY l.id,l.code ORDER BY l.id")
  console.log('cntAfter', JSON.stringify(cnt.rows))
  const sample = await c.query("SELECT dt.dish_id, l.code AS lang, dt.name FROM dish_translations dt JOIN languages l ON l.id=dt.language_id WHERE l.code IN ('en','ja') ORDER BY dt.dish_id, l.code LIMIT 6")
  console.log('sample', JSON.stringify(sample.rows))
  await c.end()
})().catch(e => { console.error(e); process.exit(1) })
