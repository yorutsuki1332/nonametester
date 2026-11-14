'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import { db } from '@/lib/firebase';
import { LOOK_PANELS, LOOKS, normalizeLook, sortLooks, type Look } from '@/lib/lookbook';

export default function LookbookPage() {
  const [looks, setLooks] = useState<Look[]>(LOOKS);

  useEffect(() => {
    return db.collection('looks').onSnapshot(
      (snapshot) => {
        if (snapshot.empty) {
          setLooks(LOOKS);
          return;
        }
        const list = snapshot.docs
          .map((doc) => normalizeLook(doc.id, doc.data() as Record<string, unknown>))
          .filter((look): look is Look => look !== null);
        setLooks(list.length > 0 ? sortLooks(list) : LOOKS);
      },
      () => setLooks(LOOKS),
    );
  }, []);

  return (
    <div className="min-h-screen bg-[#FAF7F2] font-sans text-[#382E2B]">
      <SiteHeader />
      <main className="mx-auto w-full max-w-300 px-[4%] pt-36 pb-24">
        <header className="mb-14 text-center">
          <p className="mb-2 text-[11px] tracking-[3px] text-[#B35B48] uppercase">Seasonal Lookbook</p>
          <h1 className="mb-3 font-serif text-[24px] tracking-[1px] text-[#382E2B] sm:text-[28px] sm:tracking-[3px] md:text-[32px]">2026 季節穿搭造型集</h1>
          <p className="mx-auto max-w-lg text-[13px] text-[#7A6E65]">
            將溫潤大地色系與簡約輪廓融入日常場景，探索不同單品之間的搭配靈感。
          </p>
        </header>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {looks.map((look) => {
            const tone = LOOK_PANELS[look.panel];
            return (
              <article key={look.id} className="flex flex-col justify-between overflow-hidden rounded-2xl border border-[#EBE5DF] bg-white shadow-xs transition duration-300 hover:-translate-y-1.5">
                <div>
                  <div className={`flex min-h-56 flex-col justify-between p-5 sm:h-72 sm:p-7 ${tone.panel}`}>
                    <div className="flex flex-col gap-1 text-[10px] tracking-[1px] opacity-80 sm:flex-row sm:items-center sm:justify-between sm:text-[11px] sm:tracking-[2px]">
                      <span>LOOK {look.id}</span>
                      <span>{look.season}</span>
                    </div>
                    <div className="mt-6">
                      <p className={`mb-2 text-[11px] leading-relaxed font-medium ${tone.palette}`}>{look.colors}</p>
                      <h2 className="font-serif text-[20px] leading-snug sm:text-[21px]">{look.title}</h2>
                    </div>
                  </div>
                  <p className="p-6 text-[13px] leading-[1.85] text-[#5C4D42]">{look.body}</p>
                </div>
                <div className="px-6 pb-6">
                  <Link
                    href={look.href}
                    className="block rounded-lg border border-[#EBE5DF] bg-[#FAF7F2] py-3 text-center text-[13px] font-medium text-[#382E2B] no-underline transition hover:bg-[#B35B48] hover:text-white"
                  >
                    選購此造型同款單品 →
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
