const STRINGS = {
  vi: {
    aboutPlace: 'Về địa điểm này',
    whatToTry: 'Món nên thử',
    foodCulture: 'Văn hóa ẩm thực',
    historyTitle: 'Nét riêng',
    touristTips: 'Mẹo cho du khách',
  },
  en: {
    aboutPlace: 'About this place',
    whatToTry: 'What to try',
    foodCulture: 'Food culture',
    historyTitle: 'What makes it special',
    touristTips: 'Visitor tips',
  },
  zh: {
    aboutPlace: '关于此地',
    whatToTry: '推荐美食',
    foodCulture: '美食文化',
    historyTitle: '独到之处',
    touristTips: '游客提示',
  },
  ko: {
    aboutPlace: '이곳 소개',
    whatToTry: '추천 메뉴',
    foodCulture: '음식 문화',
    historyTitle: '특별한 점',
    touristTips: '여행 팁',
  },
  ja: {
    aboutPlace: 'この場所について',
    whatToTry: 'おすすめメニュー',
    foodCulture: '食文化',
    historyTitle: 'その特色',
    touristTips: '旅のヒント',
  },
};

export function t(key, locale = 'vi') {
  const map = STRINGS[String(locale || 'vi').split('-')[0]] || STRINGS.vi;
  return map[key] ?? key;
}

export const UI_LANG_CODES = ['vi', 'en', 'zh', 'ko', 'ja'];
export { STRINGS };
