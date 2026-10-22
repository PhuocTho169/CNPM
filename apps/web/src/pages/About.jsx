import { useApp } from '../context/AppContext';
import { Link } from 'react-router-dom';

// Line icons — the design-system checklist flags emoji-as-icons as an
// anti-pattern; decorative icons here are aria-hidden and never shown
// without a text label next to them.
const ICON_STROKE = {
  stroke: 'var(--primary-dark)',
  fill: 'none',
  strokeWidth: 1.6,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
};

function QrIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" {...ICON_STROKE}>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <path d="M14 14h3v3h-3zM18.5 18.5H21V21h-2.5zM21 14v1.5M14 19.5V21" />
    </svg>
  );
}
function HeadphoneIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" {...ICON_STROKE}>
      <path d="M4 13a8 8 0 0 1 16 0" />
      <rect x="3" y="13" width="4.5" height="7" rx="2" />
      <rect x="16.5" y="13" width="4.5" height="7" rx="2" />
    </svg>
  );
}
function RouteIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" {...ICON_STROKE}>
      <circle cx="6" cy="5" r="2.4" />
      <circle cx="18" cy="19" r="2.4" />
      <path d="M8.4 5.6c5 1.2 3.5 6-1 7s-3.8 5 1.5 5.6c1.6.2 3.4.2 5-.1" strokeDasharray="2.6 2.2" />
    </svg>
  );
}
function CompassIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" {...ICON_STROKE}>
      <circle cx="12" cy="12" r="9" />
      <path d="M15.5 8.5l-2 5-5 2 2-5z" />
      <path d="M15.5 8.5l-2 5-5 2 2-5z" />
    </svg>
  );
}

const FEATURE_ICONS = [QrIcon, HeadphoneIcon, RouteIcon, CompassIcon];

