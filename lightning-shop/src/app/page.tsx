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
  targetAccountId?: string | null;
  conditionType?: 'infinite' | 'counts' | 'periods';
  startTime?: string | null;
  endTime?: string | null;
}

interface UserProfile {
  accountId: string;
  email: string;
  name?: string;
  phone?: string;
  address?: string;
  storeCredit?: number;
  isDeleted?: boolean;
}

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  
  // 互動狀態
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  
  // 折扣券、購物金、會員等級與收藏狀態
  const [selectedCoupon, setSelectedCoupon] = useState<Coupon | null>(null);
  const [availableCoupons, setAvailableCoupons] = useState<Coupon[]>([]);
  const [userStoreCredit, setUserStoreCredit] = useState<number>(0);
  const [userTotalSpent, setUserTotalSpent] = useState<number>(0);
  const [useCredit, setUseCredit] = useState<boolean>(false);
  const [userFavorites, setUserFavorites] = useState<{ [productId: string]: boolean }>({});

  // 會員表單與完整資料
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [registerStep, setRegisterStep] = useState<1 | 2>(1);
  const [authAccountId, setAuthAccountId] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [inputVerificationCode, setInputVerificationCode] = useState('');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [currentAccountId, setCurrentAccountId] = useState('');
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  // 提示訊息
  const [toastMessage, setToastMessage] = useState('');
  const [isToastShow, setIsToastShow] = useState(false);

  // 圖片輪播
  const [sliderIndexes, setSliderIndexes] = useState<{ [key: string]: number }>({});
  
  // 結帳表單狀態
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
    // 初始載入預設訪客購物車
    const savedCart = localStorage.getItem('villa_atelier_cart_guest');
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

    const unsubscribeAuth = auth.onAuthStateChanged(async (user) => {
      let loggedInAccountId = ''; 
      
      if (user) {
        setCurrentUser(user);

        // 🌟 登入時自動載入該會員專屬的購物車資料
        const userCartKey = `villa_atelier_cart_${user.uid}`;
        const userSavedCart = localStorage.getItem(userCartKey);
        if (userSavedCart) {
          try { setCart(JSON.parse(userSavedCart)); } catch (e) { setCart([]); }
        } else {
          setCart([]);
        }

        try {
          const querySnapshot = await db.collection("users")
            .where("uid", "==", user.uid)
            .get();
            
          const activeDocs = querySnapshot.docs.filter(d => !d.data()?.isDeleted);

          if (activeDocs.length > 0) {
            const doc = activeDocs[0];
            loggedInAccountId = doc.id;
            const userData = doc.data() as UserProfile;
            setCurrentAccountId(loggedInAccountId);
            setUserStoreCredit(userData.storeCredit || 0);
            setUserProfile(userData);

            db.collection("orders").where("email", "==", user.email).onSnapshot((ordersSnap) => {
              let spent = 0;
              ordersSnap.forEach((oDoc) => {
                const orderData = oDoc.data();
                if (orderData.status !== 'cancelled') {
                  spent += Number(orderData.total || 0);
                }
              });
              setUserTotalSpent(spent);
            });

            db.collection("users").doc(loggedInAccountId).collection("favorites").onSnapshot((favSnap) => {
              const favMap: { [productId: string]: boolean } = {};
              favSnap.forEach(fDoc => {
                favMap[fDoc.id] = true;
              });
              setUserFavorites(favMap);
            });
          } else {
            setCurrentAccountId('會員');
            setUserStoreCredit(0);
            setUserTotalSpent(0);
            setUserProfile(null);
          }
        } catch (e) {
          setCurrentAccountId('會員');
          setUserStoreCredit(0);
          setUserTotalSpent(0);
          setUserProfile(null);
        }
      } else {
        // 🌟 登出時清空狀態，並載入訪客購物車（不刪除會員專屬購物車紀錄）
        setCurrentUser(null);
        setCurrentAccountId('');
        setUserStoreCredit(0);
        setUserTotalSpent(0);
        setUserProfile(null);
        setUserFavorites({});
        
        const guestCart = localStorage.getItem('villa_atelier_cart_guest');
        if (guestCart) {
          try { setCart(JSON.parse(guestCart)); } catch (e) { setCart([]); }
        } else {
          setCart([]);
        }

        setSelectedCoupon(null);
        setUseCredit(false);
      }

      const unsubscribeCoupons = db.collection("coupons")
        .where("usesLeft", ">", 0)
        .onSnapshot((snapshot) => {
          const list: Coupon[] = [];
          const now = new Date().getTime();

          snapshot.forEach((doc) => {
            const { id, ...data } = doc.data() as any;
            const coupon = { id: doc.id, ...data } as Coupon;

            if (coupon.targetAccountId && coupon.targetAccountId.trim() !== '' && coupon.targetAccountId !== loggedInAccountId) {
              return; 
            }

            if ((coupon.conditionType === 'periods' || coupon.conditionType === 'counts') && coupon.startTime && coupon.endTime) {
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

      return () => {
        unsubscribeCoupons();
      };
    });

    return () => {
      unsubscribeProducts();
      unsubscribeAuth();
    };
  }, []);

  const filterProducts = (keyword: string, category: string) => {
    let result = products;

    if (category !== 'all') {
      result = result.filter(p => p.category && p.category.trim() === category);
    }

    const lower = keyword.trim().toLowerCase();
    if (lower) {
      result = result.filter(p => {
        const nameMatch = p.name && p.name.toLowerCase().includes(lower);
        const catMatch = p.category && p.category.toLowerCase().includes(lower);
        return nameMatch || catMatch;
      });
    }

    setFilteredProducts(result);
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const keyword = e.target.value;
    setSearchKeyword(keyword);
    filterProducts(keyword, selectedCategory);
  };

  const handleCategorySelect = (category: string) => {
    setSelectedCategory(category);
    filterProducts(searchKeyword, category);
  };

  const categories = ['all', ...Array.from(new Set(products.map(p => p.category).filter(Boolean)))];

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setIsToastShow(true);
    setTimeout(() => setIsToastShow(false), 2500);
  };

  // 🌟 儲存購物車時，依據當前是否登入儲存至對應的 UID key 或 guest key
  const saveCartToStorage = (newCart: CartItem[]) => {
    setCart(newCart);
    const cartKey = currentUser ? `villa_atelier_cart_${currentUser.uid}` : 'villa_atelier_cart_guest';
    localStorage.setItem(cartKey, JSON.stringify(newCart));
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

  const currentSubtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  
  const getMemberTierRate = () => {
    if (!currentUser) return 1;
    if (userTotalSpent >= 3000) return 0.90;
    if (userTotalSpent >= 1000) return 0.95;
    return 1;
  };

  const memberTierRate = getMemberTierRate();
  const memberDiscountAmount = currentSubtotal * (1 - memberTierRate);
  const subtotalAfterMemberDiscount = Math.max(0, currentSubtotal - memberDiscountAmount);

  const calculateCouponDiscount = () => {
    if (!selectedCoupon) return 0;
    
    if ((selectedCoupon.conditionType === 'periods' || selectedCoupon.conditionType === 'counts') && selectedCoupon.startTime && selectedCoupon.endTime) {
      const now = new Date().getTime();
      const start = new Date(selectedCoupon.startTime).getTime();
      const end = new Date(selectedCoupon.endTime).getTime();
      if (now < start || now > end) return 0;
    }

    if (currentSubtotal < selectedCoupon.minSpend) return 0;
    
    if (selectedCoupon.discountType === 'fixed') {
      return Math.min(subtotalAfterMemberDiscount, selectedCoupon.discountValue);
    } else if (selectedCoupon.discountType === 'percent') {
      return subtotalAfterMemberDiscount * (1 - selectedCoupon.discountValue);
    }
    return 0;
  };

  const couponDiscountAmount = calculateCouponDiscount();
  const subtotalAfterCoupon = Math.max(0, subtotalAfterMemberDiscount - couponDiscountAmount);
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

  const handleToggleFavorite = async (productId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!currentUser || !currentAccountId) {
      alert('請先登入會員以使用收藏功能！');
      setIsAuthOpen(true);
      return;
    }

    const favRef = db.collection("users").doc(currentAccountId).collection("favorites").doc(productId);
    const doc = await favRef.get();

    if (doc.exists) {
      await favRef.delete();
      showToast('已取消收藏');
    } else {
      await favRef.set({
        productId,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      showToast('❤️ 已加入我的收藏');
    }
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isRegisterMode) {
        if (registerStep === 1) {
          const docRef = db.collection("users").doc(authAccountId);
          const docSnap = await docRef.get();

          if (docSnap.exists && !docSnap.data()?.isDeleted) {
            alert('此帳戶 ID 已經被註冊，請選擇其他 ID。');
            return;
          }

          const userCred = await auth.createUserWithEmailAndPassword(authEmail, authPassword);
          const newUid = userCred.user?.uid;

          const res = await fetch('/api/send-code', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              email: authEmail, 
              accountId: authAccountId,
              uid: newUid
            })
          });
          const data = await res.json();

          if (!data.success) {
            alert('驗證碼發送失敗： ' + (data.error?.message || '未知錯誤'));
            return;
          }

          alert('✨ 帳號已建立！驗證信已發送至您的信箱，請輸入 6 位數驗證碼完成最後步驟。');
          setRegisterStep(2);
        } else {
          const verifDoc = await db.collection("verifications").doc(authEmail).get();
          if (!verifDoc.exists) {
            alert('找不到此信箱的驗證紀錄，請重新發送。');
            return;
          }

          const serverCode = verifDoc.data()?.code;
          if (serverCode !== inputVerificationCode.trim()) {
            alert('❌ 驗證碼錯誤，請重新輸入！');
            return;
          }

          const currentUserObj = auth.currentUser;

          await db.collection("users").doc(authAccountId).set({
            accountId: authAccountId,
            email: authEmail,
            uid: currentUserObj?.uid || '',
            storeCredit: 0,
            isDeleted: false,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
          });

          await db.collection("verifications").doc(authEmail).delete();

          alert('🎉 註冊與驗證全部完成！');
          setIsRegisterMode(false);
          setRegisterStep(1);
          setIsAuthOpen(false);
        }
      } else {
        const docRef = db.collection("users").doc(authAccountId);
        const docSnap = await docRef.get();
        if (!docSnap.exists || docSnap.data()?.isDeleted) {
          alert('找不到此帳戶 ID 或該帳戶已被註銷，請確認是否輸入正確。');
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

  const handleExpiryInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, '');
    if (val.length > 2) {
      val = val.substring(0, 2) + '/' + val.substring(2, 4);
    }
    setCardExpiry(val);
  };

  const openCheckoutModal = () => {
    setIsCartOpen(false);
    if (userProfile) {
      if (userProfile.name) setShippingName(userProfile.name);
      if (userProfile.email) setShippingEmail(userProfile.email);
      if (userProfile.address) setShippingAddress(userProfile.address);
    } else if (currentUser?.email) {
      setShippingEmail(currentUser.email);
    }
    setIsPaymentOpen(true);
  };

  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return alert('購物車是空的！');

    if (selectedCoupon && calculateCouponDiscount() === 0 && selectedCoupon.discountValue > 0) {
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
        accountId: currentAccountId || null,
        name: shippingName.trim(),
        email: shippingEmail.trim(),
        address: shippingAddress.trim(),
        items: cart,
        subtotal: currentSubtotal,
        memberDiscount: memberDiscountAmount,
        discount: couponDiscountAmount,
        creditDeducted: creditToDeduct,
        couponCode: selectedCoupon ? selectedCoupon.code : null,
        total: finalTotal,
        status: 'pending',
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      };

      await db.collection("orders").doc(customOrderId).set(orderData);

      if (selectedCoupon && selectedCoupon.conditionType === 'counts') {
        try {
          const couponRef = db.collection("coupons").doc(selectedCoupon.code);
          const couponDoc = await couponRef.get();
          if (couponDoc.exists) {
            const currentUses = couponDoc.data()?.usesLeft || 1;
            await couponRef.update({ usesLeft: currentUses > 1 ? currentUses - 1 : 0 });
          }
        } catch (couponErr) {
          console.error('優惠券次數扣減失敗:', couponErr);
        }
      }

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

      setTimeout(() => {
        alert(`🎉 付款成功！\n\n感謝您的購買，您的訂單編號為：${customOrderId}\n總計支付：HKD ${finalTotal.toFixed(1)}`);
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
    <div className="bg-[#FAF7F2] text-[#382E2B] min-h-screen overflow-x-hidden font-sans">
      {/* 導覽列 */}
      <nav className="fixed top-0 left-0 w-full h-18.75 bg-[#FAF7F2]/95 backdrop-blur-sm flex justify-between items-center px-[6%] z-1000 border-b border-[#EBE5DF]">
        <div className="text-[18px] font-bold tracking-[3px] uppercase text-[#B35B48]">VILLA ATELIER</div>
        <div className="flex items-center gap-4">
          <Link 
            href={currentUser ? "/account" : "#"}
            className="text-[13px] font-medium cursor-pointer text-[#382E2B] p-2 md:py-1.5 md:px-3 rounded-md bg-[#F4F0EA] border border-[#EBE5DF] transition hover:bg-[#C28C7A] hover:text-white flex items-center justify-center gap-1.5 group"
            onClick={(e) => {
              if (!currentUser) {
                e.preventDefault();
                setIsAuthOpen(true);
              }
            }}
            title={currentUser ? `會員中心 (${currentAccountId})` : '會員登入 / 註冊'}
          >
            <svg 
              className="w-5 h-5 fill-none stroke-[#382E2B] group-hover:stroke-white stroke-[1.5] transition" 
              viewBox="0 0 24 24"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
            <span className="hidden md:inline">
              {currentUser ? `會員中心 (${currentAccountId})` : '會員登入 / 註冊'}
            </span>
          </Link>

          <div className="cursor-pointer relative p-1.5 flex items-center" onClick={() => setIsCartOpen(true)}>
            <svg className="w-5.5 h-5.5 fill-none stroke-[#382E2B] stroke-[1.5]" viewBox="0 0 24 24">
              <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <path d="M16 10a4 4 0 0 1-8 0"></path>
            </svg>
            <div className="absolute -top-1 -right-1.5 bg-[#B35B48] text-white text-[11px] font-semibold w-4.5 h-4.5 rounded-full flex justify-center items-center shadow-xs">
              {totalCount}
            </div>
          </div>
        </div>
      </nav>

      {/* 分類導覽 */}
      <div className="fixed top-18.75 left-0 w-full bg-[#FAF7F2]/95 backdrop-blur-md border-b border-[#EBE5DF] z-900 px-4 py-2.5 overflow-x-auto whitespace-nowrap no-scrollbar shadow-[0_4px_12px_rgba(56,46,43,0.02)] flex items-center gap-2 md:justify-center">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => handleCategorySelect(cat)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition cursor-pointer shrink-0 ${
              selectedCategory === cat 
                ? 'bg-[#B35B48] text-white shadow-xs font-semibold' 
                : 'bg-[#F4F0EA] text-[#6E6058] hover:bg-[#EBE5DF]'
            }`}
          >
            {cat === 'all' ? '✨ 全部選品' :  cat === 'DAILY WEAR' ? '👕 日常穿搭' : cat === 'ACCESSORY' ? '💍 首飾配件' : cat === 'BAGS' ? '👜 包包' : cat}
          </button>
        ))}
      </div>

      <div className={`fixed inset-0 bg-[#382E2B]/30 backdrop-blur-[3px] z-1500 transition-all duration-400 ${isAnyModalOpen ? 'opacity-100 visible' : 'opacity-0 invisible'}`} onClick={() => { setIsCartOpen(false); setIsAuthOpen(false); setIsPaymentOpen(false); }} />

      {/* 會員 Modal */}
      <div className={`fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 scale-[0.95] w-[90%] max-w-125 max-h-[85vh] bg-[#FAF7F2] border border-[#EBE5DF] rounded-2xl shadow-[0_10px_40px_rgba(56,46,43,0.1)] z-2500 transition-all duration-400 flex flex-col overflow-hidden ${isAuthOpen ? 'opacity-100 visible scale-100' : 'opacity-0 invisible'}`}>
        <div className="p-6.25 border-b border-[#EBE5DF] flex justify-between items-center bg-[#F4F0EA]">
          <h2 className="text-[18px] font-semibold text-[#B35B48]">
            {isRegisterMode ? (registerStep === 1 ? '註冊新會員 (步驟 1/2)' : '輸入驗證碼 (步驟 2/2)') : '會員登入'}
          </h2>
          <button className="bg-none border-none text-[26px] cursor-pointer text-[#888]" onClick={() => setIsAuthOpen(false)}>&times;</button>
        </div>
        <div className="p-6.25 max-h-[70vh] overflow-y-auto">
          <form onSubmit={handleAuthSubmit}>
            {isRegisterMode && registerStep === 2 ? (
              <div className="mb-5">
                <label className="block text-[13px] font-semibold mb-2 text-[#6E6058]">請輸入信箱收到的 6 位數驗證碼</label>
                <input 
                  type="text" 
                  value={inputVerificationCode} 
                  onChange={(e) => setInputVerificationCode(e.target.value)} 
                  className="w-full p-3 border border-[#EBE5DF] bg-white rounded-lg text-[20px] tracking-[8px] text-center outline-none transition focus:border-[#B35B48]" 
                  placeholder="000000" 
                  maxLength={6} 
                  required 
                />
                <p className="text-xs text-[#7A6E65] mt-2 text-center">驗證碼已寄至：{authEmail}</p>
              </div>
            ) : (
              <>
                <div className="mb-5">
                  <label className="block text-[13px] font-semibold mb-2 text-[#6E6058]">帳戶 ID</label>
                  <input type="text" value={authAccountId} onChange={(e) => setAuthAccountId(e.target.value)} className="w-full p-3 border border-[#EBE5DF] bg-white rounded-lg text-[14px] outline-none transition focus:border-[#B35B48]" placeholder="例如：john123" required />
                </div>
                {isRegisterMode && (
                  <div className="mb-5">
                    <label className="block text-[13px] font-semibold mb-2 text-[#6E6058]">電子郵件 (將接收驗證碼與連結)</label>
                    <input type="email" value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} className="w-full p-3 border border-[#EBE5DF] bg-white rounded-lg text-[14px] outline-none transition focus:border-[#B35B48]" placeholder="example@email.com" required />
                  </div>
                )}
                <div className="mb-5">
                  <label className="block text-[13px] font-semibold mb-2 text-[#6E6058]">密碼 (至少 6 位數)</label>
                  <input type="password" value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} className="w-full p-3 border border-[#EBE5DF] bg-white rounded-lg text-[14px] outline-none transition focus:border-[#B35B48]" placeholder="請輸入密碼" required minLength={6} />
                </div>
              </>
            )}

            <button type="submit" className="w-full bg-[#B35B48] text-white p-4 border-none rounded-lg text-[15px] font-semibold cursor-pointer transition hover:bg-[#9B4C3A] shadow-xs">
              {isRegisterMode ? (registerStep === 1 ? '下一步：發送 6 位數驗證碼' : '確認驗證並完成註冊') : '登入系統'}
            </button>
          </form>

          <div className="text-center mt-4 text-[13px]">
            <span className="text-[#7A6E65]">{isRegisterMode ? '已經有帳號了？' : '還沒有帳號？'}</span>
            <button onClick={() => { setIsRegisterMode(!isRegisterMode); setRegisterStep(1); }} className="text-[#B35B48] font-semibold underline ml-1.5 bg-none border-none cursor-pointer">
              {isRegisterMode ? '點此登入' : '點此註冊'}
            </button>
          </div>
        </div>
      </div>

      {/* Hero 區 */}
      <div className="pt-34 px-[4%] max-w-350 mx-auto">
        <header className="h-[35vh] bg-[#F4F0EA] border border-[#EBE5DF] rounded-2xl flex flex-col justify-center items-center text-center px-5 shadow-xs relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#C28C7A]/10 rounded-full blur-xl pointer-events-none" />
          <h1 className="text-[32px] md:text-[36px] font-serif tracking-[4px] mb-3.5 text-[#382E2B]">日常的美好，源於細節</h1>
          <p className="text-[13px] md:text-[14px] text-[#B35B48] font-medium tracking-[3px] uppercase">STUDIO OF ARTFUL LIVING & DESIGN</p>
        </header>
        <div className="max-w-150 mx-auto mt-7.5 px-[4%]">
          <input 
            type="text" 
            value={searchKeyword}
            onChange={handleSearch}
            className="w-full py-3.5 px-5 border border-[#EBE5DF] rounded-[30px] text-[14px] outline-none bg-white transition shadow-[0_2px_10px_rgba(56,46,43,0.02)] focus:border-[#B35B48]"
            placeholder="🔍 搜尋選品名稱或分類..." 
          />
        </div>
      </div>

      {/* 商品區 */}
      <main className="max-w-300 my-10 mx-auto px-[4%]">
        <h2 className="text-[18px] font-serif tracking-[3px] mb-10 text-center text-[#382E2B]">全站選品 / CURATED ITEMS</h2>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-[50px_30px]">
          {filteredProducts.length === 0 ? (
            <p className="text-center text-[#888] col-span-full py-10">沒有找到符合條件的選品。</p>
          ) : (
            filteredProducts.map(p => {
              const validImages = p.images ? p.images.filter(img => img && img.trim() !== '') : [];
              const hasImages = validImages.length > 0;
              const activeIdx = sliderIndexes[p.id] || 0;
              const isFavorited = !!userFavorites[p.id];

              return (
                <div key={p.id} className="bg-white border border-[#EBE5DF] transition duration-400 flex flex-col rounded-xl relative hover:-translate-y-1.5 group shadow-xs overflow-hidden">
                  {p.tag && (
                    <div className="absolute top-3.75 left-3.75 text-white text-[10px] font-semibold py-1 px-2.5 z-10 rounded bg-[#B35B48]">
                      {p.tag}
                    </div>
                  )}

                  <button 
                    onClick={(e) => handleToggleFavorite(p.id, e)}
                    className="absolute top-3.75 right-3.75 w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center z-10 shadow-xs transition hover:scale-110 cursor-pointer"
                  >
                    <span className={`text-[16px] transition ${isFavorited ? 'text-[#B35B48] scale-110' : 'text-stone-300 hover:text-stone-500'}`}>
                      {isFavorited ? '♥' : '♡'}
                    </span>
                  </button>

                  <Link href={`/product/${p.id}`} className="no-underline text-inherit block grow">
                    <div 
                      className="relative w-full h-85 bg-[#F4F0EA] overflow-hidden flex items-center justify-center touch-pan-y"
                      onTouchStart={handleTouchStart}
                      onTouchEnd={(e) => handleTouchEnd(p.id, e, validImages.length)}
                    >
                      {hasImages ? (
                        <>
                          {validImages.map((img, idx) => (
                            idx === activeIdx && (
                              <div key={idx} className="relative w-full h-full">
                                <Image src={img} alt={p.name} fill sizes="(max-width: 768px) 100vw, 300px" className="object-cover" priority={idx === 0} />
                              </div>
                            )
                          ))}
                        </>
                      ) : (
                        <span className="text-[13px] text-[#A3958B]">{p.category || 'NO IMAGE'}</span>
                      )}
                    </div>
                    <div className="flex flex-col grow p-4">
                      <h3 className="text-[14px] font-medium mb-2 text-[#382E2B] line-clamp-1">{p.name}</h3>
                      <div className="text-[14px] font-semibold text-[#B35B48] mb-2">HKD {Number(p.price).toFixed(1)}</div>
                    </div>
                  </Link>

                  <div className="p-4 pt-0">
                    <button className="w-full bg-[#FAF7F2] border border-[#EBE5DF] rounded-lg py-2.5 text-[13px] font-medium text-[#382E2B] cursor-pointer transition hover:bg-[#B35B48] hover:text-white" onClick={() => addToCart(p.id)}>
                      加入購物車
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </main>

      {/* 購物車 Drawer */}
      <div className={`fixed top-0 right-0 w-100 max-w-full h-full bg-[#FAF7F2] border-l border-[#EBE5DF] shadow-[-5px_0_30px_rgba(56,46,43,0.05)] z-2000 transition-transform duration-400 flex flex-col ${isCartOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="p-[30px_25px] border-b border-[#EBE5DF] flex justify-between items-center bg-[#F4F0EA]">
          <h2 className="text-[18px] font-semibold text-[#382E2B]">購物車清單 ({totalCount})</h2>
          <button className="bg-none border-none text-[26px] cursor-pointer text-[#888]" onClick={() => setIsCartOpen(false)}>&times;</button>
        </div>
        
        <div className="grow overflow-y-auto p-6.25">
          {cart.length === 0 ? (
            <p className="text-center text-[#888] mt-12.5">購物車目前是空的喔</p>
          ) : (
            cart.map(item => (
              <div key={item.id} className="flex gap-3.75 mb-6.25 items-center bg-white p-3 rounded-lg border border-[#EBE5DF]">
                <div className="w-15 h-17.5 bg-[#F4F0EA] rounded-md flex justify-center items-center text-[11px] text-[#7A6E65]">ITEM</div>
                <div className="grow">
                  <div className="text-[13px] font-medium mb-1 text-[#382E2B]">{item.name}</div>
                  <div className="text-[13px] font-semibold mb-2.5 text-[#B35B48]">HKD {Number(item.price).toFixed(1)}</div>
                  <div className="flex items-center gap-3">
                    <button className="bg-[#FAF7F2] border border-[#EBE5DF] rounded-full w-6 h-6 cursor-pointer flex items-center justify-center text-xs" onClick={() => updateQuantity(item.id, -1)}>-</button>
                    <span className="text-[13px]">{item.quantity}</span>
                    <button className="bg-[#FAF7F2] border border-[#EBE5DF] rounded-full w-6 h-6 cursor-pointer flex items-center justify-center text-xs" onClick={() => updateQuantity(item.id, 1)}>+</button>
                    <button className="bg-none border-none text-[#A3958B] text-[12px] cursor-pointer ml-auto hover:text-[#B35B48]" onClick={() => removeFromCart(item.id)}>移除</button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {cart.length > 0 && (
          <div className="p-6.25 border-t border-[#EBE5DF] bg-[#F4F0EA]">
            <div className="mb-3">
              <label className="block text-[12px] font-semibold text-[#6E6058] mb-1.5">選擇適用折扣券</label>
              <select 
                className="w-full p-2.5 bg-white border border-[#EBE5DF] rounded-lg text-[13px] outline-none cursor-pointer"
                value={selectedCoupon ? selectedCoupon.code : ''}
                onChange={(e) => {
                  const found = availableCoupons.find(c => c.code === e.target.value);
                  setSelectedCoupon(found || null);
                }}
              >
                <option value="">-- 不使用折扣券 --</option>
                {availableCoupons.map(coupon => (
                  <option key={coupon.id} value={coupon.code} disabled={currentSubtotal < coupon.minSpend}>
                    {coupon.discountText} {coupon.targetAccountId ? '【專屬優惠】' : ''} {currentSubtotal < coupon.minSpend ? `[滿 $${coupon.minSpend} 可用]` : ''}
                  </option>
                ))}
              </select>
            </div>

            {currentUser && userStoreCredit > 0 && (
              <div className="mb-4 p-3 bg-[#C28C7A]/15 border border-[#C28C7A]/30 rounded-lg flex items-center justify-between text-xs">
                <label className="flex items-center gap-2 cursor-pointer font-medium text-[#382E2B]">
                  <input 
                    type="checkbox" 
                    checked={useCredit} 
                    onChange={(e) => setUseCredit(e.target.checked)}
                    className="w-4 h-4 rounded border-[#C28C7A] accent-[#B35B48] cursor-pointer"
                  />
                  使用購物金折抵 (可用 HKD ${userStoreCredit})
                </label>
              </div>
            )}

            <div className="flex justify-between mb-2 text-[13px] text-[#7A6E65]">
              <span>商品小計</span>
              <span>HKD {Number(currentSubtotal).toFixed(1)}</span>
            </div>

            {memberDiscountAmount > 0 && (
              <div className="flex justify-between mb-2 text-[13px] text-[#B35B48] font-medium">
                <span>
                  {userTotalSpent >= 3000 ? '💎 鑽石會員 9折折扣' : '🥇 金卡會員 95折折扣'}
                </span>
                <span>- HKD {Number(memberDiscountAmount).toFixed(1)}</span>
              </div>
            )}

            {couponDiscountAmount > 0 && (
              <div className="flex justify-between mb-2 text-[13px] text-[#B35B48] font-medium">
                <span>優惠券折抵</span>
                <span>- HKD {Number(couponDiscountAmount).toFixed(1)}</span>
              </div>
            )}

            {creditToDeduct > 0 && (
              <div className="flex justify-between mb-2 text-[13px] text-[#B35B48] font-medium">
                <span>購物金折抵</span>
                <span>- HKD {Number(creditToDeduct).toFixed(1)}</span>
              </div>
            )}

            <div className="flex justify-between mb-5 pt-3 border-t border-[#EBE5DF] text-[16px] font-semibold text-[#382E2B]">
              <span>訂單總計</span>
              <span className="text-[#B35B48]">HKD {Number(finalTotal).toFixed(1)}</span>
            </div>

            <button 
              className="w-full bg-[#B35B48] text-white border-none rounded-[10px] p-4 cursor-pointer text-[14px] font-semibold transition hover:bg-[#9B4C3A] shadow-xs" 
              onClick={openCheckoutModal}
            >
              前往結帳 Checkout
            </button>
          </div>
        )}
      </div>

      {/* 結帳 Modal */}
      <div className={`fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 scale-[0.95] w-[90%] max-w-125 max-h-[85vh] bg-[#FAF7F2] border border-[#EBE5DF] rounded-2xl shadow-[0_10px_40px_rgba(56,46,43,0.1)] z-2500 transition-all duration-400 flex flex-col overflow-hidden ${isPaymentOpen ? 'opacity-100 visible scale-100' : 'opacity-0 invisible'}`}>
        <div className="p-6.25 border-b border-[#EBE5DF] flex justify-between items-center bg-[#F4F0EA]">
          <div className="flex items-center gap-2">
            <h2 className="text-[18px] font-semibold text-[#382E2B]">安全結帳</h2>
            {userProfile && (
              <span className="text-[10px] bg-[#B35B48] text-white px-2 py-0.5 rounded-full font-medium">
                ✨ 已自動帶入會員資料
              </span>
            )}
          </div>
          <button className="bg-none border-none text-[26px] cursor-pointer text-[#888]" onClick={() => setIsPaymentOpen(false)}>&times;</button>
        </div>
        <div className="p-6.25 max-h-[70vh] overflow-y-auto">
          <form onSubmit={handleCheckoutSubmit}>
            <div className="mb-5">
              <label className="block text-[13px] font-semibold mb-2 text-[#6E6058]">收件人姓名</label>
              <input type="text" value={shippingName} onChange={(e) => setShippingName(e.target.value)} className="w-full p-3 border border-[#EBE5DF] bg-white rounded-lg text-[14px] outline-none transition focus:border-[#B35B48]" placeholder="請輸入真實姓名" required />
            </div>
            <div className="mb-5">
              <label className="block text-[13px] font-semibold mb-2 text-[#6E6058]">電子郵件 (接收訂單通知)</label>
              <input type="email" value={shippingEmail} onChange={(e) => setShippingEmail(e.target.value)} className="w-full p-3 border border-[#EBE5DF] bg-white rounded-lg text-[14px] outline-none transition focus:border-[#B35B48]" placeholder="example@email.com" required />
            </div>
            <div className="mb-5">
              <label className="block text-[13px] font-semibold mb-2 text-[#6E6058]">收件地址</label>
              <input type="text" value={shippingAddress} onChange={(e) => setShippingAddress(e.target.value)} className="w-full p-3 border border-[#EBE5DF] bg-white rounded-lg text-[14px] outline-none transition focus:border-[#B35B48]" placeholder="請輸入完整收件地址" required />
            </div>

            <div className="bg-[#F4F0EA] p-3.5 rounded-lg mb-5 text-[13px] border border-[#EBE5DF]">
              <div className="flex justify-between mb-1"><span>商品總額：</span><span>HKD ${currentSubtotal.toFixed(1)}</span></div>
              {memberDiscountAmount > 0 && (
                <div className="flex justify-between mb-1 text-[#B35B48]">
                  <span>{userTotalSpent >= 3000 ? '鑽石會員尊榮 9折：' : '金卡會員尊榮 95折：'}</span>
                  <span>- HKD ${memberDiscountAmount.toFixed(1)}</span>
                </div>
              )}
              {couponDiscountAmount > 0 && (
                <div className="flex justify-between mb-1 text-[#B35B48]"><span>優惠券折抵：</span><span>- HKD ${couponDiscountAmount.toFixed(1)}</span></div>
              )}
              {creditToDeduct > 0 && (
                <div className="flex justify-between mb-1 text-[#B35B48]"><span>購物金折抵：</span><span>- HKD ${creditToDeduct.toFixed(1)}</span></div>
              )}
              <div className="flex justify-between font-semibold pt-2 border-t border-[#EBE5DF] text-[14px]"><span>應付總額：</span><span className="text-[#B35B48]">HKD ${finalTotal.toFixed(1)}</span></div>
            </div>
            
            <hr className="border-0 border-t border-dashed border-[#EBE5DF] my-6.25" />
            
            <label className="block text-[13px] font-semibold mb-2 text-[#6E6058]">信用卡資訊 (模擬)</label>
            <div className="p-3.75 border border-[#EBE5DF] rounded-lg bg-white flex items-center gap-2.5 mb-5">
              <div className="text-[24px]">💳</div>
              <div className="grow">
                <input type="text" value={cardNumber} onChange={(e) => setCardNumber(e.target.value)} className="w-full border-none p-0 bg-transparent mb-1.5 outline-none text-[14px]" placeholder="0000 0000 0000 0000" required />
                <div className="flex gap-2.5">
                  <input type="text" value={cardExpiry} onChange={handleExpiryInput} className="w-15 border-none p-0 bg-transparent outline-none text-[14px]" placeholder="MM/YY" required maxLength={5} />
                  <input type="text" value={cardCvc} onChange={(e) => setCardCvc(e.target.value)} className="w-12.5 border-none p-0 bg-transparent outline-none text-[14px]" placeholder="CVC" required maxLength={4} />
                </div>
              </div>
            </div>

            <button type="submit" disabled={isPaying} className="w-full bg-[#B35B48] text-white p-4 border-none rounded-lg text-[15px] font-semibold cursor-pointer transition hover:bg-[#9B4C3A] shadow-xs">
              {isPaying ? '付款處理中...' : `確認付款 HKD ${finalTotal.toFixed(1)}`}
            </button>
          </form>
        </div>
      </div>

      <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 bg-[#382E2B] text-[#FAF7F2] py-3 px-6.25 rounded-[30px] text-[13px] font-medium z-4000 transition-all duration-1000 shadow-md ${isToastShow ? 'translate-y-0' : 'translate-y-[300%]'}`}>
        {toastMessage}
      </div>

      <footer className="bg-[#F4F0EA] text-[#7A6E65] text-center py-10 px-5 text-[12px] mt-25 border-t border-[#EBE5DF]">
        <p>&copy; 2026 VILLA ATELIER STUDIO. ALL RIGHTS RESERVED.</p>
      </footer>
    </div>
  );
}