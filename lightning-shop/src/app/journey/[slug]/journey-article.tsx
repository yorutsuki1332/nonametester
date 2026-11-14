'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import { db } from '@/lib/firebase';
import {
  JOURNEY_POSTS,
  getAdjacentPosts,
  normalizeJourneyPost,
  sortJourneyPosts,
  type JourneyPost,
} from '@/lib/journey';

export default function JourneyArticle({ slug }: { slug: string }) {
  const [posts, setPosts] = useState<JourneyPost[] | null>(null);

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

  const post = posts?.find((item) => item.slug === slug) ?? null;
  const { newer, older } = posts ? getAdjacentPosts(posts, slug) : { newer: null, older: null };

  return (
    <div className="min-h-screen bg-[#FAF7F2] font-sans text-[#382E2B]">
      <SiteHeader />
      <main className="mx-auto w-full max-w-180 px-[6%] pt-36 pb-24">
        <Link href="/journey" className="mb-8 inline-flex text-[13px] text-[#7A6E65] no-underline transition hover:text-[#B35B48]">
          ← 返回品牌誌
        </Link>

        {posts === null && <p className="text-[14px] text-[#7A6E65]">正在載入手記…</p>}

        {posts !== null && !post && (
          <div className="rounded-2xl border border-[#EBE5DF] bg-white px-6 py-16 text-center">
            <h1 className="mb-3 font-serif text-[24px] text-[#382E2B]">這篇手記不在架上</h1>
            <p className="text-[14px] text-[#6E6058]">可能已經下架，或網址寫錯了。</p>
          </div>
        )}

        {post && (
          <>
            <header className="mb-10 border-b border-[#EBE5DF] pb-8">
              <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] tracking-[1px]">
                <span className="font-bold tracking-[2px] text-[#B35B48]">{post.chapter}</span>
                <span className="text-[#EBE5DF]">|</span>
                <span className="text-[#A3958B] uppercase">{post.kicker}</span>
              </div>
              <h1 className="mb-4 font-serif text-[26px] leading-snug text-[#382E2B] sm:text-[32px]">{post.title}</h1>
              <p className="text-[12px] text-[#A3958B]">
                {post.dateLabel}
                <span className="mx-2 text-[#EBE5DF]">·</span>
                {post.minutes} 分鐘閱讀
              </p>
            </header>

            <article className="flex flex-col gap-6">
              {post.paragraphs.map((paragraph, index) => (
                <div key={`${index}-${paragraph.slice(0, 12)}`} className="flex flex-col gap-6">
                  <p className="text-[15px] leading-loose text-[#5C4D42]">{paragraph}</p>
                  {index === 1 && post.quote && (
                    <blockquote className="border-l-2 border-[#B35B48] pl-5 font-serif text-[18px] leading-relaxed text-[#382E2B]">
                      {post.quote}
                    </blockquote>
                  )}
                </div>
              ))}
              {post.paragraphs.length < 2 && post.quote && (
                <blockquote className="border-l-2 border-[#B35B48] pl-5 font-serif text-[18px] leading-relaxed text-[#382E2B]">
                  {post.quote}
                </blockquote>
              )}
            </article>

            <div className="mt-12 rounded-2xl border border-[#EBE5DF] bg-[#F4F0EA] p-6 text-center">
              <p className="mb-4 text-[13px] text-[#6E6058]">這篇手記對應的選品，可以接著看。</p>
              <Link href={post.shopHref} className="inline-flex rounded-full bg-[#B35B48] px-6 py-3 text-[13px] font-semibold text-white no-underline transition hover:bg-[#9B4C3A]">
                {post.shopLabel}
              </Link>
            </div>

            <nav className="mt-10 grid grid-cols-1 gap-4 border-t border-[#EBE5DF] pt-8 sm:grid-cols-2" aria-label="其他手記">
              {newer ? (
                <Link href={`/journey/${newer.slug}`} className="rounded-xl border border-[#EBE5DF] bg-white p-4 no-underline transition hover:border-[#B35B48]/50">
                  <span className="text-[11px] text-[#A3958B]">較新的一篇</span>
                  <span className="mt-1 block font-serif text-[15px] text-[#382E2B]">{newer.title}</span>
                </Link>
              ) : <span />}
              {older ? (
                <Link href={`/journey/${older.slug}`} className="rounded-xl border border-[#EBE5DF] bg-white p-4 no-underline transition hover:border-[#B35B48]/50 sm:text-right">
                  <span className="text-[11px] text-[#A3958B]">較早的一篇</span>
                  <span className="mt-1 block font-serif text-[15px] text-[#382E2B]">{older.title}</span>
                </Link>
              ) : null}
            </nav>
          </>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
