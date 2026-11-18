import Link from 'next/link';
import StudioPage from '@/components/StudioPage';

const CHAPTERS = [
  {
    title: '雲棧在做什麼',
    body: 'VILLA ATELIER 雲棧是一間選品網店。包包、配飾與日常服飾放在同一張桌子上，讓一件能出門的單品，旁邊就有能一起帶走的顏色與輪廓。',
  },
  {
    title: '怎麼挑選',
    body: '目錄可以按價格、包款、色系與排列方式收斂。同一款如果有別的顏色，卡片上的色點會直接標出來。組合優惠則把已經搭好的幾件，收成一個價錢。',
  },
  {
    title: '怎麼送到你手上',
    body: '商品小計滿 HKD 600 免運。未滿則可選順豐自取點或住宅配送，運費在確認訂單時才決定。出貨後，會員中心會顯示順豐追蹤編號。',
  },
];

export default function AboutPage() {
  return (
    <StudioPage
      kicker="ABOUT · 關於雲棧"
      title="生活如棧，心境若雲"
      lede="雲棧把選品、手記與造型放在同一條路上。想先認識這間店，從這裡開始就夠。"
    >
      <div className="flex flex-col gap-6">
        {CHAPTERS.map((chapter) => (
          <article key={chapter.title} className="rounded-2xl border border-[#EBE5DF] bg-white p-6 sm:p-8">
            <h2 className="mb-3 font-serif text-[20px] text-[#382E2B]">{chapter.title}</h2>
            <p className="text-[14px] leading-[1.9] text-[#5C4D42]">{chapter.body}</p>
          </article>
        ))}
      </div>

      <div className="mt-10 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Link href="/categories" className="rounded-full bg-[#B35B48] px-5 py-3 text-center text-[13px] font-semibold text-white no-underline transition hover:bg-[#9B4C3A]">
          瀏覽全站選品
        </Link>
        <Link href="/promotions" className="rounded-full border border-[#EBE5DF] bg-white px-5 py-3 text-center text-[13px] font-semibold text-[#382E2B] no-underline transition hover:border-[#B35B48] hover:text-[#B35B48]">
          看現在的活動
        </Link>
        <Link href="/journey" className="rounded-full border border-[#EBE5DF] bg-white px-5 py-3 text-center text-[13px] font-semibold text-[#382E2B] no-underline transition hover:border-[#B35B48] hover:text-[#B35B48]">
          閱讀品牌誌
        </Link>
      </div>
    </StudioPage>
  );
}