export default function About() {
  const { lang, t } = useApp();

  const content = {
    vi: {
      title: 'Về hệ thống hướng dẫn ẩm thực Quận 4',
      p1: 'Hệ thống Du lịch Ẩm thực Quận 4 là người bạn đồng hành giúp du khách khám phá văn hoá ẩm thực đường phố của Quận 4, TP.HCM — nơi được xem là "thiên đường ốc" và phố ăn đêm sầm uất của thành phố.',
      p2: 'Quét mã QR tại mỗi địa điểm ẩm thực để mở trang hướng dẫn, chọn ngôn ngữ (Tiếng Việt, English, 中文, 한국어, 日本語), đọc thông tin và nghe thuyết minh âm thanh do đội ngũ quản trị biên soạn.',
      features: [
        ['📱 Hướng dẫn qua QR', 'Mã QR tại địa điểm mở thẳng trang hướng dẫn trên điện thoại — không cần cài ứng dụng.'],
        ['🎧 Thuyết minh đa ngôn ngữ', 'Nội dung chi tiết và âm thanh giới thiệu bằng 5 ngôn ngữ, phù hợp du khách quốc tế.'],
        ['🗺️ Lộ trình ẩm thực', 'Gợi ý lộ trình theo chủ đề: tối, sáng, hải sản — với các điểm dừng nối nhau.'],
        ['🧭 Khám phá bản địa', 'Tìm kiếm quán theo món ăn, danh mục, giá và giờ mở cửa.'],
      ],
      steps: ['Quét mã QR tại quán', 'Chọn ngôn ngữ của bạn', 'Đọc & nghe thuyết minh'],
      stepsTitle: 'Hoạt động thế nào?',
      ctaText: 'Quét mã, chọn ngôn ngữ và tận hưởng ẩm thực đường phố Quận 4.',
    },
    en: {
      title: 'About the District 4 food guide',
      p1: 'The District 4 Culinary Tourism system is your companion to the street-food culture of District 4, Ho Chi Minh City — the city\'s "snail paradise" and its bustling late-night food streets.',
      p2: 'Scan the QR code at any food destination to open its guide, pick a language (Tiếng Việt, English, 中文, 한국어, 日本語), read the details and listen to the narration prepared by our editors.',
      features: [
        ['📱 QR guides', 'The QR code on site opens the guide page straight on your phone — no app to install.'],
        ['🎧 Multilingual narration', 'Detailed content and audio introductions in 5 languages, made for international visitors.'],
        ['🗺️ Food routes', 'Suggested routes by theme: night, morning, seafood — with the stops linked together.'],
        ['🧭 Local discovery', 'Search places by dish, category, price and opening hours.'],
      ],
      steps: ['Scan the QR code on site', 'Pick your language', 'Read & listen to the guide'],
      stepsTitle: 'How it works',
      ctaText: 'Scan a code, pick a language and enjoy the street food of District 4.',
    },
    zh: {
      title: '关于第四郡美食导览系统',
      p1: '第四郡美食旅游系统是探索胡志明市第四郡街头饮食文化的伙伴——这里被誉为全市"螺肉天堂"与热闹的夜食街区。',
      p2: '在每个美食地点扫描二维码即可打开导览页面，选择语言（越南语、英语、中文、韩语、日语），阅读资讯并收听由管理员精心录制的语音讲解。',
      features: [
        ['📱 扫码导览', '地点的二维码直接在手机上打开导览页——无需安装应用。'],
        ['🎧 多语言语音讲解', '以5种语言提供详细内容与语音介绍，适合国际游客。'],
        ['🗺️ 美食路线', '按主题推荐路线：夜宵、早餐、海鲜——各停靠点相连。'],
        ['🧭 本地探索', '按美食、分类、价格与营业时间搜索餐厅。'],
      ],
      steps: ['扫描现场二维码', '选择你的语言', '阅读并收听导览'],
      stepsTitle: '如何使用?',
      ctaText: '扫一扫，选择语言，尽情享受第四郡街头美食。',
    },
    ko: {
      title: '4군 미식 가이드 시스템 소개',
      p1: '4군 미식 관광 시스템은 호찌민시 4군의 길거리 음식 문화를 탐험하는 동반자입니다. 4군은 "조개 천국"과 활기찬 야식 거리로 유명합니다.',
      p2: '각 음식점에서 QR코드를 스캔하면 가이드 페이지가 열립니다. 언어(베트남어, English, 中文, 한국어, 日本語)를 선택하고 정보를 읽고 관리자가 준비한 오디오 해설을 들어보세요.',
      features: [
        ['📱 QR 가이드', '현장의 QR코드가 앱 설치 없이 바로 가이드 페이지를 엽니다.'],
        ['🎧 다국어 오디오 해설', '5개 언어로 상세 콘텐츠와 오디오 소개를 제공합니다.'],
        ['🗺️ 미식 코스', '야식, 아침, 해산물 등 테마별 추천 코스를 제공합니다.'],
        ['🧭 로컬 탐색', '음식, 카테고리, 가격, 영업시간으로 검색하세요.'],
      ],
      steps: ['현장의 QR코드 스캔', '언어 선택', '읽고 오디오 해설 듣기'],
      stepsTitle: '이용 방법',
      ctaText: 'QR코드를 스캔하고 언어를 골라 4군의 길거리 음식을 즐겨보세요.',
    },
    ja: {
      title: '4区グルメガイドシステムについて',
      p1: '4区グルメ観光システムは、ホーチミン市4区の屋台食文化を巡るガイドです。4区は「貝料理の天国」と賑やかな夜食街として知られています。',
      p2: '各スポットのQRコードをスキャンするとガイドページが開きます。言語（ベトナム語、英語、中文、韓国語、日本語）を選び、情報を読み、管理者が用意した音声ガイドを聴きましょう。',
      features: [
        ['📱 QRガイド', '現場のQRコードがアプリ不要でガイドページを開きます。'],
        ['🎧 多言語音声ガイド', '5言語で詳細コンテンツと音声紹介を提供します。'],
        ['🗺️ グルメコース', '夜・朝・海鮮などテーマ別のコースをご用意。'],
        ['🧭 ローカル探索', '料理・カテゴリー・価格・営業時間で検索できます。'],
      ],
      steps: ['現場のQRコードをスキャン', '言語を選択', '読んで音声ガイドを聴く'],
      stepsTitle: '使い方',
      ctaText: 'QRコードをスキャンして言語を選び、4区の屋台食を楽しんでください。',
    },
  };

  const c = content[lang] || content.vi;

  return (
    <section className="section container" style={{ maxWidth: 1024 }}>
      {/* Hero — serif display + lead paragraphs */}
      <div className="about-hero">
        <span className="eyebrow">About</span>
        <h2 className="about-title">{c.title}</h2>
        <p className="about-lead">{c.p1}</p>
        <p className="about-sub">{c.p2}</p>
      </div>

      {/* Feature showcase — SVG icons, no emoji */}
      <div className="card-grid about-features">
        {c.features.map(([title, desc], i) => {
          const Icon = FEATURE_ICONS[i % FEATURE_ICONS.length];
          return (
            <div className="card about-feature" key={title}>
              <div className="about-feature-icon"><Icon /></div>
              <div className="card-title">{title.replace(/^[^\s]+\s/, '')}</div>
              <p className="card-desc about-feature-desc">{desc}</p>
            </div>
          );
        })}
      </div>

      {/* How it works — 3 steps */}
      <div className="about-steps">
        <h3 className="about-steps-title">{c.stepsTitle}</h3>
        <ol className="about-steps-row">
          {c.steps.map((step, i) => (
            <li className="about-step" key={step}>
              <span className="about-step-num" aria-hidden="true">{i + 1}</span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </div>

      {/* CTA banner — the F-pattern endpoint */}
      <div className="about-cta">
        <p>{c.ctaText}</p>
        <Link to="/explore" className="about-cta-btn">
          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" stroke="currentColor" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="9" />
            <path d="M15.5 8.5l-2 5-5 2 2-5z" />
          </svg>
          {t('explorePlaces')}
        </Link>
      </div>
    </section>
  );
}
