'use client';

import { useState } from 'react';
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
  initialId, 
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

  const [touchStartX, setTouchStartX] = useState(0);
  const [touchStartY, setTouchStartY] = useState(0);

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
    setTouchStartX(e.touches[0].clientX);
    setTouchStartY(e.touches[0].clientY);
  };

  const handleTouchEnd = (length: number, e: React.TouchEvent) => {
    const diffX = e.changedTouches[0].clientX - touchStartX;
    const diffY = e.changedTouches[0].clientY - touchStartY;

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

  const validImages = product.images ? product.images.filter(img => img && img.trim() !== '') : [];
  const hasImages = validImages.length > 0;
  const descText = product.description || "這件商品尚未提供詳細描述，但它絕對值得擁有！";

  return (
    <div className="bg-white text-[#333333] min-h-screen font-sans leading-relaxed">
      {/* 導覽列 */}
      <nav className="fixed top-0 left-0 w-full min-h-[75px] bg-white/98 backdrop-blur-md flex justify-between items-center px-[5%] z-50 border-b border-[#f0f0f0] gap-[15px] flex-wrap py-3">
        <Link href="/" className="text-[20px] font-bold tracking-[2px] text-[#333] no-underline shrink-0 pl-[25.5px]">
          LIGHTNING
        </Link>
        
        <div className="flex-grow max-w-[400px] min-w-[200px]">
          <input 
            type="text" 
            value={navSearch}
            onChange={(e) => setNavSearch(e.target.value)}
            onKeyPress={handleNavSearch}
            className="w-full py-2.5 px-[18px] border border-[#f0f0f0] rounded-[20px] text-[13px] outline-none bg-[#fafafa] focus:border-[#111] focus:bg-white transition-all duration-300"
            placeholder="🔍 搜尋商品名稱或分類..." 
          />
        </div>

        <div className="flex items-center gap-[15px] shrink-0">
          <Link href="/" className="flex items-center gap-1.5 text-[13px] font-medium text-[#333] py-2 px-3.5 rounded-[20px] bg-[#fafafa] border border-[#f0f0f0] no-underline hover:bg-[#FEF9C3] transition-all duration-300 whitespace-nowrap">
            <span>←</span> 返回首頁
          </Link>
        </div>
      </nav>

      {/* 主內容區 */}
      <main className="product-detail-container">
        {/* 圖片展示區：使用 Next.js Image 優化載入速度 */}
        {hasImages ? (
          <div 
            className="relative w-full max-w-[450px] h-[500px] bg-[#f9f9f8] rounded-2xl overflow-hidden flex items-center justify-center touch-pan-y shadow-sm mx-auto md:mx-0 group"
            onTouchStart={handleTouchStart}
            onTouchEnd={(e) => handleTouchEnd(validImages.length, e)}
          >
            {validImages.map((img, idx) => (
              <div 
                key={idx} 
                className={`absolute inset-0 w-full h-full ${idx === activeSlideIndex ? 'block' : 'hidden'}`}
              >
                <Image
                  src={img}
                  alt={product.name}
                  fill
                  priority={idx === 0} // 第一張圖片優先載入（LCP 優化），解決載入慢的問題
                  sizes="(max-width: 768px) 100vw, 450px"
                  className="object-cover"
                />
              </div>
            ))}
            {validImages.length > 1 && (
              <>
                <button 
                  className="absolute top-1/2 -translate-y-1/2 left-[15px] bg-black/40 text-white border-none w-[36px] h-[36px] rounded-full flex items-center justify-center text-[16px] z-10 hover:bg-black/70 transition-colors"
                  onClick={() => moveSlide(-1, validImages.length)}
                >
                  &#10094;
                </button>
                <button 
                  className="absolute top-1/2 -translate-y-1/2 right-[15px] bg-black/40 text-white border-none w-[36px] h-[36px] rounded-full flex items-center justify-center text-[16px] z-10 hover:bg-black/70 transition-colors"
                  onClick={() => moveSlide(1, validImages.length)}
                >
                  &#10095;
                </button>
                <div className="absolute bottom-[15px] left-1/2 -translate-x-1/2 flex gap-[6px] z-10">
                  {validImages.map((_, idx) => (
                    <span 
                      key={idx} 
                      className={`h-[8px] rounded-full cursor-pointer transition-all duration-300 ${idx === activeSlideIndex ? 'w-[20px] bg-white rounded-[4px]' : 'w-[8px] bg-white/50'}`}
                      onClick={() => changeSlide(idx, validImages.length)} 
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="relative w-full max-w-[450px] h-[500px] bg-[#f9f9f8] rounded-2xl overflow-hidden flex items-center justify-center text-[15px] text-[#888] mx-auto md:mx-0">
            <span>{product.category || 'NO IMAGE'} 示意圖</span>
          </div>
        )}

        {/* 右側資訊區 */}
        <div className="py-[10px] flex flex-col justify-center">
          <div className="text-[13px] text-[#888] mb-[12px]">首頁 / {product.category} / {product.name}</div>
          <h1 className="text-[28px] font-semibold mb-[12px] leading-[1.3]">{product.name}</h1>
          <div className="text-[22px] font-semibold text-[#111] mb-[15px]">HKD {Number(product.price).toFixed(1)}</div>
          
          <div className="text-[14px] text-[#555] mb-[20px] whitespace-pre-wrap leading-[1.8] h-[250px] overflow-y-auto pr-[8px] break-words">
            {descText}
          </div>
          
          <div className="flex items-center gap-[15px] mt-[20px] mb-[12px] pt-[20px]">
            <div className="flex items-center border border-[#f0f0f0] rounded-[12px] overflow-hidden bg-[#fafafa] h-[48px]">
              <button type="button" className="bg-transparent border-none px-4 h-full text-[16px] cursor-pointer text-[#333] hover:bg-[#eee] transition-colors flex items-center justify-center" onClick={() => updateQty(-1)}>-</button>
              <input type="number" value={quantity} readOnly className="w-[50px] h-full text-center border-none bg-transparent text-[15px] font-semibold outline-none pl-[5px]" />
              <button type="button" className="bg-transparent border-none px-4 h-full text-[16px] cursor-pointer text-[#333] hover:bg-[#eee] transition-colors flex items-center justify-center" onClick={() => updateQty(1)}>+</button>
            </div>
            <button 
              className="flex-grow bg-[#111] text-white h-[48px] px-6 border-none rounded-[12px] text-[15px] font-semibold cursor-pointer hover:bg-[#333] transition-all duration-300 shadow-sm"
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