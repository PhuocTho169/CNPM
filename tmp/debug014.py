c = open('database/seeds/014_english_japanese_dish_translations_v2.sql', encoding='utf-8').read()

as_e = c.find('AS e(code, name, description, ingredients)')
as_j = c.find('AS j(code, name, description, ingredients)')

print('as_e:', as_e, 'as_j:', as_j)

# e VALUES block: find the first LEFT JOIN (VALUES
e_vals_start = c.find('LEFT JOIN (VALUES', as_e - 100)
print('e_vals_start:', e_vals_start)
print('--- e_block raw ---')
print(repr(c[e_vals_start:as_e][:200]))
print('--- e_block raw end ---')
print(repr(c[e_vals_start:as_e][-200:]))
