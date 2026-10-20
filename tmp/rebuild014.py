c = open('database/seeds/014_english_japanese_dish_translations_v2.sql', encoding='utf-8').read()

as_e = c.find('AS e(code, name, description, ingredients)')
as_j = c.find('AS j(code, name, description, ingredients)')

# e VALUES block: from first 'LEFT JOIN (VALUES' to as_e
e_vals_start = c.find('LEFT JOIN (VALUES', as_e - 100)
e_vals_start = c.find('LEFT JOIN (VALUES', e_vals_start - 100)
e_vals_end = as_e  # AS e marker

# j VALUES block: from after as_e, find next LEFT JOIN VALUES to as_j
j_vals_start = c.find('LEFT JOIN (VALUES', as_e)
j_vals_end = as_j  # AS j marker

e_block = c[e_vals_start:as_e]
j_block = c[j_vals_start:as_j]

import re


def extract_rows(block):
    """Extract the row data strings from a VALUES block."""
    inner = block
    marker = 'LEFT JOIN (VALUES'
    idx = inner.find(marker)
    if idx != -1:
        inner = inner[idx + len(marker):]
    inner = inner.rstrip()
    as_pos = inner.find(') AS ')
    if as_pos != -1:
        inner = inner[:as_pos]
    parts = re.split(r'\),\s*\n', inner)
    rows = []
    for p in parts:
        p = p.strip()
        if p.startswith('('):
            p = p[1:]
        if p.endswith(')'):
            p = p[:-1]
        p = p.strip()
        if p:
            rows.append(p)
    return rows


e_rows = extract_rows(e_block)
j_rows = extract_rows(j_block)
print('e_rows:', len(e_rows), 'j_rows:', len(j_rows))

combined_rows = []
for e, j in zip(e_rows, j_rows):
    e_fields = [x.strip() for x in e.split(',', 3)]
    j_fields = [x.strip() for x in j.split(',', 3)]
    combined = ','.join([e_fields[0], e_fields[1], e_fields[2], e_fields[3], j_fields[1], j_fields[2], j_fields[3]])
    combined_rows.append(combined)

print('combined_rows:', len(combined_rows))

new_file = c[:e_vals_start]
new_file += "  LEFT JOIN (VALUES\n"
for i, row in enumerate(combined_rows):
    new_file += "    ({})\n".format(row)
    if i < len(combined_rows) - 1:
        new_file += "    ,"
new_file += "  ) AS lj(code, en_name, en_description, en_ingredients, ja_name, ja_description, ja_ingredients)\n"
new_file += "  ON d.code = lj.code\n"
new_file += "  ON CONFLICT (dish_id, language_id) DO UPDATE SET\n"
new_file += "    name = EXCLUDED.name,\n"
new_file += "    description = EXCLUDED.description,\n"
new_file += "    ingredients = EXCLUDED.ingredients\n"
new_file += "  WHERE EXCLUDED.name IS NOT NULL OR EXCLUDED.description IS NOT NULL;\n"

rest_start = as_j + len('AS j(code, name, description, ingredients)')
new_file += c[rest_start:]

with open('/tmp/014_new.sql', 'w', encoding='utf-8') as f:
    f.write(new_file)

print('Wrote /tmp/014_new.sql, len', len(new_file))
