-- English + Japanese dish translations for all 12 dishes.
-- dish_id is resolved via dish.code; id NOT IN subquery avoids re-inserts.
-- Deploys to dish_translations for en (lang_id=1) and ja (lang_id=5).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM schema_migrations WHERE name = '013_english_japanese_dish_translations.sql') THEN
    RETURN;
  END IF;

  INSERT INTO dish_translations (dish_id, language_id, name, description, ingredients, cultural_information)
  SELECT d.id,
         l.id,
         COALESCE(NULLIF(v.name, ''), k.name),
         COALESCE(NULLIF(v.desc, ''), k.description),
         COALESCE(NULLIF(v.ing, ''), k.ingredients),
         NULL
  FROM dishes d
  JOIN languages l ON l.code IN ('en', 'ja')
         AND l.id NOT IN (SELECT dt.language_id FROM dish_translations dt WHERE dt.dish_id = d.id)
  JOIN dish_translations k ON k.dish_id = d.id AND k.language_id = (SELECT id FROM languages WHERE code = 'ko')
  LEFT JOIN LATERAL (
    SELECT t.name, t.desc, t.ing
    FROM (VALUES
      (d.code, 'en', 'Crab udon-style noodle soup', 'Thick rice noodles in a rich crab-and-pork-bone broth, served with crab paste and shrimp.', 'Fresh swimming crab, rice flour, tapioca starch, shrimp, cinnamon fish cake'),
      (d.code, 'ja', '蟹肉粗米糕', '厚实米粉浸泡在蟹肉與豬骨熬製的濃醬湯裡，配蟹肉餅與新鮮蝦仁。', '活泳蟹、米粉、太白粉、蝦仁、肉桂魚餅'),
      (d.code, 'en', 'Fermented anchovy noodle soup', 'Noodle soup in a bold fermented anchovy broth, with shrimp, squid and river fish.', 'Fermented anchovy sauce, shrimp, squid, river fish, rice noodles, fresh herbs'),
      (d.code, 'ja', '發酵鯰魚魚露米粉', '濃郁發酵魚露湯底的米粉，配蝦、魷魚與河魚。', '發酵魚露、蝦、魷魚、河魚、米粉、野菜'),
      (d.code, 'en', 'Broken rice with grilled pork chop, shredded pork skin and pork meatloaf', 'Fragrant broken rice topped with smoky charcoal-grilled pork chop, crispy pork skin, steamed pork loaf and sweet-sour fish sauce.', 'Broken rice, pork chop, fried pork skin, steamed pork loaf, fish sauce'),
      (d.code, 'ja', '炭烤豬排碎米飯配脆肉皮與肉鬆', '香氣四溢的碎米飯， topped 與煙燻炭烤豬排、酥脆豬皮、蒸肉loaf 與酸甜魚露。', '碎米飯、豬排、油炸豬皮、蒸豬肉鬆、魚露'),
      (d.code, 'en', 'Salt-and-chili grilled snail', 'Charcoal-grilled apple snail with salt and chili, tender meat and a classic Vĩnh Khánh night street snack.', 'Apple snail, salt, chili, kaffir lime leaf'),
      (d.code, 'ja', '鹽椒烤福壽螺', '鹽與辣椒炭烤福壽螺，入口軟糯，是永慶夜市街味飯的經典小吃。', '福壽螺、鹽、辣椒、柚葉'),
      (d.code, 'en', 'Sand snail', 'Grilled over charcoal or stir-fried with butter and garlic, naturally sweet and chewy, the best-selling item at the stall.', 'Fresh sand snail, butter, garlic, chili, scallion'),
      (d.code, 'ja', '斑玉螺', '炭烤或蒜香黃油煎炒，螺肉甘甜軟糯，是該攤位點單率最高的菜.', '新鮮斑玉螺、黃油、大蒜、辣椒、蔥'),
      (d.code, 'en', 'Lemongrass-steamed clams', 'Fresh clams steamed with lemongrass and chili, light sweet broth, dipped in lime-salt-chili sauce.', 'Fresh clams, lemongrass, chili, Vietnamese herbs'),
      (d.code, 'ja', '香茅蒸鮮蛤', '香茅與辣椒一起蒸新鮮蛤蜊，清甜的湯配檸檬椒鹽醃食。', '新鮮蛤蜊、香茅、辣椒、越南香菜'),
      (d.code, 'en', 'Shrimp and pork sizzling pancake', 'Golden crispy Vietnamese pancake filled with shrimp, pork and bean sprouts, wrapped in fresh herbs and dipped in sweet fish sauce.', 'Rice flour, turmeric, shrimp, pork, bean sprouts, fresh herbs'),
      (d.code, 'ja', '蝦肉煎餅', '金黃金黃酥脆的越南煎餅，內餡蝦、豬肉與豆芽，用生菜葉包起蘸酸甜魚露食用。', '米糊、薑黃、蝦、豬肉、豆芽、生菜'),
      (d.code, 'en', 'Crab noodle soup', 'Tomato crab noodle soup with crab roe, fresh noodles, tofu, fresh herbs and sour shrimp paste.', 'Freshwater crab, tomato, tofu, fresh rice noodles, sour shrimp paste'),
      (d.code, 'ja', '蟹肉番茄麵線', '番茄骰醬油的蟹肉麵線，配豆腐、新鮮麵線、野菜與醃蝦醬。', '田蟹、番茄、豆腐、新鮮米粉、醃蝦醬'),
      (d.code, 'en', 'My Tho noodle soup', 'Slightly pink, chewy rice noodles with fresh shrimp, pork and liver in a clear sweet broth.', 'Rice flour, shrimp, pork, pork liver, water spinach'),
      (d.code, 'ja', '美陀粿條', '微粉色、彈牙的米糊，配新鮮蝦、豬肉、豬肝與清甜湯頭。', '米粉、蝦、豬肉、豬肝、空心菜'),
      (d.code, 'en', 'Mixed sweet dessert soup', 'A bowl combining mung bean, taro, sago and coconut milk for a mix of textures.', 'Mung bean, taro, sago, coconut milk, sugar'),
      (d.code, 'ja', '什錦糖水', '綠豆、芋頭、西米與椰漿一碗齊上，口感層次豐富。', '綠豆、芋頭、西米、椰漿、糖'),
      (d.code, 'en', 'Vietnamese iced coffee with pin filter', 'Strong coffee dripped through a traditional phin over condensed milk and ice.', 'Robusta coffee beans, sweetened condensed milk, ice'),
      (d.code, 'ja', '傳統滴漏冰咖啡', '用傳統filter 慢滴濃咖啡，倒入蒸發奶與冰塊中。', '羅布斯塔咖啡豆、蒸發奶、冰塊'),
      (d.code, 'en', 'Seafood hotpot at Vĩnh Khánh', 'A shared seafood hotpot with shrimp, squid and clams in a mildly spicy broth, with vegetables and noodles.', 'Shrimp, squid, clams, hotpot broth, vegetables'),
      (d.code, 'ja', '永慶海鮮火鍋', '適合一群人共享的海鮮火鍋：蝦、魷魚、蛤蜊，微辣湯底配青菜與米粉。', '蝦、魷魚、蛤蜊、火鍋湯底、蔬菜')
    ) AS t(code, lang, name, desc, ing)
    WHERE t.code = d.code AND t.lang = l.code
    LIMIT 1
  ) v ON true
  WHERE v.code IS NOT NULL
  ORDER BY d.id, l.id
  ON CONFLICT (dish_id, language_id) DO NOTHING;

  INSERT INTO schema_migrations (name) VALUES ('013_english_japanese_dish_translations.sql');
END
$$;

