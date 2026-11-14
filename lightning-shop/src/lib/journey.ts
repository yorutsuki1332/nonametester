export interface JourneyPost {
  slug: string;
  chapter: string;
  kicker: string;
  title: string;
  date: string;
  dateLabel: string;
  minutes: number;
  excerpt: string;
  quote: string;
  paragraphs: string[];
  shopHref: string;
  shopLabel: string;
}

export const JOURNEY_POSTS: JourneyPost[] = [
  {
    slug: 'autumn-notes',
    chapter: 'JOURNAL 05',
    kicker: 'SEASONAL NOTES',
    title: '秋日手記：大地色如何進入一天',
    date: '2026-11-02',
    dateLabel: '2026年11月2日',
    minutes: 4,
    excerpt: '從晨間的燕麥色襯衫到傍晚的焦糖棕托特，記錄這一季我們把大地色穿進日常的方式。',
    quote: '顏色不必大聲。它只要在轉身時，還留得住一點溫度。',
    paragraphs: [
      '十一月的工作室把窗簾拉開一點。光線不再是夏天那種直直落下的白，而是帶著麥殼色的斜光。我們把本季的布料鋪在長桌上，燕麥、暖沙、焦糖與霧面金排成一列，像把一天的時間攤開。',
      '早晨適合最輕的那一層。寬鬆的亞麻襯衫不必塞進褲頭，肩線自然落下，走路時布料會自己找到位置。這時候如果再加一只軟皮肩背包，重量只落在單側，手臂仍能空出來拿咖啡。',
      '午後若要出門看展或走路回家，顏色可以再深一度。赤陶棕的托特容得下筆記本與保溫瓶，金屬耳骨夾只在轉頭時閃一下。我們希望配飾是句子裡的逗號，而不是整段的驚嘆號。',
      '秋日手記寫到這裡，其實只是提醒自己：挑選一件能穿過整個季節的單品，比追着每週的新顏色更讓衣櫃安靜。安靜的衣櫃，早晨才不會趕。',
    ],
    shopHref: '/lookbook',
    shopLabel: '看本季造型集',
  },
  {
    slug: 'studio-walk',
    chapter: 'JOURNAL 04',
    kicker: 'STUDIO VISITS',
    title: '走訪工坊：把溫度帶回家',
    date: '2026-10-18',
    dateLabel: '2026年10月18日',
    minutes: 5,
    excerpt: '這一季的包袋與飾品，來自日韓與台灣的小型工坊。我們記下觸摸樣品時真正留下的感覺。',
    quote: '好的物件會在手上停留久一點。那多出來的幾秒，就是我們決定留下它的理由。',
    paragraphs: [
      '選品旅行通常沒有華麗的展示間。更多時候是一張工作桌、一壺茶，以及還沒修邊的樣品。我們習慣先不看吊牌，把包背起來走兩圈，再把飾品放在窗邊看它反光的方式。',
      '在一間做軟皮小包的工坊裡，師傅把邊緣修到幾乎看不見線。包身不硬，卻能自己站住。這種「放著也好看、背上也不吵」的狀態，很接近我們對日常包的想像。',
      '飾品則要更克制。黃銅會慢慢變暗，珍珠不會搶走衣服的顏色。我們問的不是它閃不閃，而是它能不能跟一件穿了三年的襯衫坐在一起。',
      '回程的行李並不多。能進到雲棧的，是那些摸過之後還想再摸一次的東西。溫度不是形容詞，是手上還記得的重量。',
    ],
    shopHref: '/categories?category=BAGS',
    shopLabel: '查看包袋選品',
  },
  {
    slug: 'less-but-better',
    chapter: 'CHAPTER 03',
    kicker: 'LESS BUT BETTER',
    title: '永續日常：少而精的衣櫥哲學',
    date: '2026-10-02',
    dateLabel: '2026年10月2日',
    minutes: 4,
    excerpt: '少買一件，並不是委屈。是把衣櫃留給真正會被反覆打開的那些。',
    quote: '每一次打開衣櫃，都該像一場從容的儀式，而不是一場選擇困難。',
    paragraphs: [
      '我們鼓勵有意識的購買。一件能穿三年以上的亞麻襯衫，一只足以容納生活隨身物的托特包，往往比五件只為了某一週的單品更常被穿上。',
      '少而精不是把生活縮得很小。它是讓每一件留下的衣服都有明確的工作：通勤、週末走路、見朋友的晚餐。當角色清楚，搭配就不再靠運氣。',
      '保養也是這件事的一部分。皮革會因手汗與陽光慢慢變深，棉麻洗過幾次之後更貼身。我們希望顧客帶走的不是當季的新鮮感，而是會跟著時間變得更好看的物件。',
      '如果你正在整理衣櫃，可以先留下最常伸手去拿的三件。雲棧之後的選品，都會試著成為那三件之一。',
    ],
    shopHref: '/categories?category=DAILY%20WEAR',
    shopLabel: '查看日常服飾',
  },
  {
    slug: 'how-we-choose',
    chapter: 'CHAPTER 02',
    kicker: 'CURATION & CRAFTSMANSHIP',
    title: '選品標準：觸感與實穿的平衡',
    date: '2026-09-16',
    dateLabel: '2026年9月16日',
    minutes: 4,
    excerpt: '上架之前，我們會先摸版型、試負重，再決定它能不能留在衣櫥裡超過一個季節。',
    quote: '好看如果不能穿出門，就只是一張照片。',
    paragraphs: [
      '每一件上架的選品，都會先經過手。布料要能感覺到織紋，包袋要能裝進每天真的會帶的東西：筆記本、水杯、一把鑰匙，而不是只為了棚拍。',
      '我們走訪日韓與台灣的獨立工坊，也會刪掉很多當下很吸引人的樣品。太依賴某一季的剪裁、洗一次就失去垂墜的面料、重到讓肩膀記得它的包，都不會留下。',
      '留下的標準很單純：觸感舒服，輪廓安靜，而且能跟衣櫃裡已經有的衣服一起出門。自由混搭比成套造型更接近我們每天的生活。',
      '所以你在目錄裡看到的數量不多。少，是為了讓每一件都站得住。',
    ],
    shopHref: '/categories',
    shopLabel: '瀏覽全站選品',
  },
  {
    slug: 'the-beginning',
    chapter: 'CHAPTER 01',
    kicker: 'THE BEGINNING OF ARTFUL LIVING',
    title: '源起：讓日常器物擁有呼吸感',
    date: '2026-09-01',
    dateLabel: '2026年9月1日',
    minutes: 4,
    excerpt: 'VILLA ATELIER 從一個很慢的念頭開始：讓每天都會碰到的衣服與包袋，本身就很好看。',
    quote: '真正耐看的設計，不需要繁複的裝飾。',
    paragraphs: [
      '雲棧誕生於對慢生活的嚮往。我們相信日常器物應該有呼吸的空間：剪裁剛好，布料會垂，皮革會隨著使用變得更溫。',
      '工作室的名字把 villa 與 atelier 放在一起，是希望店裡既像可以停留的住处，也像還在工作的桌子。選品不是陳列完就結束，而是持續記錄材質、光和手感。',
      '第一批留下的單品都很安靜。沒有巨大的標誌，也沒有為了拍照而做的結構。它們的工作是陪一個平凡的早晨，以及同樣平凡的黃昏。',
      '如果你是第一次讀到這裡，可以把這篇當成一封短信。後面的手記會繼續寫我們怎麼選、怎麼走訪，以及這一季打算怎麼穿。',
    ],
    shopHref: '/categories',
    shopLabel: '從選品開始逛',
  },
];

