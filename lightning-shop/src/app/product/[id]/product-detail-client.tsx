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
      <div className="product-detail-container" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: '18px', color: '#888' }}>商品不存在或已下架。</div>
      </div>
    );
  }

  const validImages = product.images ? product.images.filter(img => img && img.trim() !== '') : [];
  const hasImages = validImages.length > 0;
  const descText = product.description || "這件商品尚未提供詳細描述，但它絕對值得擁有！";

  return (
    <div style={{ backgroundColor: '#ffffff', color: '#333333', minHeight: '100vh' }}>
      {/* 導覽列 */}
      <nav className="site-nav">
        <Link href="/" className="logo">
          LIGHTNING
        </Link>
        
        <div className="nav-search-container">
          <input 
            type="text" 
            value={navSearch}
            onChange={(e) => setNavSearch(e.target.value)}
            onKeyPress={handleNavSearch}
            className="nav-search-input"
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
      <main className="product-detail-container">
        {/* 圖片展示區 (讀取 Vercel Blob 網址並由 Next.js Image 優化) */}
        {hasImages ? (
          <div 
            className="product-image-slider"
            onTouchStart={handleTouchStart}
            onTouchEnd={(e) => handleTouchEnd(validImages.length, e)}
          >
            {validImages.map((img, idx) => (
              <Image
                key={idx}
                src={img}
                alt={product.name}
                fill
                priority={idx === 0}
                sizes="(max-width: 768px) 100vw, 500px"
                style={{ 
                  objectFit: 'cover', 
                  display: idx === activeSlideIndex ? 'block' : 'none' 
                }}
              />
            ))}
            {validImages.length > 1 && (
              <>
                <button 
                  type="button"
                  className="slider-btn prev"
                  onClick={() => moveSlide(-1, validImages.length)}
                >
                  &#10094;
                </button>
                <button 
                  type="button"
                  className="slider-btn next"
                  onClick={() => moveSlide(1, validImages.length)}
                >
                  &#10095;
                </button>
                <div className="slider-dots">
                  {validImages.map((_, idx) => (
                    <span 
                      key={idx} 
                      className={`slider-dot ${idx === activeSlideIndex ? 'active' : ''}`}
                      onClick={() => changeSlide(idx, validImages.length)} 
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="product-gallery-placeholder">
            <span>{product.category || 'NO IMAGE'} 示意圖</span>
          </div>
        )}

        {/* 右側資訊區 */}
        <div className="product-info-wrapper">
          <div className="breadcrumbs">
            <button 
              type="button"
              style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: '13px', padding: 0 }} 
              onClick={() => router.push('/')}
            >
              首頁
            </button> / {product.category} / {product.name}
          </div>
          <h1 className="detail-name">{product.name}</h1>
          <div className="detail-sku">{product.id}</div>
          <div className="detail-price">HKD {Number(product.price).toFixed(1)}</div>
          
          <div className="detail-description">
            {descText}
          </div>
          
          <div className="quantity-action-container">
            <div className="quantity-selector">
              <button type="button" className="qty-btn" onClick={() => updateQty(-1)}>-</button>
              <input type="number" value={quantity} readOnly className="qty-input" />
              <button type="button" className="qty-btn" onClick={() => updateQty(1)}>+</button>
            </div>
            <button 
              type="button"
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