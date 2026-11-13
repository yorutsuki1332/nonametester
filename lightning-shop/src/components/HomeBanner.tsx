'use client';

import { useEffect, useRef, useState } from 'react';

type BannerAction = 'bags' | 'newest' | 'hot';

const SLIDES: {
  id: BannerAction;
  kicker: string;
  title: string;
  text: string;
  cta: string;
  mark: string;
  panel: string;
  ink: string;
  muted: string;
  button: string;
}[] = [
  {
    id: 'bags',
    kicker: '品牌主打系列',
    title: '焦糖色日常包款',
    text: '托特、腋下與通勤包，這一季的主軸包款。',
    cta: '查看包包系列',
    mark: 'BAGS',
    panel: 'bg-[#F6E7DC]',
    ink: 'text-[#3D312A]',
    muted: 'text-[#8C6D5E]',
    button: 'bg-[#A8573E] text-white hover:bg-[#8E4632]',
  },
  {
    id: 'newest',
    kicker: '季節新品',
    title: '本週新上架',
    text: '依最新上架時間，看這一季剛到的選品。',
    cta: '看最新上架',
    mark: 'NEW',
    panel: 'bg-[#EFE6D6]',
    ink: 'text-[#3D312A]',
    muted: 'text-[#8C6D5E]',
    button: 'bg-[#3D312A] text-[#FAF6F0] hover:bg-[#2A221E]',
  },
  {
    id: 'hot',
    kicker: '限時活動',
    title: '熱賣精選',
    text: '正在熱賣的單品集中在這裡，隨庫存更新。',
    cta: '查看熱門推薦',
    mark: 'HOT',
    panel: 'bg-[#3D312A]',
    ink: 'text-[#FAF6F0]',
    muted: 'text-[#D7C7BC]',
    button: 'bg-[#E7D3C5] text-[#3D312A] hover:bg-[#F3E6DC]',
  },
];

export default function HomeBanner({ onAction }: { onAction: (action: BannerAction) => void }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchX = useRef(0);
  const slide = SLIDES[index];

  useEffect(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion || paused) return;
    const timer = window.setTimeout(() => {
      setIndex((current) => (current + 1) % SLIDES.length);
    }, 6000);
    return () => window.clearTimeout(timer);
  }, [index, paused]);

  const go = (next: number) => {
    setIndex((next + SLIDES.length) % SLIDES.length);
  };

  return (
    <section
      className={`relative overflow-hidden rounded-2xl border border-[#EBE5DF] ${slide.panel}`}
      aria-roledescription="carousel"
      aria-label="首頁橫幅"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      onTouchStart={(event) => {
        touchX.current = event.changedTouches[0].clientX;
      }}
      onTouchEnd={(event) => {
        const delta = event.changedTouches[0].clientX - touchX.current;
        if (delta > 48) go(index - 1);
        if (delta < -48) go(index + 1);
      }}
    >
      <div key={slide.id} className="home-banner-in grid min-h-[320px] md:min-h-[380px] md:grid-cols-[1.3fr_0.7fr]">
        <div className="flex flex-col justify-center px-6 py-10 sm:px-10 md:px-14">
          <p className={`text-[11px] tracking-[0.28em] uppercase ${slide.muted}`}>{slide.kicker}</p>
          <h1 className={`mt-3 font-serif text-[32px] leading-tight tracking-[2px] md:text-[44px] ${slide.ink}`}>
            {slide.title}
          </h1>
          <p className={`mt-3 max-w-md text-sm leading-7 ${slide.muted}`}>{slide.text}</p>
          <button
            type="button"
            onClick={() => onAction(slide.id)}
            className={`mt-6 w-fit cursor-pointer rounded-full px-5 py-2.5 text-sm font-medium transition ${slide.button}`}
          >
            {slide.cta}
          </button>
        </div>
        <div className="relative hidden md:block">
          <div className={`absolute inset-8 flex items-end rounded-2xl border border-black/5 p-6 ${slide.id === 'hot' ? 'bg-[#2A221E]' : 'bg-white/45'}`}>
            <span className={`font-serif text-5xl tracking-[0.18em] ${slide.ink}`}>{slide.mark}</span>
          </div>
        </div>
      </div>

      <div className="absolute bottom-4 left-6 flex items-center gap-3 sm:left-10 md:left-14">
        <button
          type="button"
          aria-label="上一張橫幅"
          onClick={() => go(index - 1)}
          className={`flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border text-sm ${
            slide.id === 'hot' ? 'border-white/20 text-[#FAF6F0]' : 'border-[#3D312A]/15 text-[#3D312A]'
          }`}
        >
          ‹
        </button>
        <div className="flex items-center gap-2" role="tablist" aria-label="橫幅頁次">
          {SLIDES.map((item, itemIndex) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-label={item.kicker}
              aria-selected={itemIndex === index}
              onClick={() => go(itemIndex)}
              className={`h-1.5 cursor-pointer rounded-full transition-all ${
                itemIndex === index ? 'w-6 bg-[#A8573E]' : 'w-1.5 bg-[#A8573E]/35'
              }`}
            />
          ))}
        </div>
        <button
          type="button"
          aria-label="下一張橫幅"
          onClick={() => go(index + 1)}
          className={`flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border text-sm ${
            slide.id === 'hot' ? 'border-white/20 text-[#FAF6F0]' : 'border-[#3D312A]/15 text-[#3D312A]'
          }`}
        >
          ›
        </button>
      </div>
    </section>
  );
}
