'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';

const MIN_SCALE = 1;
const MAX_SCALE = 3;

export default function ProductGallery({ images, name }: { images: string[]; name: string }) {
  const [index, setIndex] = useState(0);
  const [open, setOpen] = useState(false);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number; ox: number; oy: number; moved: boolean } | null>(null);
  const touchStart = useRef({ x: 0, y: 0 });
  const swiped = useRef(false);
  const count = images.length;

  const show = useCallback((next: number) => {
    setIndex((next + count) % count);
    setScale(1);
    setOffset({ x: 0, y: 0 });
  }, [count]);

  const setZoom = useCallback((next: number) => {
    const clamped = Math.min(MAX_SCALE, Math.max(MIN_SCALE, Math.round(next * 100) / 100));
    setScale(clamped);
    if (clamped === MIN_SCALE) setOffset({ x: 0, y: 0 });
  }, []);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
      if (event.key === 'ArrowRight') show(index + 1);
      if (event.key === 'ArrowLeft') show(index - 1);
      if (event.key === '+' || event.key === '=') setZoom(scale + 0.5);
      if (event.key === '-' || event.key === '_') setZoom(scale - 0.5);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, index, scale, show, setZoom]);

  const openViewer = () => {
    if (swiped.current) {
      swiped.current = false;
      return;
    }
    setScale(1);
    setOffset({ x: 0, y: 0 });
    setOpen(true);
  };

  return (
    <div>
      <div
        className="group relative flex h-87.5 w-full items-center justify-center overflow-hidden rounded-2xl border border-[#EBE5DF] bg-[#F4F0EA] touch-pan-y md:h-125"
        onTouchStart={(event) => {
          touchStart.current = { x: event.touches[0].clientX, y: event.touches[0].clientY };
          swiped.current = false;
        }}
        onTouchEnd={(event) => {
          const diffX = event.changedTouches[0].clientX - touchStart.current.x;
          const diffY = event.changedTouches[0].clientY - touchStart.current.y;
          if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 30 && count > 1) {
            swiped.current = true;
            show(index + (diffX < 0 ? 1 : -1));
          }
        }}
      >
        <button
          type="button"
          className="absolute inset-0 z-1 cursor-zoom-in"
          onClick={openViewer}
          aria-label={`放大檢視${name}的實拍 ${index + 1}`}
        >
          <Image
            src={images[index]}
            alt={`${name} 實拍 ${index + 1}`}
            fill
            priority={index === 0}
            {...(index === 0 ? {} : { loading: 'lazy' as const })}
            quality={90}
            sizes="(max-width: 768px) 100vw, 800px"
            className="object-contain"
          />
          <span className="absolute bottom-3 left-3 rounded-full bg-[#382E2B]/75 px-3 py-1.5 text-[12px] font-medium text-white">
            放大檢視
          </span>
        </button>

        {count > 1 && (
          <>
            <button
              type="button"
              className="absolute top-1/2 left-3.75 z-5 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border-none bg-[#382E2B]/60 text-[16px] text-white opacity-80 transition duration-300 hover:bg-[#382E2B] md:opacity-50 md:group-hover:opacity-100"
              onClick={() => show(index - 1)}
              aria-label="上一張實拍"
            >
              &#10094;
            </button>
            <button
              type="button"
              className="absolute top-1/2 right-3.75 z-5 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border-none bg-[#382E2B]/60 text-[16px] text-white opacity-80 transition duration-300 hover:bg-[#382E2B] md:opacity-50 md:group-hover:opacity-100"
              onClick={() => show(index + 1)}
              aria-label="下一張實拍"
            >
              &#10095;
            </button>
            <p className="absolute right-3 bottom-3 z-5 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-medium text-[#382E2B]">
              實拍 {index + 1} / {count}
            </p>
          </>
        )}
      </div>

      {count > 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="商品實拍">
          {images.map((image, imageIndex) => {
            const active = imageIndex === index;
            return (
              <button
                key={`${image}-${imageIndex}`}
                type="button"
                role="tab"
                aria-selected={active}
                aria-label={`實拍 ${imageIndex + 1}`}
                onClick={() => show(imageIndex)}
                className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border bg-[#F4F0EA] ${
                  active ? 'border-[#B35B48]' : 'border-[#EBE5DF]'
                }`}
              >
                <Image
                  src={image}
                  alt=""
                  fill
                  sizes="64px"
                  className="object-cover"
                />
              </button>
            );
          })}
        </div>
      )}

      {open && (
        <div
          className="fixed inset-0 z-3000 flex items-center justify-center overflow-hidden bg-[#382E2B]/92"
          role="dialog"
          aria-modal="true"
          aria-label="放大檢視商品圖"
          onClick={() => setOpen(false)}
        >
          <div className="absolute top-4 right-4 left-4 z-20 flex items-center justify-between text-white">
            <p className="text-[13px]">實拍 {index + 1} / {count} · {Math.round(scale * 100)}%</p>
            <div className="flex gap-2">
              <button type="button" className="rounded-full bg-[#382E2B]/80 px-3 py-2 text-[13px]" onClick={(event) => { event.stopPropagation(); setZoom(scale - 0.5); }}>
                縮小
              </button>
              <button type="button" className="rounded-full bg-[#382E2B]/80 px-3 py-2 text-[13px]" onClick={(event) => { event.stopPropagation(); setZoom(scale + 0.5); }}>
                放大
              </button>
              <button type="button" className="rounded-full bg-white px-3 py-2 text-[13px] font-semibold text-[#382E2B]" onClick={() => setOpen(false)}>
                關閉
              </button>
            </div>
          </div>

          {count > 1 && (
            <>
              <button
                type="button"
                className="absolute top-1/2 left-3 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/20 text-white"
                aria-label="上一張實拍"
                onClick={(event) => { event.stopPropagation(); show(index - 1); }}
              >
                &#10094;
              </button>
              <button
                type="button"
                className="absolute top-1/2 right-3 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/20 text-white"
                aria-label="下一張實拍"
                onClick={(event) => { event.stopPropagation(); show(index + 1); }}
              >
                &#10095;
              </button>
            </>
          )}

          {/* The original file is shown here so zoom does not pass through the image optimizer. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={images[index]}
            alt={`${name} 實拍 ${index + 1} 放大`}
            draggable={false}
            className={`max-h-[82vh] max-w-[92vw] object-contain touch-none select-none ${scale > 1 ? 'cursor-grab' : 'cursor-zoom-in'}`}
            style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})` }}
            onClick={(event) => event.stopPropagation()}
            onWheel={(event) => {
              event.stopPropagation();
              setZoom(scale + (event.deltaY < 0 ? 0.25 : -0.25));
            }}
            onPointerDown={(event) => {
              event.currentTarget.setPointerCapture(event.pointerId);
              drag.current = { x: event.clientX, y: event.clientY, ox: offset.x, oy: offset.y, moved: false };
            }}
            onPointerMove={(event) => {
              if (!drag.current || scale === 1) return;
              const dx = event.clientX - drag.current.x;
              const dy = event.clientY - drag.current.y;
              if (Math.abs(dx) + Math.abs(dy) > 4) drag.current.moved = true;
              setOffset({ x: drag.current.ox + dx, y: drag.current.oy + dy });
            }}
            onPointerUp={() => {
              const moved = drag.current?.moved;
              drag.current = null;
              if (!moved) setZoom(scale === 1 ? 2 : 1);
            }}
          />
        </div>
      )}
    </div>
  );
}
