'use client';

import Link from 'next/link';

interface SiteFooterProps {
  onMemberClick?: () => void;
}

export default function SiteFooter({ onMemberClick }: SiteFooterProps) {
  const linkClass = 'hover:text-[#1E1E1E] transition';

  return (
    <footer className="border-t border-[#EAE6DF] bg-[#FAF9F6] py-14 px-6">
      <div className="max-w-7xl mx-auto flex flex-col items-center text-center space-y-4">
        <div className="font-serif text-sm tracking-[0.25em] text-[#1E1E1E]">
          VILLA ATELIER
        </div>
        <p className="text-[11px] text-[#7A7670] tracking-[0.2em] font-light">
          STUDIO OF ARTFUL LIVING & DESIGN
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 pt-2 text-[11px] tracking-widest text-[#7A7670]">
          {onMemberClick ? (
            <button type="button" onClick={onMemberClick} className={`${linkClass} cursor-pointer border-none bg-transparent p-0`}>
              會員權益
            </button>
          ) : (
            <Link href="/account" className={linkClass}>會員權益</Link>
          )}
          <Link href="/categories" className={linkClass}>全站目錄</Link>
          <Link href="/promotions" className={linkClass}>活動推廣</Link>
          <Link href="/journey" className={linkClass}>品牌誌</Link>
          <Link href="/lookbook" className={linkClass}>造型集</Link>
          <Link href="/about" className={linkClass}>關於我們</Link>
          <Link href="/qa" className={linkClass}>常見問題</Link>
          <Link href="/contact" className={linkClass}>聯絡我們</Link>
        </div>
        <p className="pt-4 text-[10px] text-[#7A7670]/80 tracking-[0.2em] uppercase">
          © 2026 VILLA ATELIER STUDIO. ALL RIGHTS RESERVED.
        </p>
      </div>
    </footer>
  );
}
