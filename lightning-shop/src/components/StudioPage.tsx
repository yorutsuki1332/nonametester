'use client';

import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';

export default function StudioPage({
  kicker,
  title,
  lede,
  wide = false,
  children,
}: {
  kicker: string;
  title: string;
  lede: string;
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#FAF7F2] font-sans text-[#382E2B]">
      <SiteHeader />
      <main className={`mx-auto w-full px-[6%] pt-36 pb-24 ${wide ? 'max-w-300' : 'max-w-240'}`}>
        <header className="mb-12 border-b border-[#EBE5DF] pb-10 text-center">
          <p className="mb-3 text-[11px] tracking-[3px] text-[#B35B48] uppercase">{kicker}</p>
          <h1 className="mb-4 font-serif text-[24px] tracking-[1px] text-[#382E2B] sm:text-[28px] sm:tracking-[2px] md:text-[34px]">{title}</h1>
          <p className="mx-auto max-w-xl text-[14px] leading-relaxed text-[#6E6058]">{lede}</p>
        </header>
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
