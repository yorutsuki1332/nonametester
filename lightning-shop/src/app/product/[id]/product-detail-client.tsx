'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  description?: string;
  images?: string[];
}

export default function ProductDetailClient({ 
  initialProduct 
}: { 
  initialId: string; 
  initialProduct: any 
}) {
  const router = useRouter();

  const [product] = useState<Product | null>(initialProduct);
  const [quantity, setQuantity] = useState(1);
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [navSearch, setNavSearch] = useState('');

  const touchStartX = useRef(0);
  const touchStartY = useRef(0);

  const handleNavSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const keyword = navSearch ? navSearch.trim() : '';
      if (keyword) {
        router.push(`/?search=${encodeURIComponent(keyword)}`);
      }
    }
  };

  const updateQty = (change: number) => {
    setQuantity(prev => Math.max(1, prev + change));
  };

  const changeSlide = (index: number, length: number) => {
    const target = (index + length) % length;
    setActiveSlideIndex(target);
  };

  const moveSlide = (direction: number, length: number) => {
    changeSlide(activeSlideIndex + direction, length);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (length: number, e: React.TouchEvent) => {
    const diffX = e.changedTouches[0].clientX - touchStartX.current;
    const diffY = e.changedTouches[0].clientY - touchStartY.current;

    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 30) {
      if (diffX < 0) {
        moveSlide(1, length);
      } else {
        moveSlide(-1, length);
      }
    }
  };

  const addToCart = () => {
    if (!product) return;
    let cart = JSON.parse(localStorage.getItem('lightning_life_cart') || '[]');
    const item = cart.find((x: any) => x.id === product.id);
    if (item) {
      item.quantity += quantity;
    } else {
      cart.push({ id: product.id, name: product.name, price: Number(product.price), quantity });
    }
    localStorage.setItem('lightning_life_cart', JSON.stringify(cart));
    router.push('/');
  };

  if (!product) {
    return (
      <div className="bg-white text-[#333333] min-h-screen flex items-center justify-center font-sans">
        <div className="text-[18px] text-[#888]">商品不存在或已下架。</div>
      </div>
    );
  }

  const validImages = product.images 
    ? product.images.filter(img => img && typeof img === 'string' && img.trim() !== '') 
    : [];
  const hasImages = validImages.length > 0;
  const descText = product.description || "這件商品尚未提供詳細描述，但它絕對值得擁有！";

  return (
    <div className="bg-white text-[#333333] min-h-screen font-sans">
      {/* 導覽列：手機版自動改為上下堆疊，電腦版維持左右橫向 */}
      <nav className="fixed top-0 left-0 w-full bg-white/98 backdrop-blur-sm flex flex-col md:flex-row justify-between items-center py-3 md:py-0 px-[5%] z-1000 border-b border-[#f0f0f0] gap-3 md:h-18.75">
        <div className="w-full md:w-auto flex justify-between items-center">
          <Link href="/" className="text-[20px] font-bold tracking-[2px] text-[#333] no-underline">
            LIGHTNING
          </Link>
          
          {/* 手機版顯示在右側的返回首頁按鈕 */}
          <div className="flex md:hidden items-center">
            <Link href="/" className="flex items-center gap-1.5 text-[13px] font-medium text-[#333] py-1.5 px-3 rounded-[20px] bg-[#fafafa] border border-[#f0f0f0] no-underline whitespace-nowrap">
              <span>←</span> 返回首頁
            </Link>
          </div>
        </div>
        
        {/* 搜尋框：手機版獨佔一行，電腦版置中 */}
        <div className="w-full md:grow md:max-w-100 md:min-w-37.5">
          <input 
            type="text" 
            value={navSearch}
            onChange={(e) => setNavSearch(e.target.value)}
            onKeyDown={handleNavSearch}
            className="w-full py-2 px-4.5 border border-[#f0f0f0] rounded-[20px] text-[13px] outline-none bg-[#fafafa] transition focus:border-[#111] focus:bg-white"
            placeholder="🔍 搜尋商品名稱或分類..." 
          />
        </div>

        {/* 電腦版顯示的右側按鈕群組 */}
        <div className="hidden md:flex items-center gap-3.75 shrink-0">
          <Link href="/" className="flex items-center gap-1.5 text-[13px] font-medium cursor-pointer text-[#333] py-2 px-3.5 rounded-[20px] bg-[#fafafa] border border-[#f0f0f0] no-underline transition hover:bg-[#FEF9C3] hover:border-[#e5e5e5] whitespace-nowrap">
            <span>←</span> 返回首頁
          </Link>
        </div>
      </nav>

      {/* 主內容區：以確切的 pt-[105px] 完美接合固定導覽列 */}
      <main className="max-w-275 mx-auto pt-33.75 md:pt-26.25 pb-15 px-[5%] grid grid-cols-1 md:grid-cols-2 gap-10">
        {/* 圖片展示區 */}
        {hasImages ? (
          <div 
            className="relative w-full h-87.5 md:h-125 bg-[#f9f9f8] rounded-2xl overflow-hidden flex items-center justify-center touch-pan-y group"
            onTouchStart={handleTouchStart}
            onTouchEnd={(e) => handleTouchEnd(validImages.length, e)}
          >
            {validImages.map((img, idx) => (
              <div 
                key={idx} 
                className={`relative w-full h-full ${idx === activeSlideIndex ? 'block' : 'hidden'}`}
              >
                <Image
                  src={img}
                  alt={product.name}
                  fill
                  priority={idx === 0}
                  sizes="(max-width: 768px) 100vw, 500px"
                  className="object-cover"
                />
              </div>
            ))}
            {validImages.length > 1 && (
              <>
                <button 
                  type="button"
                  className="absolute top-1/2 -translate-y-1/2 left-3.75 bg-black/40 text-white border-none w-9 h-9 rounded-full cursor-pointer flex items-center justify-center text-[16px] opacity-0 group-hover:opacity-100 transition duration-300 z-5 hover:bg-black/70"
                  onClick={() => moveSlide(-1, validImages.length)}
                >
                  &#10094;
                </button>
                <button 
                  type="button"
                  className="absolute top-1/2 -translate-y-1/2 right-3.75 bg-black/40 text-white border-none w-9 h-9 rounded-full cursor-pointer flex items-center justify-center text-[16px] opacity-0 group-hover:opacity-100 transition duration-300 z-5 hover:bg-black/70"
                  onClick={() => moveSlide(1, validImages.length)}
                >
                  &#10095;
                </button>
                <div className="absolute bottom-3.75 left-1/2 -translate-x-1/2 flex gap-1.5 z-5">
                  {validImages.map((_, idx) => (
                    <span 
                      key={idx} 
                      className={`h-2 rounded-full cursor-pointer transition-all duration-300 ${idx === activeSlideIndex ? 'bg-white w-5 rounded-sm' : 'bg-white/50 w-2'}`}
                      onClick={() => changeSlide(idx, validImages.length)} 
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="relative w-full h-87.5 md:h-125 bg-[#f9f9f8] rounded-2xl overflow-hidden flex items-center justify-center text-[15px] text-[#888]">
            <span>{product.category || 'NO IMAGE'} 示意圖</span>
          </div>
        )}

        {/* 右側資訊區 */}
        <div className="py-2.5 flex flex-col justify-center">
          <div className="text-[13px] text-[#888] mb-3">
            <button 
              type="button"
              className="bg-transparent border-none text-[#888] cursor-pointer text-[13px] p-0 hover:underline" 
              onClick={() => router.push('/')}
            >
              首頁
            </button> / {product.category} / {product.name}
          </div>
          <h1 className="text-[24px] md:text-[28px] font-semibold mb-3 leading-[1.3]">{product.name}</h1>
          <div className="text-[20px] md:text-[22px] font-semibold text-[#111] mb-3.75">HKD {Number(product.price).toFixed(1)}</div>
          
          <div className="text-[14px] text-[#555] mb-5 whitespace-pre-wrap leading-[1.8] max-h-none md:h-62.5 md:max-h-62.5 overflow-y-auto pr-2 wrap-break-word [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-[#ddd] [&::-webkit-scrollbar-thumb]:rounded-full">
            {descText}
          </div>
          
          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3.75 mt-5 mb-3">
            <div className="flex items-center justify-center border border-[#f0f0f0] rounded-xl overflow-hidden bg-[#fafafa]">
              <button type="button" className="bg-transparent border-none py-3 px-4 text-[16px] cursor-pointer text-[#333] transition hover:bg-neutral-200" onClick={() => updateQty(-1)}>-</button>
              <input type="number" value={quantity} readOnly className="w-12.5 md:pl-5 text-center border-none bg-transparent text-[15px] font-semibold outline-none" />
              <button type="button" className="bg-transparent border-none py-3 px-4 text-[16px] cursor-pointer text-[#333] transition hover:bg-neutral-200" onClick={() => updateQty(1)}>+</button>
            </div>
            <button 
              type="button"
              className="grow bg-[#111] text-white p-4 border-none rounded-xl text-[15px] font-semibold cursor-pointer transition hover:bg-[#333] hover:-translate-y-0.5 hover:shadow-[0_10px_20px_rgba(0,0,0,0.1)]"
              onClick={addToCart}
            >
              加入購物車
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}