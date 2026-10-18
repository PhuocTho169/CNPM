import { useApp } from '../context/AppContext';
import { Link } from 'react-router-dom';

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
    },
    ja: {
      title: '4区グルメガイドシステムについて',
      p1: '4区グルメ観光システムは、ホーチミン市4区の屋台食文化を巡るガイドです。4区は「貝料理の天国」と賑やかな夜食街として知られています。',
      p2: '各スポットのQRコードをスキャンするとガイドページが開きます。言語（ベトナム語、英語、中文、한국어、日本語）を選び、情報を読み、管理者が用意した音声ガイドを聴きましょう。',
      features: [
        ['📱 QRガイド', '現場のQRコードがアプリ不要でガイドページを開きます。'],
        ['🎧 多言語音声ガイド', '5言語で詳細コンテンツと音声紹介を提供します。'],
        ['🗺️ グルメコース', '夜・朝・海鮮などテーマ別のコースをご用意。'],
        ['🧭 ローカル探索', '料理・カテゴリー・価格・営業時間で検索できます。'],
      ],
    },
  };

  const c = content[lang] || content.vi;

  return (
    <section className="section container" style={{ maxWidth: 820 }}>
      <span className="eyebrow">About</span>
      <h2 className="section-title">{c.title}</h2>
      <p style={{ margin: '1rem 0' }}>{c.p1}</p>
      <p style={{ margin: '1rem 0', color: 'var(--text-2)' }}>{c.p2}</p>
      <div className="card-grid" style={{ marginTop: '1.6rem' }}>
        {c.features.map(([title, desc]) => (
          <div className="card" key={title} style={{ padding: '1.2rem' }}>
            <div className="card-title">{title}</div>
            <p className="card-desc" style={{ marginTop: '0.3rem', display: 'block' }}>{desc}</p>
          </div>
        ))}
      </div>
      <div style={{ marginTop: '2rem' }}>
        <Link to="/explore" className="btn btn-orange">🧭 {t('explorePlaces')}</Link>
      </div>
    </section>
  );
}
