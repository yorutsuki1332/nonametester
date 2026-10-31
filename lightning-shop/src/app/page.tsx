'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { db, auth } from '@/lib/firebase';
import firebase from 'firebase/compat/app';

interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  tag?: string;
  images?: string[];
  description?: string;
}

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

interface Coupon {
  id: string;
  code: string;
  discountText: string;
  minSpend: number;
  discountType: 'fixed' | 'percent';
  discountValue: number;
  usesLeft: number;
  conditionType?: 'infinite' | 'counts' | 'periods';
  startTime?: string | null;
  endTime?: string | null;
}

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [searchKeyword, setSearchKeyword] = useState('');
  
  // 互動狀態
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  
  // 折扣券與購物金狀態
  const [selectedCoupon, setSelectedCoupon] = useState<Coupon | null>(null);
  const [availableCoupons, setAvailableCoupons] = useState<Coupon[]>([]);
  const [userStoreCredit, setUserStoreCredit] = useState<number>(0);
  const [useCredit, setUseCredit] = useState<boolean>(false);

  // 會員表單
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [authAccountId, setAuthAccountId] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [currentAccountId, setCurrentAccountId] = useState('');

  // 提示訊息
  const [toastMessage, setToastMessage] = useState('');
  const [isToastShow, setIsToastShow] = useState(false);

  // 圖片輪播
  const [sliderIndexes, setSliderIndexes] = useState<{ [key: string]: number }>({});
  
  // 結帳表單
  const [shippingName, setShippingName] = useState('');
  const [shippingEmail, setShippingEmail] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvc, setCardCvc] = useState('');
  const [isPaying, setIsPaying] = useState(false);

  // 手機滑動紀錄
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);

  useEffect(() => {
    const savedCart = localStorage.getItem('lightning_life_cart');
    if (savedCart) {
      try { setCart(JSON.parse(savedCart)); } catch (e) {}
    }

    const unsubscribeProducts = db.collection("products").orderBy("createdAt", "desc").onSnapshot((snapshot) => {
      const list: Product[] = [];
      snapshot.forEach((doc) => {
        const { id, ...data } = doc.data() as any;
        list.push({ id: doc.id, ...data });
      });
      setProducts(list);
      setFilteredProducts(list);
    });

    // 前台優惠券即時監聽：自動過濾掉未生效或已過期的期間優惠券
    const unsubscribeCoupons = db.collection("coupons")
      .where("usesLeft", ">", 0)
      .onSnapshot((snapshot) => {
        const list: Coupon[] = [];
        const now = new Date().getTime();

        snapshot.forEach((doc) => {
          const { id, ...data } = doc.data() as any;
          const coupon = { id: doc.id, ...data } as Coupon;

          if (coupon.conditionType === 'periods' && coupon.startTime && coupon.endTime) {
            const start = new Date(coupon.startTime).getTime();
            const end = new Date(coupon.endTime).getTime();
            if (now >= start && now <= end) {
              list.push(coupon);
            }
          } else {
            list.push(coupon);
          }
        });
        setAvailableCoupons(list);
      }, (err) => {
        console.error("Coupons fetch error:", err);
      });

    const unsubscribeAuth = auth.onAuthStateChanged(async (user) => {
      setCurrentUser(user);
      if (user) {
        try {
          const querySnapshot = await db.collection("users").where("uid", "==", user.uid).get();
          if (!querySnapshot.empty) {
            const doc = querySnapshot.docs[0];
            setCurrentAccountId(doc.id);
            setUserStoreCredit(doc.data().storeCredit || 0);
          } else {
            setCurrentAccountId('會員');
            setUserStoreCredit(0);
          }
        } catch (e) {
          setCurrentAccountId('會員');
          setUserStoreCredit(0);
        }
      } else {
        setCurrentAccountId('');
        setUserStoreCredit(0);
      }
    });

    return () => {
      unsubscribeProducts();
      unsubscribeCoupons();
      unsubscribeAuth();
    };
  }, []);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const keyword = e.target.value;
    setSearchKeyword(keyword);
    const lower = keyword.trim().toLowerCase();

    if (!lower) {
      setFilteredProducts(products);
      return;
    }

    const filtered = products.filter(p => {
      const nameMatch = p.name && p.name.toLowerCase().includes(lower);
      const catMatch = p.category && p.category.toLowerCase().includes(lower);
      return nameMatch || catMatch;
    });
    setFilteredProducts(filtered);
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setIsToastShow(true);
    setTimeout(() => setIsToastShow(false), 2500);
  };

  const saveCartToStorage = (newCart: CartItem[]) => {
    setCart(newCart);
    localStorage.setItem('lightning_life_cart', JSON.stringify(newCart));
  };

  const addToCart = (productId: string) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    const existing = cart.find(item => item.id === productId);
    let updatedCart;
    if (existing) {
      updatedCart = cart.map(item => item.id === productId ? { ...item, quantity: item.quantity + 1 } : item);
    } else {
      updatedCart = [...cart, { id: product.id, name: product.name, price: Number(product.price), quantity: 1 }];
    }
    saveCartToStorage(updatedCart);
    showToast(`已將「${product.name}」放入購物車`);
  };

  const updateQuantity = (productId: string, change: number) => {
    const updated = cart.map(item => {
      if (item.id === productId) {
        return { ...item, quantity: item.quantity + change };
      }
      return item;
    }).filter(item => item.quantity > 0);
    saveCartToStorage(updated);
  };

  const removeFromCart = (productId: string) => {
    const updated = cart.filter(item => item.id !== productId);
    saveCartToStorage(updated);
  };

  // 計算小計、折扣券與購物金折抵邏輯
  const currentSubtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  
  const calculateDiscount = () => {
    if (!selectedCoupon) return 0;
    
    if (selectedCoupon.conditionType === 'periods' && selectedCoupon.startTime && selectedCoupon.endTime) {
      const now = new Date().getTime();
      const start = new Date(selectedCoupon.startTime).getTime();
      const end = new Date(selectedCoupon.endTime).getTime();
      if (now < start || now > end) return 0;
    }

    if (currentSubtotal < selectedCoupon.minSpend) return 0;
    
    if (selectedCoupon.discountType === 'fixed') {
      return Math.min(currentSubtotal, selectedCoupon.discountValue);
    } else if (selectedCoupon.discountType === 'percent') {
      return currentSubtotal * (1 - selectedCoupon.discountValue);
    }
    return 0;
  };

  const discountAmount = calculateDiscount();
  const subtotalAfterCoupon = Math.max(0, currentSubtotal - discountAmount);
  
  // 購物金折抵計算
  const creditToDeduct = useCredit ? Math.min(subtotalAfterCoupon, userStoreCredit) : 0;
  const finalTotal = Math.max(0, subtotalAfterCoupon - creditToDeduct);

  const changeSlide = (productId: string, index: number, validLength: number) => {
    const targetIndex = (index + validLength) % validLength;
    setSliderIndexes(prev => ({ ...prev, [productId]: targetIndex }));
  };

  const moveSlide = (productId: string, direction: number, validLength: number) => {
    const currentIndex = sliderIndexes[productId] || 0;
    changeSlide(productId, currentIndex + direction, validLength);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (productId: string, e: React.TouchEvent, validLength: number) => {
    const diffX = e.changedTouches[0].clientX - touchStartX.current;
    const diffY = e.changedTouches[0].clientY - touchStartY.current;

    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 30) {
      if (diffX < 0) {
        moveSlide(productId, 1, validLength);
      } else {
        moveSlide(productId, -1, validLength);
      }
    }
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isRegisterMode) {
        const docRef = db.collection("users").doc(authAccountId);
        const docSnap = await docRef.get();
        if (docSnap.exists) {
          alert('此帳戶 ID 已經被註冊，請選擇其他 ID。');
          return;
        }

        const userCred = await auth.createUserWithEmailAndPassword(authEmail, authPassword);
        await docRef.set({
          accountId: authAccountId,
          email: authEmail,
          uid: userCred.user?.uid,
          storeCredit: 0,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        try {
          await fetch('/api/send-welcome', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: authEmail, accountId: authAccountId })
          });
        } catch (emailErr) {
          console.error('歡迎信發送請求失敗:', emailErr);
        }

        showToast('註冊成功並已自動登入！歡迎信已發送');
        setIsAuthOpen(false);
      } else {
        const docRef = db.collection("users").doc(authAccountId);
        const docSnap = await docRef.get();
        if (!docSnap.exists) {
          alert('找不到此帳戶 ID，請確認是否輸入正確。');
          return;
        }
        const email = docSnap.data()?.email;
        await auth.signInWithEmailAndPassword(email, authPassword);
        showToast('登入成功！');
        setIsAuthOpen(false);
      }
    } catch (error: any) {
      alert('操作失敗： ' + error.message);
    }
  };

  const handleLogout = () => {
    auth.signOut().then(() => showToast('已成功登出'));
  };

  const handleExpiryInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, '');
    if (val.length > 2) {
      val = val.substring(0, 2) + '/' + val.substring(2, 4);
    }
    setCardExpiry(val);
  };

  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return alert('購物車是空的！');

    if (selectedCoupon && calculateDiscount() === 0 && selectedCoupon.discountValue > 0) {
      alert('您選擇的優惠券已過期或不符合條件，請重新選擇！');
      return;
    }

    setIsPaying(true);
    try {
      const now = new Date();
      const prefix = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
      
      const querySnapshot = await db.collection("orders").get();
      let maxIndex = 0;
      querySnapshot.forEach((doc) => {
        const orderId = doc.id;
        if (orderId && orderId.startsWith(prefix)) {
          const suffix = parseInt(orderId.slice(6), 10);
          if (!isNaN(suffix) && suffix > maxIndex) maxIndex = suffix;
        }
      });

      const customOrderId = `${prefix}${String(maxIndex + 1).padStart(3, '0')}`;

      const orderData = {
        name: shippingName.trim(),
        email: shippingEmail.trim(),
        address: shippingAddress.trim(),
        items: cart,
        subtotal: currentSubtotal,
        discount: discountAmount,
        creditDeducted: creditToDeduct,
        couponCode: selectedCoupon ? selectedCoupon.code : null,
        total: finalTotal,
        status: 'pending',
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      };

      await db.collection("orders").doc(customOrderId).set(orderData);

      // 🌟 1. 扣減優惠券次數（僅針對「有限次數 counts」類型的優惠券扣減，期間優惠與永久有效不扣減）
      if (selectedCoupon && selectedCoupon.conditionType === 'counts') {
        try {
          const couponRef = db.collection("coupons").doc(selectedCoupon.code);
          const couponDoc = await couponRef.get();
          if (couponDoc.exists) {
            const currentUses = couponDoc.data()?.usesLeft || 1;
            if (currentUses > 1) {
              await couponRef.update({ usesLeft: currentUses - 1 });
            } else {
              await couponRef.update({ usesLeft: 0 });
            }
          }
        } catch (couponErr) {
          console.error('優惠券次數扣減失敗:', couponErr);
        }
      }

      // 2. 扣減會員購物金並新增 Log
      if (useCredit && creditToDeduct > 0 && currentAccountId && currentUser) {
        try {
          const userRef = db.collection("users").doc(currentAccountId);
          const userDoc = await userRef.get();
          if (userDoc.exists) {
            const currentCredit = userDoc.data()?.storeCredit || 0;
            const updatedCredit = Math.max(0, currentCredit - creditToDeduct);
            
            await userRef.update({ storeCredit: updatedCredit });
            setUserStoreCredit(updatedCredit);

            await userRef.collection("credit_logs").add({
              type: 'use',
              amount: creditToDeduct,
              reason: `訂單 #${customOrderId} 結帳折抵`,
              createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
          }
        } catch (creditErr) {
          console.error('購物金扣減失敗:', creditErr);
        }
      }

      try {
        await fetch('/api/send-order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
            email: shippingEmail.trim(),
            orderId: customOrderId,
            total: finalTotal,
            items: cart
          })
        });
      } catch (emailErr) {
        console.error('訂單確認信發送請求失敗:', emailErr);
      }

      setTimeout(() => {
        alert(`🎉 付款成功！\n\n感謝您的購買，您的訂單編號為：${customOrderId}\n總計支付：HKD $${finalTotal.toFixed(1)}`);
        saveCartToStorage([]);
        setSelectedCoupon(null);
        setUseCredit(false);
        setIsPaymentOpen(false);
        setIsPaying(false);
      }, 1500);
    } catch (error: any) {
      alert('訂單建立失敗： ' + error.message);
      setIsPaying(false);
    }
  };

  const totalCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const isAnyModalOpen = isCartOpen || isAuthOpen || isPaymentOpen;

  return (
    <div className="bg-white text-[#333333] min-h-screen overflow-x-hidden font-sans">
      {/* 導覽列 */}
      <nav className="fixed top-0 left-0 w-full h-18.75 bg-white/95 backdrop-blur-sm flex justify-between items-center px-[6%] z-1000 border-b border-[#f0f0f0]">
        <div className="text-[20px] font-bold tracking-[2px] uppercase">LIGHTNING</div>
        <div className="flex items-center gap-5">
          <Link 
            href={currentUser ? "/account" : "#"}
            className="text-[13px] font-medium cursor-pointer text-[#333] py-1.5 px-3 rounded-md bg-[#fafafa] border border-[#f0f0f0] transition hover:bg-[#FEF9C3]"
            onClick={(e) => {
              if (!currentUser) {
                e.preventDefault();
                setIsAuthOpen(true);
              }
            }}
          >
            {currentUser ? `👤 會員中心 (${currentAccountId})` : '會員登入 / 註冊'}
            {currentUser && (
              <span 
                className="text-[#888] text-[11px] ml-1.5 hover:text-red-500" 
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleLogout(); }}
              >
                (登出)
              </span>
            )}
          </Link>

          <div className="cursor-pointer relative p-1.5 flex items-center" onClick={() => setIsCartOpen(true)}>
            <svg className="w-5.5 h-5.5 fill-none stroke-[#333] stroke-[1.5]" viewBox="0 0 24 24">
              <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <path d="M16 10a4 4 0 0 1-8 0"></path>
            </svg>
            <div className="absolute -top-1 -right-1.5 bg-[#FEF9C3] text-[#333] text-[11px] font-semibold w-4.5 h-4.5 rounded-full flex justify-center items-center">
              {totalCount}
            </div>
          </div>
        </div>
      </nav>

      {/* 背景遮罩 */}
      <div className={`fixed inset-0 bg-white/60 backdrop-blur-[3px] z-1500 transition-all duration-400 ${isAnyModalOpen ? 'opacity-100 visible' : 'opacity-0 invisible'}`} onClick={() => { setIsCartOpen(false); setIsAuthOpen(false); setIsPaymentOpen(false); }} />

      {/* 會員登入/註冊 Modal */}
      <div className={`fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 scale-[0.95] w-[90%] max-w-125 max-h-[85vh] bg-white rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.1)] z-2500 transition-all duration-400 flex flex-col overflow-hidden ${isAuthOpen ? 'opacity-100 visible scale-100' : 'opacity-0 invisible'}`}>
        <div className="p-6.25 border-b border-[#f0f0f0] flex justify-between items-center bg-[#fafafa]">
          <h2 className="text-[18px] font-semibold">{isRegisterMode ? '註冊新會員' : '會員登入'}</h2>
          <button className="bg-none border-none text-[26px] cursor-pointer text-[#888]" onClick={() => setIsAuthOpen(false)}>&times;</button>
        </div>
        <div className="p-6.25 max-h-[70vh] overflow-y-auto">
          <form onSubmit={handleAuthSubmit}>
            <div className="mb-5">
              <label className="block text-[13px] font-semibold mb-2 text-[#555]">帳戶 ID</label>
              <input type="text" value={authAccountId} onChange={(e) => setAuthAccountId(e.target.value)} className="w-full p-3 border border-[#ddd] rounded-lg text-[14px] outline-none transition focus:border-[#111] focus:ring-2 focus:ring-black/10" placeholder="例如：john123" required />
            </div>
            {isRegisterMode && (
              <div className="mb-5">
                <label className="block text-[13px] font-semibold mb-2 text-[#555]">電子郵件 (接收訂單通知)</label>
                <input type="email" value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} className="w-full p-3 border border-[#ddd] rounded-lg text-[14px] outline-none transition focus:border-[#111] focus:ring-2 focus:ring-black/10" placeholder="example@email.com" required />
              </div>
            )}
            <div className="mb-5">
              <label className="block text-[13px] font-semibold mb-2 text-[#555]">密碼 (至少 6 位數)</label>
              <input type="password" value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} className="w-full p-3 border border-[#ddd] rounded-lg text-[14px] outline-none transition focus:border-[#111] focus:ring-2 focus:ring-black/10" placeholder="請輸入密碼" required minLength={6} />
            </div>
            <button type="submit" className="w-full bg-[#FEF9C3] text-[#111] p-4 border-none rounded-lg text-[15px] font-semibold cursor-pointer transition hover:bg-[#f0e9aa] hover:-translate-y-0.5 mt-2.5">
              {isRegisterMode ? '立即註冊' : '登入系統'}
            </button>
          </form>
          <div className="text-center mt-4 text-[13px]">
            <span className="text-[#888]">{isRegisterMode ? '已經有帳號了？' : '還沒有帳號？'}</span>
            <button onClick={() => setIsRegisterMode(!isRegisterMode)} className="text-[#111] font-semibold underline ml-1.5 bg-none border-none cursor-pointer">
              {isRegisterMode ? '點此登入' : '點此註冊'}
            </button>
          </div>
        </div>
      </div>

      {/* 頂部 Hero 與搜尋 */}
      <div className="pt-25 px-[4%] max-w-350 mx-auto">
        <header className="h-[35vh] bg-[#FEF9C3] rounded-2xl flex flex-col justify-center items-center text-center px-5">
          <h1 className="text-[36px] font-semibold tracking-[4px] mb-3.5">日常的美好，源於細節</h1>
          <p className="text-[14px] text-[#555] tracking-[2px]">輕巧點綴你的每一天，展現毫不費力的生活美學。</p>
        </header>
        <div className="max-w-150 mx-auto mt-7.5 px-[4%]">
          <input 
            type="text" 
            value={searchKeyword}
            onChange={handleSearch}
            className="w-full py-3.5 px-5 border border-[#f0f0f0] rounded-[30px] text-[14px] outline-none bg-[#fafafa] transition shadow-[0_2px_10px_rgba(0,0,0,0.02)] focus:border-[#111] focus:bg-white focus:shadow-[0_4px_15px_rgba(0,0,0,0.05)]"
            placeholder="🔍 搜尋商品名稱或分類..." 
          />
        </div>
      </div>

      {/* 商品列表 */}
      <main className="max-w-300 my-10 mx-auto px-[4%]">
        <h2 className="text-[20px] font-semibold tracking-[2px] mb-10 text-center">全站商品 / ALL ITEMS</h2>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-[50px_30px]">
          {filteredProducts.length === 0 ? (
            <p className="text-center text-[#999] col-span-full py-10">沒有找到符合條件的商品。</p>
          ) : (
            filteredProducts.map(p => {
              const validImages = p.images ? p.images.filter(img => img && img.trim() !== '') : [];
              const hasImages = validImages.length > 0;
              const activeIdx = sliderIndexes[p.id] || 0;

              return (
                <div key={p.id} className="bg-white transition duration-400 flex flex-col rounded-[10px] relative hover:-translate-y-2 group">
                  {p.tag && (
                    <div className={`absolute top-3.75 left-3.75 text-white text-[10px] font-extrabold py-1 px-2.5 z-10 rounded ${p.tag.toLowerCase() === 'hot' ? 'bg-[#ff6b6b]' : 'bg-[#111]'}`}>
                      {p.tag}
                    </div>
                  )}

                  <Link href={`/product/${p.id}`} className="no-underline text-inherit block grow">
                    <div 
                      className="relative w-full h-85 bg-[#f9f9f8] rounded-[10px] overflow-hidden mb-3.75 flex items-center justify-center touch-pan-y"
                      onTouchStart={handleTouchStart}
                      onTouchEnd={(e) => handleTouchEnd(p.id, e, validImages.length)}
                    >
                      {hasImages ? (
                        <>
                          {validImages.map((img, idx) => (
                            idx === activeIdx && (
                              <div key={idx} className="relative w-full h-full">
                                <Image 
                                  src={img}
                                  alt={p.name}
                                  fill
                                  sizes="(max-width: 768px) 100vw, 300px"
                                  className="object-cover"
                                  priority={idx === 0}
                                />
                              </div>
                            )
                          ))}
                          {validImages.length > 1 && (
                            <>
                              <button className="absolute top-1/2 -translate-y-1/2 left-2.5 bg-black/40 text-white border-none w-7.5 h-7.5 rounded-full cursor-pointer flex items-center justify-center text-[14px] opacity-0 hover:bg-black/70 transition duration-300 z-5 group-hover:opacity-100" onClick={(e) => { e.preventDefault(); moveSlide(p.id, -1, validImages.length); }}>&#10094;</button>
                              <button className="absolute top-1/2 -translate-y-1/2 right-2.5 bg-black/40 text-white border-none w-7.5 h-7.5 rounded-full cursor-pointer flex items-center justify-center text-[14px] opacity-0 hover:bg-black/70 transition duration-300 z-5 group-hover:opacity-100" onClick={(e) => { e.preventDefault(); moveSlide(p.id, 1, validImages.length); }}>&#10095;</button>
                              <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex gap-1.5 z-5">
                                {validImages.map((_, idx) => (
                                  <span key={idx} className={`h-1.5 rounded-full cursor-pointer transition-all duration-300 ${idx === activeIdx ? 'bg-white w-4' : 'bg-white/50 w-1.5'}`} onClick={(e) => { e.preventDefault(); changeSlide(p.id, idx, validImages.length); }} />
                                ))}
                              </div>
                            </>
                          )}
                        </>
                      ) : (
                        <span className="text-[13px] text-[#888]">{p.category || 'NO IMAGE'}</span>
                      )}
                    </div>
                    <div className="flex flex-col grow px-1.25">
                      <h3 className="text-[15px] font-medium mb-2.5 text-[#333]">{p.name}</h3>
                      <div className="text-[15px] font-semibold mb-3.5">HKD {Number(p.price).toFixed(1)}</div>
                    </div>
                  </Link>

                  <button className="w-full bg-transparent border border-[#e5e5e5] rounded-[10px] py-3 text-[13px] cursor-pointer transition duration-400 hover:bg-[#FEF9C3] hover:border-[#FEF9C3]" onClick={() => addToCart(p.id)}>
                    加入購物車
                  </button>
                </div>
              );
            })
          )}
        </div>
      </main>

      {/* 購物車抽屜 (含折扣券與購物金折抵) */}
      <div className={`fixed top-0 right-0 w-100 max-w-full h-full bg-white shadow-[-5px_0_30px_rgba(0,0,0,0.05)] z-2000 transition-transform duration-400 flex flex-col ${isCartOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="p-[30px_25px] border-b border-[#f0f0f0] flex justify-between items-center">
          <h2 className="text-[18px] font-semibold">購物車清單 ({totalCount})</h2>
          <button className="bg-none border-none text-[26px] cursor-pointer text-[#888]" onClick={() => setIsCartOpen(false)}>&times;</button>
        </div>
        
        <div className="grow overflow-y-auto p-6.25">
          {cart.length === 0 ? (
            <p className="text-center text-[#aaa] mt-12.5">購物車目前是空的喔</p>
          ) : (
            cart.map(item => (
              <div key={item.id} className="flex gap-3.75 mb-6.25 items-center">
                <div className="w-15 h-17.5 bg-[#f9f9f8] rounded-md flex justify-center items-center text-[11px]">ITEM</div>
                <div className="grow">
                  <div className="text-[13px] font-medium mb-1">{item.name}</div>
                  <div className="text-[13px] font-semibold mb-2.5">HKD {Number(item.price).toFixed(1)}</div>
                  <div className="flex items-center gap-3">
                    <button className="bg-[#f5f5f5] border-none rounded-full w-6 h-6 cursor-pointer flex items-center justify-center" onClick={() => updateQuantity(item.id, -1)}>-</button>
                    <span className="text-[13px]">{item.quantity}</span>
                    <button className="bg-[#f5f5f5] border-none rounded-full w-6 h-6 cursor-pointer flex items-center justify-center" onClick={() => updateQuantity(item.id, 1)}>+</button>
                    <button className="bg-none border-none text-[#b0b0b0] text-[12px] cursor-pointer ml-auto" onClick={() => removeFromCart(item.id)}>移除</button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {cart.length > 0 && (
          <div className="p-6.25 border-t border-[#f0f0f0] bg-[#fafafa]">
            {/* 折扣券選擇 */}
            <div className="mb-3">
              <label className="block text-[12px] font-semibold text-[#666] mb-1.5">選擇適用折扣券</label>
              <select 
                className="w-full p-2.5 bg-white border border-[#ddd] rounded-lg text-[13px] outline-none cursor-pointer focus:border-[#111]"
                value={selectedCoupon ? selectedCoupon.code : ''}
                onChange={(e) => {
                  const found = availableCoupons.find(c => c.code === e.target.value);
                  setSelectedCoupon(found || null);
                }}
              >
                <option value="">-- 不使用折扣券 --</option>
                {availableCoupons.map(coupon => {
                  const isEligible = currentSubtotal >= coupon.minSpend;
                  const isPeriod = coupon.conditionType === 'periods';
                  return (
                    <option key={coupon.id} value={coupon.code} disabled={!isEligible}>
                      {coupon.discountText} ({isPeriod ? '期間不限次數' : `剩餘 ${coupon.usesLeft} 次`}) {!isEligible ? `[滿 $${coupon.minSpend} 可用]` : ''}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* 購物金勾選折抵 (僅登入時顯示) */}
            {currentUser && userStoreCredit > 0 && (
              <div className="mb-4 p-3 bg-amber-50/60 border border-amber-200 rounded-lg flex items-center justify-between text-xs">
                <label className="flex items-center gap-2 cursor-pointer font-medium text-stone-800">
                  <input 
                    type="checkbox" 
                    checked={useCredit} 
                    onChange={(e) => setUseCredit(e.target.checked)}
                    className="w-4 h-4 rounded border-amber-300 accent-stone-900 cursor-pointer"
                  />
                  使用購物金折抵 (可用 HKD ${userStoreCredit})
                </label>
              </div>
            )}

            <div className="flex justify-between mb-2 text-[13px] text-[#666]">
              <span>商品小計</span>
              <span>HKD {Number(currentSubtotal).toFixed(1)}</span>
            </div>

            {discountAmount > 0 && (
              <div className="flex justify-between mb-2 text-[13px] text-emerald-600 font-medium">
                <span>折扣優惠 ({selectedCoupon?.code})</span>
                <span>- HKD {Number(discountAmount).toFixed(1)}</span>
              </div>
            )}

            {creditToDeduct > 0 && (
              <div className="flex justify-between mb-2 text-[13px] text-amber-700 font-medium">
                <span>購物金折抵</span>
                <span>- HKD {Number(creditToDeduct).toFixed(1)}</span>
              </div>
            )}

            <div className="flex justify-between mb-5 pt-3 border-t border-[#e5e5e5] text-[16px] font-semibold text-[#111]">
              <span>訂單總計</span>
              <span>HKD {Number(finalTotal).toFixed(1)}</span>
            </div>

            <button 
              className="w-full bg-[#111] text-white border-none rounded-[10px] p-4 cursor-pointer text-[14px] transition hover:bg-[#333]" 
              onClick={() => { setIsCartOpen(false); setIsPaymentOpen(true); }}
            >
              前往結帳 Checkout
            </button>
          </div>
        )}
      </div>

      {/* 結帳 Modal */}
      <div className={`fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 scale-[0.95] w-[90%] max-w-125 max-h-[85vh] bg-white rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.1)] z-2500 transition-all duration-400 flex flex-col overflow-hidden ${isPaymentOpen ? 'opacity-100 visible scale-100' : 'opacity-0 invisible'}`}>
        <div className="p-6.25 border-b border-[#f0f0f0] flex justify-between items-center bg-[#fafafa]">
          <h2 className="text-[18px] font-semibold">安全結帳</h2>
          <button className="bg-none border-none text-[26px] cursor-pointer text-[#888]" onClick={() => setIsPaymentOpen(false)}>&times;</button>
        </div>
        <div className="p-6.25 max-h-[70vh] overflow-y-auto">
          <form onSubmit={handleCheckoutSubmit}>
            <div className="mb-5">
              <label className="block text-[13px] font-semibold mb-2 text-[#555]">收件人姓名</label>
              <input type="text" value={shippingName} onChange={(e) => setShippingName(e.target.value)} className="w-full p-3 border border-[#ddd] rounded-lg text-[14px] outline-none transition focus:border-[#111] focus:ring-2 focus:ring-black/10" placeholder="請輸入真實姓名" required />
            </div>
            <div className="mb-5">
              <label className="block text-[13px] font-semibold mb-2 text-[#555]">電子郵件 (接收訂單通知)</label>
              <input type="email" value={shippingEmail} onChange={(e) => setShippingEmail(e.target.value)} className="w-full p-3 border border-[#ddd] rounded-lg text-[14px] outline-none transition focus:border-[#111] focus:ring-2 focus:ring-black/10" placeholder="example@email.com" required />
            </div>
            <div className="mb-5">
              <label className="block text-[13px] font-semibold mb-2 text-[#555]">收件地址</label>
              <input type="text" value={shippingAddress} onChange={(e) => setShippingAddress(e.target.value)} className="w-full p-3 border border-[#ddd] rounded-lg text-[14px] outline-none transition focus:border-[#111] focus:ring-2 focus:ring-black/10" placeholder="請輸入完整收件地址" required />
            </div>

            {/* 結帳明細摘要 */}
            <div className="bg-[#f9f9f8] p-3.5 rounded-lg mb-5 text-[13px]">
              <div className="flex justify-between mb-1"><span>商品總額：</span><span>HKD ${currentSubtotal.toFixed(1)}</span></div>
              {discountAmount > 0 && (
                <div className="flex justify-between mb-1 text-emerald-600"><span>優惠券折抵：</span><span>- HKD ${discountAmount.toFixed(1)}</span></div>
              )}
              {creditToDeduct > 0 && (
                <div className="flex justify-between mb-1 text-amber-700"><span>購物金折抵：</span><span>- HKD ${creditToDeduct.toFixed(1)}</span></div>
              )}
              <div className="flex justify-between font-semibold pt-2 border-t border-[#eee] text-[14px]"><span>應付總額：</span><span>HKD ${finalTotal.toFixed(1)}</span></div>
            </div>
            
            <hr className="border-0 border-t border-dashed border-[#eee] my-6.25" />
            
            <label className="block text-[13px] font-semibold mb-2 text-[#555]">信用卡資訊 (模擬)</label>
            <div className="p-3.75 border border-[#ddd] rounded-lg bg-[#f9f9f9] flex items-center gap-2.5 mb-5">
              <div className="text-[24px]">💳</div>
              <div className="grow">
                <input type="text" value={cardNumber} onChange={(e) => setCardNumber(e.target.value)} className="w-full border-none p-0 bg-transparent mb-1.5 outline-none text-[14px]" placeholder="0000 0000 0000 0000" required />
                <div className="flex gap-2.5">
                  <input type="text" value={cardExpiry} onChange={handleExpiryInput} className="w-15 border-none p-0 bg-transparent outline-none text-[14px]" placeholder="MM/YY" required maxLength={5} />
                  <input type="text" value={cardCvc} onChange={(e) => setCardCvc(e.target.value)} className="w-12.5 border-none p-0 bg-transparent outline-none text-[14px]" placeholder="CVC" required maxLength={4} />
                </div>
              </div>
            </div>

            <button type="submit" disabled={isPaying} className="w-full bg-[#FEF9C3] text-[#111] p-4 border-none rounded-lg text-[15px] font-semibold cursor-pointer transition hover:bg-[#f0e9aa] hover:-translate-y-0.5 mt-2.5">
              {isPaying ? '付款處理中...' : `確認付款 HKD $${finalTotal.toFixed(1)}`}
            </button>
          </form>
        </div>
      </div>

      {/* 吐司通知 */}
      <div className={`fixed bottom-0 left-1/2 -translate-x-1/2 bg-[#333] text-white py-3 px-6.25 rounded-[30px] text-[13px] font-medium z-4000 transition-all duration-400 ${isToastShow ? 'translate-y-0' : 'translate-y-[150%]'}`}>
        {toastMessage}
      </div>

      <footer className="bg-[#fafafa] text-[#888] text-center py-10 px-5 text-[12px] mt-25">
        <p>&copy; 2026 LIGHTNING LIFESTYLE. ALL RIGHTS RESERVED.</p>
      </footer>
    </div>
  );
}