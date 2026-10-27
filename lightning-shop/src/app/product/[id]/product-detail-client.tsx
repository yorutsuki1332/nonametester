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
      <div className="product-detail-container" style={{ backgroundColor: '#fff', color: '#333333', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif' }}>
        <div style={{ fontSize: '18px', color: '#888' }}>商品不存在或已下架。</div>
      </div>
    );
  }

  const validImages = product.images ? product.images.filter(img => img && img.trim() !== '') : [];
  const hasImages = validImages.length > 0;
  const descText = product.description || "這件商品尚未提供詳細描述，但它絕對值得擁有！";

  return (
    <div style={{ backgroundColor: '#fff', color: '#333333', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      {/* 導覽列 */}
      <nav className="site-nav">
        <Link href="/" className="logo" style={{ fontSize: '20px', fontWeight: 'bold', letterSpacing: '2px', color: '#333', textDecoration: 'none', flexShrink: 0, paddingLeft: '25.5px' }}>
          LIGHTNING
        </Link>
        
        <div className="nav-search-container" style={{ flexGrow: '1', maxWidth: '400px', minWidth: '200px' }}>
          <input 
            type="text" 
            value={navSearch}
            onChange={(e) => setNavSearch(e.target.value)}
            onKeyPress={handleNavSearch}
            className="nav-search-input"
            style={{ border: '1px solid #f0f0f0', transition: 'all 0.3s' }}
            placeholder="🔍 搜尋商品名稱或分類..." 
          />
        </div>

        <div className="nav-right-group">
          <Link href="/" className="back-home-btn">
            <span>←</span> 返回首頁
          </Link>
        </div>
      </nav>

      {/* 主內容區 */}
      <main className="product-detail-container sm:flex-col">
        {/* 圖片展示區：使用 Next.js Image 優化載入速度 */}
        {hasImages ? (
          <div 
            style={{ position: 'relative', width: '450px', height: '500px', backgroundColor: '#f9f9f8', borderRadius: '10px', overflow: 'hidden', marginBottom: '15px', display: 'flex', justifyContent: 'center', touchAction: 'pan-y' }}
            onTouchStart={handleTouchStart}
            onTouchEnd={(e) => handleTouchEnd(validImages.length, e)}
          >
            {validImages.map((img, idx) => (
              <div 
                key={idx} 
                style={{position: 'absolute', width: '100%', height:  '100%', objectFit: 'cover', display: idx === activeSlideIndex ? 'block' : 'none'}}
              >
                <Image
                  src={img}
                  alt={product.name}
                  fill
                  loading={idx === 0 ? 'eager' : 'lazy'} // 第一張圖片優先載入（LCP 優化），解決載入慢的問題
                  sizes="(max-width: 768px) 100vw, 450px"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', backgroundColor: '#f9f9f8' }}
                />
              </div>
            ))}
            {validImages.length > 1 && (
              <>
                <button 
                  style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', left: '10px', background: 'rgba(0,0,0,0.4)', color: 'white', border: 'none', width: '30px', height: '30px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', zIndex: 5 }}
                  onClick={() => moveSlide(-1, validImages.length)}
                >
                  &#10094;
                </button>
                <button 
                  style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', right: '10px', background: 'rgba(0,0,0,0.4)', color: 'white', border: 'none', width: '30px', height: '30px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', zIndex: 5 }}
                  onClick={() => moveSlide( 1, validImages.length)}
                >
                  &#10095;
                </button>
                <div className="slider-dots">
                  {validImages.map((_, idx) => (
                    <span 
                      key={idx} 
                      style={{ width: idx === activeSlideIndex ? '16px' : '6px', height: '6px', borderRadius: idx === activeSlideIndex ? '3px' : '50%', background: idx === activeSlideIndex ? '#fff' : 'rgba(255,255,255,0.5)', cursor: 'pointer', transition: '0.3s' }} onClick={() => changeSlide(idx, validImages.length)} 
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="product-gallery-placeholder" style={{ width: '450px', height: '500px' }}>
            <span>{product.category || 'NO IMAGE'} 示意圖</span>
          </div>
        )}

        {/* 右側資訊區 */}
        <div className="product-info-wrapper">
          <div className="breadcrumbs">
            <button style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: '13px', marginBottom: '2px', padding: 0 }} onClick={() => router.push('/')}>首頁</button> / {product.category} / {product.name}
          </div>
          <h1 className="detail-name">{product.name}</h1>
          <h1 className="detail-sku">{product.id}</h1>
          <div className="detail-price">HKD {Number(product.price).toFixed(1)}</div>
          
          <div className="detail-description" style={{ height: '260px'}}>
            {descText}
          </div>
          
          <div className="quantity-action-container" style={{ display: 'flex', position: 'relative'}}>
            <div className="quantity-selector">
              <button type="button" className="qty-btn" onClick={() => updateQty(-1)}>-</button>
              <input type="number" value={quantity} readOnly className="qty-input" style={{ paddingLeft: '20px', textAlign: 'center' }} />
              <button type="button" className="qty-btn" onClick={() => updateQty(1)}>+</button>
            </div>
            <button 
              className="add-to-cart-huge"
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