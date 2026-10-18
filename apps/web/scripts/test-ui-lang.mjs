// Tests for the multilingual UI shell.
// Run: node apps/web/scripts/test-ui-lang.mjs
//
// The interface used to ship only vi/zh/ko/ja: picking English fell back to
// Vietnamese for every label, and section blurbs were inline
// `lang === '…'` chains with no `en` branch at all. These tests pin the two
// things that broke: every key present in all 5 languages, and no Vietnamese
// left in the English strings.
import assert from 'node:assert/strict';
import { UI_STRINGS, UI_LANG_CODES } from '../src/utils/uiStrings.js';
import { LANG_FLAG } from '../src/utils/langs.js';

let passed = 0;
let failed = 0;
function test(name, fn) {
  try {
    fn();
    console.log(`  ok   ${name}`);
    passed++;
  } catch (err) {
    console.log(`  FAIL ${name}\n       ${err.message}`);
    failed++;
  }
}

// Vietnamese-only letters and tone marks. Chinese/Korean/Japanese text shares
// none of these, so a hit inside an `en` string is a real leak.
const VIETNAMESE_ONLY = /[ăâđêôơưĂÂĐÊÔƠƯạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹÀÁẢÃẠẰẮẲẴẶẦẤẨẪẬÈÉẺẼẸỀẾỂỄỆÌÍỈĨỊÒÓỎÕỌỒỐỔỖỘỜỚỞỠỢÙÚỦŨỤỪỨỬỮỰỲÝỶỸĐ]/;

console.log('\nLanguage coverage');

test('the five content languages all have UI strings', () => {
  for (const code of UI_LANG_CODES) {
    assert.ok(UI_STRINGS[code], `no UI strings for ${code}`);
  }
  assert.deepEqual(UI_LANG_CODES, ['vi', 'en', 'zh', 'ko', 'ja']);
});

test('English is a real entry, not a Vietnamese copy', () => {
  assert.ok(UI_STRINGS.en, 'English UI strings missing');
  assert.notEqual(UI_STRINGS.en.heroTitle, UI_STRINGS.vi.heroTitle);
});

console.log('\nKey parity');

test('every language defines exactly the same keys as Vietnamese', () => {
  const viKeys = Object.keys(UI_STRINGS.vi).sort();
  for (const code of UI_LANG_CODES) {
    const keys = Object.keys(UI_STRINGS[code]).sort();
    const missing = viKeys.filter((k) => !keys.includes(k));
    const extra = keys.filter((k) => !viKeys.includes(k));
    assert.equal(missing.length, 0, `${code} is missing: ${missing.join(', ')}`);
    assert.equal(extra.length, 0, `${code} has unknown keys: ${extra.join(', ')}`);
  }
});

test('no string is empty in any language', () => {
  for (const code of UI_LANG_CODES) {
    for (const [key, value] of Object.entries(UI_STRINGS[code])) {
      assert.ok(value.trim().length > 0, `${code}.${key} is empty`);
    }
  }
});

test('only the language that owns a placeholder declares it', () => {
  // audioPendingNote interpolates the locale (e.g. en-US). Every language must
  // carry the {locale} token or the note leaks a raw placeholder to the user.
  for (const code of UI_LANG_CODES) {
    assert.match(UI_STRINGS[code].audioPendingNote, /\{locale\}/, `${code}.audioPendingNote`);
  }
});

console.log('\nEnglish strings are actually English');

test('no Vietnamese text leaks into the English interface', () => {
  for (const [key, value] of Object.entries(UI_STRINGS.en)) {
    assert.doesNotMatch(
      value, VIETNAMESE_ONLY,
      `en.${key} contains Vietnamese text: ${value}`
    );
  }
});

test('English is not a copy of any other language', () => {
  for (const code of ['vi', 'zh', 'ko', 'ja']) {
    const shared = Object.keys(UI_STRINGS.en).filter((k) => UI_STRINGS.en[k] === UI_STRINGS[code][k]);
    // A few labels are legitimately identical across scripts (e.g. "QR"),
    // but whole blocks copied from another language would be far more than that.
    assert.ok(shared.length < 10, `en shares ${shared.length} strings with ${code}: ${shared.join(', ')}`);
  }
});

console.log('\nFlags');

test('every supported language has a flag for the language cards', () => {
  for (const code of UI_LANG_CODES) {
    assert.ok(LANG_FLAG[code], `no flag for ${code}`);
  }
});

console.log(`\n${passed} passed, ${failed} failed.`);
process.exit(failed === 0 ? 0 : 1);
