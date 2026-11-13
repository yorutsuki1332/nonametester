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
        <div className="flex items-center space-x-6 pt-2 text-[11px] text-[#7A7670] tracking-widest">
          {onMemberClick ? (
            <button type="button" onClick={onMemberClick} className={`${linkClass} bg-transparent border-none cursor-pointer p-0`}>
              會員權益
            </button>
          ) : (
            <Link href="/account" className={linkClass}>
              會員權益
            </Link>
          )}
          <span>·</span>
          <Link href="/#curated-section" className={linkClass}>
            配送說明
          </Link>
          <span>·</span>
          <Link href="/#curated-section" className={linkClass}>
            聯絡我們
          </Link>
        </div>
        <p className="pt-4 text-[10px] text-[#7A7670]/80 tracking-[0.2em] uppercase">
          © 2026 VILLA ATELIER STUDIO. ALL RIGHTS RESERVED.
        </p>
      </div>
    </footer>
  );
}
