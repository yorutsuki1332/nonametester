import Link from 'next/link';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';

export default function JourneyNotFound() {
  return (
    <div className="min-h-screen bg-[#FAF7F2] font-sans text-[#382E2B]">
      <SiteHeader />
      <main className="mx-auto flex min-h-[60vh] w-full max-w-180 flex-col items-center justify-center px-[6%] pt-36 pb-24 text-center">
        <p className="mb-3 text-[11px] tracking-[3px] text-[#B35B48] uppercase">JOURNAL</p>
        <h1 className="mb-3 font-serif text-[26px] text-[#382E2B]">這篇手記不在架上</h1>
        <p className="mb-8 text-[14px] text-[#6E6058]">它可能已收起，或網址寫錯了。可以回到品牌誌看其他篇章。</p>
        <Link href="/journey" className="rounded-full bg-[#B35B48] px-6 py-3 text-[13px] font-semibold text-white no-underline transition hover:bg-[#9B4C3A]">
          返回品牌誌
        </Link>
      </main>
      <SiteFooter />
    </div>
  );
}
