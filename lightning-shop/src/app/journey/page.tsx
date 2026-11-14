'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import { db } from '@/lib/firebase';
import { JOURNEY_POSTS, normalizeJourneyPost, sortJourneyPosts, type JourneyPost } from '@/lib/journey';

export default function JourneyPage() {
  const [posts, setPosts] = useState<JourneyPost[]>(JOURNEY_POSTS);

  useEffect(() => {
    return db.collection('journeyPosts').onSnapshot(
      (snapshot) => {
        if (snapshot.empty) {
          setPosts(JOURNEY_POSTS);
          return;
        }
        const list = snapshot.docs
          .map((doc) => normalizeJourneyPost(doc.id, doc.data() as Record<string, unknown>))
          .filter((post): post is JourneyPost => post !== null);
        setPosts(list.length > 0 ? sortJourneyPosts(list) : JOURNEY_POSTS);
      },
      () => setPosts(JOURNEY_POSTS),
    );
  }, []);

  const [featured, ...rest] = posts;

  return (
    <div className="min-h-screen bg-[#FAF7F2] font-sans text-[#382E2B]">
      <SiteHeader />
      <main className="mx-auto w-full max-w-240 px-[6%] pt-36 pb-24">
        <header className="mb-12 border-b border-[#EBE5DF] pb-10 text-center">
          <p className="mb-3 text-[11px] tracking-[3px] text-[#B35B48] uppercase">OUR JOURNEY · 品牌誌</p>
          <h1 className="mb-4 font-serif text-[24px] tracking-[1px] text-[#382E2B] sm:text-[28px] sm:tracking-[2px] md:text-[34px]">日常的美好，源於細節</h1>
          <p className="mx-auto max-w-xl text-[14px] leading-relaxed text-[#6E6058]">
            這裡是雲棧的手記。選品怎麼留下、工坊怎麼走訪、這一季打算怎麼穿，都可以慢慢讀。
          </p>
        </header>

        {featured && (
          <Link
            href={`/journey/${featured.slug}`}
            className="group mb-8 block rounded-2xl border border-[#EBE5DF] bg-white p-5 no-underline shadow-xs transition hover:border-[#B35B48]/50 sm:p-8 md:p-10"
          >
            <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] tracking-[1px]">
              <span className="font-bold tracking-[2px] text-[#B35B48]">{featured.chapter}</span>
              <span className="text-[#EBE5DF]">|</span>
              <span className="text-[#A3958B] uppercase">{featured.kicker}</span>
              <span className="text-[#A3958B]">{featured.dateLabel}</span>
              <span className="text-[#A3958B]">{featured.minutes} 分鐘</span>
            </div>
            <h2 className="mb-3 font-serif text-[22px] leading-snug text-[#382E2B] transition group-hover:text-[#B35B48] sm:text-[28px]">
              {featured.title}
            </h2>
            <p className="max-w-2xl text-[14px] leading-[1.9] text-[#5C4D42]">{featured.excerpt}</p>
            <span className="mt-6 inline-flex items-center gap-2 text-[13px] font-semibold text-[#B35B48]">
              閱讀這篇
              <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
            </span>
          </Link>
        )}

        <div className="flex flex-col">
          {rest.map((post) => (
            <Link
              key={post.slug}
              href={`/journey/${post.slug}`}
              className="group border-b border-[#EBE5DF] py-6 no-underline transition first:border-t"
            >
              <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[#A3958B]">
                <span className="font-bold tracking-[2px] text-[#B35B48]">{post.chapter}</span>
                <span>{post.dateLabel}</span>
                <span>{post.minutes} 分鐘</span>
              </div>
              <h2 className="mb-2 font-serif text-[18px] text-[#382E2B] transition group-hover:text-[#B35B48] sm:text-[20px]">
                {post.title}
              </h2>
              <p className="text-[13px] leading-relaxed text-[#6E6058]">{post.excerpt}</p>
            </Link>
          ))}
        </div>

        <div className="mt-14 rounded-2xl border border-[#EBE5DF] bg-[#F4F0EA] p-6 text-center sm:p-10">
          <h2 className="mb-3 font-serif text-[18px] text-[#382E2B]">把讀到的感覺穿出門</h2>
          <p className="mb-6 text-[13px] text-[#7A6E65]">手記裡提到的包袋、服飾與飾品，都可以在目錄裡找到。</p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/categories" className="rounded-full bg-[#B35B48] px-6 py-3 text-[13px] font-semibold text-white no-underline transition hover:bg-[#9B4C3A]">
              瀏覽全站選品
            </Link>
            <Link href="/lookbook" className="rounded-full border border-[#EBE5DF] bg-white px-6 py-3 text-[13px] font-semibold text-[#382E2B] no-underline transition hover:border-[#B35B48] hover:text-[#B35B48]">
              查看造型集
            </Link>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
