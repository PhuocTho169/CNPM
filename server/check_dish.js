const { Pool } = require('pg')
const pool = new Pool({ host: '127.0.0.1', port: 5432, user: 'district4_user', database: 'district4_food', password: 'district4_user' })
const start = Date.now()
;(async () => {
  const client = await pool.connect()
  try {
    console.log('sp on connect:', (await client.query('SELECT pg_catalog.current_setting(\'search_path\') AS sp')).rows[0].sp)
    await client.query(`SELECT set_config('search_path', 'public,"$user"', false)`)
    console.log('sp after set_config:', (await client.query('SELECT pg_catalog.current_setting(\'search_path\') AS sp')).rows[0].sp)
    const getDishSQL = `SELECT d.*, c.code AS category_code, c.name AS category_name,
            dt.name, dt.description, dt.ingredients, dt.cultural_information
     FROM dishes d
     LEFT JOIN categories c ON c.id = d.category_id
     LEFT JOIN dish_translations dt ON dt.dish_id = d.id
       AND dt.language_id = (SELECT id FROM languages WHERE code = $2)
     WHERE d.id = $1`
    const row = await client.query(getDishSQL, [1, 'en'])
    console.log('getDish row keys:', Object.keys(row.rows[0] || {}))
    console.log('getDish row:', JSON.stringify(row.rows[0]))
    const listSQL = `SELECT d.id, d.code, d.culinary_place_id, d.price, d.image_url, d.is_signature, d.status,
            c.code AS category_code, c.name AS category_name,
            p.code AS place_code, dt.name, dt.description, dt.ingredients,
            (SELECT array_agg(l2.code ORDER BY l2.code) FROM dish_translations dt2
              JOIN languages l2 ON l2.id = dt2.language_id WHERE dt2.dish_id = d.id) AS language_codes
     FROM dishes d
     LEFT JOIN categories c ON c.id = d.category_id
     LEFT JOIN culinary_places p ON p.id = d.culinary_place_id
     LEFT JOIN dish_translations dt ON dt.dish_id = d.id
       AND dt.language_id = (SELECT id FROM languages WHERE code = $1)
     ORDER BY d.culinary_place_id, d.is_signature DESC, d.id
     LIMIT $2 OFFSET $3`
    const listRows = await client.query(listSQL, ['en', 2, 0])
    console.log('list rows count:', listRows.rows.length)
    console.log('first list row name:', listRows.rows[0] ? listRows.rows[0].name : 'none')
  } finally {
    client.release()
  }
  console.log('duration ms:', Date.now() - start)
  await pool.end()
})().catch(e => { console.error(e.message); process.exit(1) })
