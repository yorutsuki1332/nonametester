import Link from 'next/link';

export default function EditorialBanners() {
  return (
    <section className="mt-20 border-t border-[#EBE5DF] pt-14">
      <div className="mb-10 text-center">
        <p className="mb-1.5 text-[11px] tracking-[3px] text-[#A3958B] uppercase">Editorial & Inspiration</p>
        <h2 className="font-serif text-[18px] tracking-[3px] text-[#382E2B]">品牌故事與穿搭靈感</h2>
      </div>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Link
          href="/journey"
          className="group flex min-h-72.5 cursor-pointer flex-col justify-between rounded-2xl border border-[#EBE5DF] bg-[#F4F0EA] p-8 no-underline transition duration-500 hover:border-[#B35B48]/60 hover:shadow-md md:p-10"
        >
          <div>
            <span className="mb-3 inline-block text-[11px] font-semibold tracking-[2.5px] text-[#B35B48] uppercase">
              OUR JOURNEY · 品牌誌
            </span>
            <h3 className="mb-3 font-serif text-[22px] leading-snug text-[#382E2B] transition group-hover:text-[#B35B48]">
              在喧囂日常裡，
              <br />
              尋找溫潤且長久的陪伴
            </h3>
            <p className="max-w-md text-[13px] leading-relaxed text-[#6E6058]">
              從布料觸感、包袋輪廓到細微五金光澤，記錄 VILLA ATELIER 走訪各地工作室與選物背後的工藝溫度。
            </p>
          </div>
          <div className="mt-8 flex items-center gap-2 text-[13px] font-semibold text-[#382E2B] transition group-hover:text-[#B35B48]">
            <span>閱讀品牌故事</span>
            <span className="transition-transform duration-300 group-hover:translate-x-1.5">→</span>
          </div>
        </Link>

        <Link
          href="/lookbook"
          className="group flex min-h-72.5 cursor-pointer flex-col justify-between rounded-2xl border border-[#EBE5DF] bg-[#382E2B] p-8 no-underline transition duration-500 hover:shadow-md md:p-10"
        >
          <div>
            <span className="mb-3 inline-block text-[11px] font-semibold tracking-[2.5px] text-[#D8A494] uppercase">
              SEASONAL LOOKBOOK · 造型集
            </span>
            <h3 className="mb-3 font-serif text-[22px] leading-snug text-[#FAF7F2] transition group-hover:text-[#E8C2B5]">
              2026 秋冬日常提案：
              <br />
              大地色調與鬆弛廓形
            </h3>
            <p className="max-w-md text-[13px] leading-relaxed text-[#D6CEC7]">
              探索如何將極簡包袋、日常服飾與細緻飾品融入通勤與週末漫步，一鍵檢視造型同款單品。
            </p>
          </div>
          <div className="mt-8 flex items-center gap-2 text-[13px] font-semibold text-[#FAF7F2] transition group-hover:text-[#E8C2B5]">
            <span>探索本季造型畫報</span>
            <span className="transition-transform duration-300 group-hover:translate-x-1.5">→</span>
          </div>
        </Link>
      </div>
    </section>
  );
}