export function getJourneyPost(slug: string) {
  return JOURNEY_POSTS.find((post) => post.slug === slug);
}

export function formatJourneyDate(date: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) return date;
  return `${Number(match[1])}年${Number(match[2])}月${Number(match[3])}日`;
}

export function estimateReadingMinutes(paragraphs: string[]) {
  const length = paragraphs.join('').length;
  return Math.max(1, Math.round(length / 400));
}

export function normalizeJourneyPost(slug: string, data: Record<string, unknown>): JourneyPost | null {
  const title = typeof data.title === 'string' ? data.title.trim() : '';
  if (!slug || !title) return null;

  const paragraphs = Array.isArray(data.paragraphs)
    ? data.paragraphs
        .filter((item): item is string => typeof item === 'string' && item.trim() !== '')
        .map((item) => item.trim())
    : [];
  const date = typeof data.date === 'string' ? data.date : '';

  return {
    slug,
    chapter: typeof data.chapter === 'string' && data.chapter.trim() ? data.chapter.trim() : 'JOURNAL',
    kicker: typeof data.kicker === 'string' ? data.kicker.trim() : '',
    title,
    date,
    dateLabel: formatJourneyDate(date),
    minutes: estimateReadingMinutes(paragraphs),
    excerpt: typeof data.excerpt === 'string' ? data.excerpt.trim() : '',
    quote: typeof data.quote === 'string' ? data.quote.trim() : '',
    paragraphs,
    shopHref: typeof data.shopHref === 'string' && data.shopHref.trim() ? data.shopHref.trim() : '/categories',
    shopLabel: typeof data.shopLabel === 'string' && data.shopLabel.trim() ? data.shopLabel.trim() : '瀏覽相關選品',
  };
}

export function sortJourneyPosts(posts: JourneyPost[]) {
  return [...posts].sort((a, b) => b.date.localeCompare(a.date) || a.slug.localeCompare(b.slug));
}

export function getAdjacentPosts(posts: JourneyPost[], slug: string) {
  const index = posts.findIndex((post) => post.slug === slug);
  return {
    newer: index > 0 ? posts[index - 1] : null,
    older: index >= 0 && index < posts.length - 1 ? posts[index + 1] : null,
  };
}
