'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { db, auth } from '@/lib/firebase';
import firebase from 'firebase/compat/app';

interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  description?: string;
  images?: string[];
}

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

export default function ProductDetailClient({ 
  initialId,
  initialProduct 
}: { 
  initialId: string; 
  initialProduct: Product | null
}) {
  const router = useRouter();

  const [product] = useState<Product | null>(initialProduct);
  const [quantity, setQuantity] = useState(1);
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [navSearch, setNavSearch] = useState('');

  // 會員與收藏狀態
  const [currentUser, setCurrentUser] = useState<firebase.User | null>(null);
  const [currentAccountId, setCurrentAccountId] = useState('');
  const [isFavorited, setIsFavorited] = useState(false);

  // 吐司通知狀態
  const [toastMessage, setToastMessage] = useState('');
  const [isToastShow, setIsToastShow] = useState(false);

  const touchStartX = useRef(0);
  const touchStartY = useRef(0);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setIsToastShow(true);
    setTimeout(() => setIsToastShow(false), 2500);
  };

  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged(async (user) => {
      setCurrentUser(user);
      if (user) {
        try {
          const querySnapshot = await db.collection("users").where("uid", "==", user.uid).get();
          if (!querySnapshot.empty) {
            const userDoc = querySnapshot.docs[0];
            const accountId = userDoc.id;
            setCurrentAccountId(accountId);

            // 即時監聽該商品的收藏狀態
            if (initialId) {
              db.collection("users").doc(accountId).collection("favorites").doc(initialId)
                .onSnapshot((favDoc) => {
                  setIsFavorited(favDoc.exists);
                });
            }
          }
        } catch (e) {
          console.error("載入會員收藏狀態失敗", e);
        }
      } else {
        setCurrentAccountId('');
        setIsFavorited(false);
      }
    });

    return () => unsubscribeAuth();
  }, [initialId]);

  // 🌟 切換愛心收藏狀態
  const handleToggleFavorite = async () => {
    if (!currentUser || !currentAccountId) {
      alert('請先登入會員以使用收藏功能！');
      return;
    }
    if (!initialId) return;

    const favRef = db.collection("users").doc(currentAccountId).collection("favorites").doc(initialId);
    const doc = await favRef.get();

    if (doc.exists) {
      await favRef.delete();
      showToast('已取消收藏');
    } else {
      await favRef.set({
        productId: initialId,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      showToast('❤️ 已加入我的收藏');
    }
  };

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

    // 🌟 根據登入狀態決定對應的 localStorage Key，與首頁完全同步
    const cartKey = currentUser ? `villa_atelier_cart_${currentUser.uid}` : 'villa_atelier_cart_guest';
    
    let cart: CartItem[] = [];
    try {
      const savedCart = localStorage.getItem(cartKey);
      if (savedCart) {
        const parsed: unknown = JSON.parse(savedCart);
        if (Array.isArray(parsed)) cart = parsed as CartItem[];
      }
    } catch {
      cart = [];
    }

    const item = cart.find((x) => x.id === product.id);
    if (item) {
      item.quantity += quantity;
    } else {
      cart.push({ 
        id: product.id, 
        name: product.name, 
        price: Number(product.price), 
        quantity 
      });
    }

    localStorage.setItem(cartKey, JSON.stringify(cart));
    showToast(`已將「${product.name}」放入購物車`);
    
    setTimeout(() => {
      router.push('/');
    }, 1000);
  };

  if (!product) {
    return (
      <div className="bg-[#FAF7F2] text-[#382E2B] min-h-screen flex items-center justify-center font-sans">
        <div className="text-[18px] text-[#7A6E65]">選品不存在或已下架。</div>
      </div>
    );
  }

  const validImages = product.images 
    ? product.images.filter(img => img && typeof img === 'string' && img.trim() !== '') 
    : [];
  const hasImages = validImages.length > 0;
  const descText = product.description || "這件選品尚未提供詳細描述，但它絕對值得擁有！";

  return (
    <div className="bg-[#FAF7F2] text-[#382E2B] min-h-screen font-sans">
      {/* 導覽列 */}
      <nav className="fixed top-0 left-0 w-full bg-[#FAF7F2]/98 backdrop-blur-sm flex flex-col md:flex-row justify-between items-center py-3 md:py-0 px-[5%] z-1000 border-b border-[#EBE5DF] gap-3 md:h-18.75">
        <div className="w-full md:w-auto flex justify-between items-center">
          <Link href="/" className="text-[18px] font-bold tracking-[3px] uppercase text-[#B35B48] no-underline">
            VILLA ATELIER
          </Link>
          <div className="flex md:hidden items-center">
            <Link href="/" className="flex items-center gap-1.5 text-[13px] font-medium text-[#382E2B] py-1.5 px-3 rounded-[20px] bg-[#F4F0EA] border border-[#EBE5DF] no-underline whitespace-nowrap">
              <span>←</span> 返回首頁
            </Link>
          </div>
        </div>
        
        <div className="w-full md:grow md:max-w-100 md:min-w-37.5">
          <input 
            type="text" 
            value={navSearch}
            onChange={(e) => setNavSearch(e.target.value)}
            onKeyDown={handleNavSearch}
            className="w-full py-2 px-4.5 border border-[#EBE5DF] rounded-[20px] text-[13px] outline-none bg-white transition focus:border-[#B35B48]"
            placeholder="🔍 搜尋選品名稱或分類..." 
          />
        </div>

        <div className="hidden md:flex items-center gap-3.75 shrink-0">
          <Link href="/" className="flex items-center gap-1.5 text-[13px] font-medium cursor-pointer text-[#382E2B] py-2 px-3.5 rounded-[20px] bg-[#F4F0EA] border border-[#EBE5DF] no-underline transition hover:bg-[#B35B48] hover:text-white whitespace-nowrap">
            <span>←</span> 返回首頁
          </Link>
        </div>
      </nav>

      {/* 主內容區 */}
      <main className="max-w-275 mx-auto pt-33.75 md:pt-26.25 pb-15 px-[5%] grid grid-cols-1 md:grid-cols-2 gap-10">
        {/* 圖片展示區 */}
        {hasImages ? (
          <div 
            className="relative w-full h-87.5 md:h-125 bg-[#F4F0EA] rounded-2xl overflow-hidden flex items-center justify-center touch-pan-y group border border-[#EBE5DF]"
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
                  className="absolute top-1/2 -translate-y-1/2 left-3.75 bg-[#382E2B]/60 text-white border-none w-9 h-9 rounded-full cursor-pointer flex items-center justify-center text-[16px] opacity-80 md:opacity-50 md:group-hover:opacity-100 transition duration-300 z-5 hover:bg-[#382E2B]"
                  onClick={() => moveSlide(-1, validImages.length)}
                >
                  &#10094;
                </button>
                <button 
                  type="button"
                  className="absolute top-1/2 -translate-y-1/2 right-3.75 bg-[#382E2B]/60 text-white border-none w-9 h-9 rounded-full cursor-pointer flex items-center justify-center text-[16px] opacity-80 md:opacity-50 md:group-hover:opacity-100 transition duration-300 z-5 hover:bg-[#382E2B]"
                  onClick={() => moveSlide(1, validImages.length)}
                >
                  &#10095;
                </button>
                <div className="absolute bottom-3.75 left-1/2 -translate-x-1/2 flex gap-1.5 z-5">
                  {validImages.map((_, idx) => (
                    <span 
                      key={idx} 
                      className={`h-2 rounded-full cursor-pointer transition-all duration-300 ${idx === activeSlideIndex ? 'bg-[#B35B48] w-5 rounded-sm' : 'bg-[#EBE5DF] w-2'}`}
                      onClick={() => changeSlide(idx, validImages.length)} 
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="relative w-full h-87.5 md:h-125 bg-[#F4F0EA] border border-[#EBE5DF] rounded-2xl overflow-hidden flex flex-col items-center justify-center gap-3 text-[#8C7B70]">
            <span className="text-[40px]">{product.category === 'BAGS' ? '👜' : product.category === 'ACCESSORY' ? '💍' : product.category === 'DAILY WEAR' ? '👕' : '✨'}</span>
            <span className="text-[15px] px-6 text-center">{product.name}</span>
          </div>
        )}

        {/* 右側資訊區 */}
        <div className="py-2.5 flex flex-col justify-center">
          <div className="text-[13px] text-[#7A6E65] mb-3">
            <button 
              type="button"
              className="bg-transparent border-none text-[#7A6E65] cursor-pointer text-[13px] p-0 hover:underline" 
              onClick={() => router.push('/')}
            >
              首頁
            </button> / {product.category} / {product.name}
          </div>

          {/* 🌟 標題與愛心收藏按鈕 */}
          <div className="flex justify-between items-start gap-4 mb-3">
            <h1 className="text-[24px] md:text-[28px] font-serif font-semibold leading-[1.3] text-[#382E2B]">{product.name}</h1>
            <button 
              type="button"
              onClick={handleToggleFavorite}
              className="w-9 h-9 bg-white rounded-full flex items-center justify-center shrink-0 border border-[#EBE5DF] transition hover:scale-110 cursor-pointer shadow-xs"
              title={isFavorited ? '取消收藏' : '加入收藏'}
            >
              <span className={`text-[16px] transition ${isFavorited ? 'text-[#B35B48] scale-110' : 'text-stone-300 hover:text-stone-500'}`}>
                {isFavorited ? '♥' : '♡'}
              </span>
            </button>
          </div>

          <div className="text-[20px] md:text-[22px] font-semibold font-mono text-[#B35B48] mb-3.75">HKD {Number(product.price).toFixed(1)}</div>
          
          <div className="text-[14px] text-[#6E6058] mb-5 whitespace-pre-wrap leading-[1.8] max-h-none md:h-62.5 md:max-h-62.5 overflow-y-auto pr-2">
            {descText}
          </div>
          
          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3.75 mt-5 mb-3">
            <div className="flex items-center justify-center border border-[#EBE5DF] rounded-xl overflow-hidden bg-white">
              <button type="button" className="bg-transparent border-none py-3 px-4 text-[16px] cursor-pointer text-[#382E2B] transition hover:bg-[#F4F0EA]" onClick={() => updateQty(-1)}>-</button>
              <input type="number" value={quantity} readOnly className="w-12.5 md:pl-5 text-center border-none bg-transparent text-[15px] font-semibold font-mono outline-none text-[#382E2B]" />
              <button type="button" className="bg-transparent border-none py-3 px-4 text-[16px] cursor-pointer text-[#382E2B] transition hover:bg-[#F4F0EA]" onClick={() => updateQty(1)}>+</button>
            </div>
            <button 
              type="button"
              className="grow bg-[#B35B48] text-white p-4 border-none rounded-xl text-[15px] font-semibold cursor-pointer transition hover:bg-[#9B4C3A] hover:-translate-y-0.5 hover:shadow-[0_10px_20px_rgba(179,91,72,0.2)] shadow-xs"
              onClick={addToCart}
            >
              加入購物車
            </button>
          </div>
        </div>
      </main>

      {/* 吐司通知 */}
      <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 bg-[#382E2B] text-[#FAF7F2] px-6 py-3 rounded-full text-[13px] font-medium z-5000 transition-transform duration-500 shadow-md ${isToastShow ? 'translate-y-0' : 'translate-y-[300%]'}`}>
        {toastMessage}
      </div>
    </div>
  );
}