'use client';

import { useState, useEffect } from 'react';
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

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [searchKeyword, setSearchKeyword] = useState('');
  
  // 互動狀態
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  
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
  const [touchStartX, setTouchStartX] = useState(0);
  const [touchStartY, setTouchStartY] = useState(0);

  useEffect(() => {
    const savedCart = localStorage.getItem('lightning_life_cart');
    if (savedCart) {
      try { setCart(JSON.parse(savedCart)); } catch (e) {}
    }

    const unsubscribeProducts = db.collection("products").orderBy("createdAt", "desc").onSnapshot((snapshot) => {
      const list: Product[] = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() } as Product);
      });
      setProducts(list);
      setFilteredProducts(list);
    });

    const unsubscribeAuth = auth.onAuthStateChanged(async (user) => {
      setCurrentUser(user);
      if (user) {
        try {
          const querySnapshot = await db.collection("users").where("uid", "==", user.uid).get();
          if (!querySnapshot.empty) {
            setCurrentAccountId(querySnapshot.docs[0].id);
          } else {
            setCurrentAccountId('會員');
          }
        } catch (e) {
          setCurrentAccountId('會員');
        }
      } else {
        setCurrentAccountId('');
      }
    });

    return () => {
      unsubscribeProducts();
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

  const changeSlide = (productId: string, index: number, validLength: number) => {
    const targetIndex = (index + validLength) % validLength;
    setSliderIndexes(prev => ({ ...prev, [productId]: targetIndex }));
  };

  const moveSlide = (productId: string, direction: number, validLength: number) => {
    const currentIndex = sliderIndexes[productId] || 0;
    changeSlide(productId, currentIndex + direction, validLength);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
    setTouchStartY(e.touches[0].clientY);
  };

  const handleTouchEnd = (productId: string, e: React.TouchEvent, validLength: number) => {
    const diffX = e.changedTouches[0].clientX - touchStartX;
    const diffY = e.changedTouches[0].clientY - touchStartY;

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
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        showToast('註冊成功並已自動登入！');
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
      const totalAmount = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

      const orderData = {
        name: shippingName.trim(),
        email: shippingEmail.trim(),
        address: shippingAddress.trim(),
        items: cart,
        total: totalAmount,
        status: 'pending',
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      };

      await db.collection("orders").doc(customOrderId).set(orderData);

      setTimeout(() => {
        alert(`🎉 付款成功！\n\n感謝您的購買，您的訂單編號為：${customOrderId}`);
        saveCartToStorage([]);
        setIsPaymentOpen(false);
        setIsPaying(false);
      }, 1500);
    } catch (error: any) {
      alert('訂單建立失敗： ' + error.message);
      setIsPaying(false);
    }
  };

  const totalCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const currentTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const isAnyModalOpen = isCartOpen || isAuthOpen || isPaymentOpen;

  return (
    <div className="bg-white text-[#333333] min-h-screen overflow-x-hidden font-sans">
      {/* 導覽列 */}
      <nav style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '75px', background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(8px)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 6%', zIndex: 1000, borderBottom: '1px solid #f0f0f0' }}>
        <div style={{ fontSize: '20px', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase' }}>LIGHTNING</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div 
            style={{ fontSize: '13px', fontWeight: 500, cursor: 'pointer', color: '#333', padding: '6px 12px', borderRadius: '6px', background: '#fafafa', border: '1px solid #f0f0f0' }}
            onClick={() => setIsAuthOpen(true)}
          >
            {currentUser ? `👤 ID: ${currentAccountId} ` : '會員登入 / 註冊'}
            {currentUser && <span style={{ color: '#888', fontSize: '11px', marginLeft: '5px' }} onClick={(e) => { e.stopPropagation(); handleLogout(); }}>(登出)</span>}
          </div>

          <div style={{ cursor: 'pointer', position: 'relative', padding: '5px', display: 'flex', alignItems: 'center' }} onClick={() => setIsCartOpen(true)}>
            <svg style={{ width: '22px', height: '22px', fill: 'none', stroke: '#333', strokeWidth: 1.5 }} viewBox="0 0 24 24">
              <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <path d="M16 10a4 4 0 0 1-8 0"></path>
            </svg>
            <div style={{ position: 'absolute', top: '-4px', right: '-6px', backgroundColor: '#FEF9C3', color: '#333', fontSize: '11px', fontWeight: 600, width: '18px', height: '18px', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              {totalCount}
            </div>
          </div>
        </div>
      </nav>

      {/* 背景遮罩 */}
      <div className={`overlay ${isAnyModalOpen ? 'open' : ''}`} onClick={() => { setIsCartOpen(false); setIsAuthOpen(false); setIsPaymentOpen(false); }} />

      {/* 會員登入/註冊 Modal */}
      <div className={`payment-modal ${isAuthOpen ? 'open' : ''}`}>
        <div style={{ padding: '25px', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fafafa' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 600 }}>{isRegisterMode ? '註冊新會員' : '會員登入'}</h2>
          <button style={{ background: 'none', border: 'none', fontSize: '26px', cursor: 'pointer', color: '#888' }} onClick={() => setIsAuthOpen(false)}>&times;</button>
        </div>
        <div style={{ padding: '25px', maxHeight: '70vh', overflowY: 'auto' }}>
          <form onSubmit={handleAuthSubmit}>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '8px', color: '#555' }}>帳戶 ID</label>
              <input type="text" value={authAccountId} onChange={(e) => setAuthAccountId(e.target.value)} style={{ width: '100%', padding: '12px 15px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px', outline: 'none' }} placeholder="例如：john123" required />
            </div>
            {isRegisterMode && (
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '8px', color: '#555' }}>電子郵件 (接收訂單通知)</label>
                <input type="email" value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} style={{ width: '100%', padding: '12px 15px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px', outline: 'none' }} placeholder="example@email.com" required />
              </div>
            )}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '8px', color: '#555' }}>密碼 (至少 6 位數)</label>
              <input type="password" value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} style={{ width: '100%', padding: '12px 15px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px', outline: 'none' }} placeholder="請輸入密碼" required minLength={6} />
            </div>
            <button type="submit" style={{ width: '100%', background: '#FEF9C3', color: '#111', padding: '16px', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: 600, cursor: 'pointer', marginTop: '10px' }}>
              {isRegisterMode ? '立即註冊' : '登入系統'}
            </button>
          </form>
          <div style={{ textAlign: 'center', marginTop: '15px', fontSize: '13px' }}>
            <span style={{ color: '#888' }}>{isRegisterMode ? '已經有帳號了？' : '還沒有帳號？'}</span>
            <button onClick={() => setIsRegisterMode(!isRegisterMode)} style={{ color: '#111', fontWeight: 600, textDecoration: 'underline', marginLeft: '5px', background: 'none', border: 'none', cursor: 'pointer' }}>
              {isRegisterMode ? '點此登入' : '點此註冊'}
            </button>
          </div>
        </div>
      </div>

      {/* 頂部 Hero 與搜尋 */}
      <div style={{ padding: '100px 4% 0', maxWidth: '1400px', margin: '0 auto' }}>
        <header style={{ height: '35vh', backgroundColor: '#FEF9C3', borderRadius: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', padding: '0 20px' }}>
          <h1 style={{ fontSize: '36px', fontWeight: 600, letterSpacing: '4px', marginBottom: '15px' }}>日常的美好，源於細節</h1>
          <p style={{ fontSize: '14px', color: '#555', letterSpacing: '2px' }}>輕巧點綴你的每一天，展現毫不費力的生活美學。</p>
        </header>
        <div style={{ maxWidth: '600px', margin: '30px auto 0', padding: '0 4%' }}>
          <input 
            type="text" 
            value={searchKeyword}
            onChange={handleSearch}
            style={{ width: '100%', padding: '14px 20px', border: '1px solid #f0f0f0', borderRadius: '30px', fontSize: '14px', outline: 'none', background: '#fafafa', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}
            placeholder="🔍 搜尋商品名稱或分類..." 
          />
        </div>
      </div>

      {/* 商品列表 */}
      <main style={{ maxWidth: '1200px', margin: '40px auto', padding: '0 4%' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 600, letterSpacing: '2px', marginBottom: '40px', textAlign: 'center' }}>全站商品 / ALL ITEMS</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '50px 30px' }}>
          {filteredProducts.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#999', gridColumn: '1/-1', padding: '40px 0' }}>沒有找到符合條件的商品。</p>
          ) : (
            filteredProducts.map(p => {
              const validImages = p.images ? p.images.filter(img => img && img.trim() !== '') : [];
              const hasImages = validImages.length > 0;
              const activeIdx = sliderIndexes[p.id] || 0;

              return (
                <div key={p.id} style={{ backgroundColor: '#fff', display: 'flex', flexDirection: 'column', borderRadius: '10px', position: 'relative' }}>
                  {p.tag && (
                    <div style={{ position: 'absolute', top: '15px', left: '15px', backgroundColor: p.tag.toLowerCase() === 'hot' ? '#ff6b6b' : '#111', color: '#fff', fontSize: '10px', fontWeight: 800, padding: '4px 10px', zIndex: 10, borderRadius: '4px' }}>
                      {p.tag}
                    </div>
                  )}

                  <Link href={`/product/${p.id}`} style={{ textDecoration: 'none', color: 'inherit', display: 'block', flexGrow: 1 }}>
                    <div 
                      style={{ position: 'relative', width: '100%', height: '340px', backgroundColor: '#f9f9f8', borderRadius: '10px', overflow: 'hidden', marginBottom: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', touchAction: 'pan-y' }}
                      onTouchStart={handleTouchStart}
                      onTouchEnd={(e) => handleTouchEnd(p.id, e, validImages.length)}
                    >
                      {hasImages ? (
                        <>
                          {validImages.map((img, idx) => (
                            idx === activeIdx && (
                              <div key={idx} style={{ position: 'relative', width: '100%', height: '100%' }}>
                                <Image 
                                  src={img}
                                  alt={p.name}
                                  fill
                                  sizes="(max-width: 768px) 100vw, 300px"
                                  style={{ objectFit: 'cover' }}
                                  priority={idx === 0}
                                />
                              </div>
                            )
                          ))}
                          {validImages.length > 1 && (
                            <>
                              <button style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', left: '10px', background: 'rgba(0,0,0,0.4)', color: 'white', border: 'none', width: '30px', height: '30px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', zIndex: 5 }} onClick={(e) => { e.preventDefault(); moveSlide(p.id, -1, validImages.length); }}>&#10094;</button>
                              <button style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', right: '10px', background: 'rgba(0,0,0,0.4)', color: 'white', border: 'none', width: '30px', height: '30px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', zIndex: 5 }} onClick={(e) => { e.preventDefault(); moveSlide(p.id, 1, validImages.length); }}>&#10095;</button>
                              <div style={{ position: 'absolute', bottom: '10px', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '5px', zIndex: 5 }}>
                                {validImages.map((_, idx) => (
                                  <span key={idx} style={{ width: idx === activeIdx ? '16px' : '6px', height: '6px', borderRadius: idx === activeIdx ? '3px' : '50%', background: idx === activeIdx ? '#fff' : 'rgba(255,255,255,0.5)', cursor: 'pointer', transition: '0.3s' }} onClick={(e) => { e.preventDefault(); changeSlide(p.id, idx, validImages.length); }} />
                                ))}
                              </div>
                            </>
                          )}
                        </>
                      ) : (
                        <span style={{ fontSize: '13px', color: '#888' }}>{p.category || 'NO IMAGE'}</span>
                      )}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, padding: '0 5px' }}>
                      <h3 style={{ fontSize: '15px', fontWeight: 500, marginBottom: '10px', color: '#333' }}>{p.name}</h3>
                      <div style={{ fontSize: '15px', fontWeight: 600, marginBottom: '15px' }}>HKD {Number(p.price).toFixed(1)}</div>
                    </div>
                  </Link>

                  <button style={{ width: '100%', background: 'transparent', border: '1px solid #e5e5e5', borderRadius: '10px', padding: '12px', fontSize: '13px', cursor: 'pointer' }} onClick={() => addToCart(p.id)}>
                    加入購物車
                  </button>
                </div>
              );
            })
          )}
        </div>
      </main>

      {/* 購物車抽屜 */}
      <div className={`cart-drawer ${isCartOpen ? 'open' : ''}`}>
        <div style={{ padding: '30px 25px', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 600 }}>購物車清單 ({totalCount})</h2>
          <button style={{ background: 'none', border: 'none', fontSize: '26px', cursor: 'pointer', color: '#888' }} onClick={() => setIsCartOpen(false)}>&times;</button>
        </div>
        <div style={{ flexGrow: 1, overflowY: 'auto', padding: '25px' }}>
          {cart.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#aaa', marginTop: '50px' }}>購物車目前是空的喔</p>
          ) : (
            cart.map(item => (
              <div key={item.id} style={{ display: 'flex', gap: '15px', marginBottom: '25px', alignItems: 'center' }}>
                <div style={{ width: '60px', height: '70px', backgroundColor: '#f9f9f8', borderRadius: '6px', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '11px' }}>ITEM</div>
                <div style={{ flexGrow: 1 }}>
                  <div style={{ fontSize: '13px', fontWeight: 500, marginBottom: '5px' }}>{item.name}</div>
                  <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '10px' }}>HKD {Number(item.price).toFixed(1)}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <button style={{ background: '#f5f5f5', border: 'none', borderRadius: '50%', width: '24px', height: '24px', cursor: 'pointer' }} onClick={() => updateQuantity(item.id, -1)}>-</button>
                    <span style={{ fontSize: '13px' }}>{item.quantity}</span>
                    <button style={{ background: '#f5f5f5', border: 'none', borderRadius: '50%', width: '24px', height: '24px', cursor: 'pointer' }} onClick={() => updateQuantity(item.id, 1)}>+</button>
                    <button style={{ background: 'none', border: 'none', color: '#b0b0b0', fontSize: '12px', cursor: 'pointer', marginLeft: 'auto' }} onClick={() => removeFromCart(item.id)}>移除</button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
        <div style={{ padding: '25px', borderTop: '1px solid #f0f0f0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '14px' }}><span>商品小計</span><span>HKD {Number(currentTotal).toFixed(1)}</span></div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', paddingTop: '15px', borderTop: '1px solid #f0f0f0', fontSize: '16px', fontWeight: 600 }}><span>訂單總計</span><span>HKD {Number(currentTotal).toFixed(1)}</span></div>
          <button style={{ width: '100%', backgroundColor: '#111', color: '#fff', border: 'none', borderRadius: '10px', padding: '16px', cursor: 'pointer', fontSize: '14px' }} onClick={() => { setIsCartOpen(false); setIsPaymentOpen(true); }}>前往結帳 Checkout</button>
        </div>
      </div>

      {/* 結帳 Modal */}
      <div className={`payment-modal ${isPaymentOpen ? 'open' : ''}`}>
        <div style={{ padding: '25px', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fafafa' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 600 }}>安全結帳</h2>
          <button style={{ background: 'none', border: 'none', fontSize: '26px', cursor: 'pointer', color: '#888' }} onClick={() => setIsPaymentOpen(false)}>&times;</button>
        </div>
        <div style={{ padding: '25px', maxHeight: '70vh', overflowY: 'auto' }}>
          <form onSubmit={handleCheckoutSubmit}>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '8px', color: '#555' }}>收件人姓名</label>
              <input type="text" value={shippingName} onChange={(e) => setShippingName(e.target.value)} style={{ width: '100%', padding: '12px 15px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px', outline: 'none' }} placeholder="請輸入真實姓名" required />
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '8px', color: '#555' }}>電子郵件 (接收訂單通知)</label>
              <input type="email" value={shippingEmail} onChange={(e) => setShippingEmail(e.target.value)} style={{ width: '100%', padding: '12px 15px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px', outline: 'none' }} placeholder="example@email.com" required />
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '8px', color: '#555' }}>收件地址</label>
              <input type="text" value={shippingAddress} onChange={(e) => setShippingAddress(e.target.value)} style={{ width: '100%', padding: '12px 15px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px', outline: 'none' }} placeholder="請輸入完整收件地址" required />
            </div>
            
            <hr style={{ border: 0, borderTop: '1px dashed #eee', margin: '25px 0' }} />
            
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '8px', color: '#555' }}>信用卡資訊 (模擬)</label>
            <div style={{ padding: '15px', border: '1px solid #ddd', borderRadius: '8px', background: '#f9f9f9', display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
              <div style={{ fontSize: '24px' }}>💳</div>
              <div style={{ flexGrow: 1 }}>
                <input type="text" value={cardNumber} onChange={(e) => setCardNumber(e.target.value)} style={{ width: '100%', border: 'none', padding: 0, background: 'transparent', marginBottom: '5px', outline: 'none', fontSize: '14px' }} placeholder="0000 0000 0000 0000" required />
                <div style={{ display: 'flex', gap: '10px' }}>
                  <input type="text" value={cardExpiry} onChange={handleExpiryInput} style={{ width: '60px', border: 'none', padding: 0, background: 'transparent', outline: 'none', fontSize: '14px' }} placeholder="MM/YY" required maxLength={5} />
                  <input type="text" value={cardCvc} onChange={(e) => setCardCvc(e.target.value)} style={{ width: '50px', border: 'none', padding: 0, background: 'transparent', outline: 'none', fontSize: '14px' }} placeholder="CVC" required maxLength={4} />
                </div>
              </div>
            </div>

            <button type="submit" disabled={isPaying} style={{ width: '100%', background: '#FEF9C3', color: '#111', padding: '16px', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: 600, cursor: 'pointer', marginTop: '10px' }}>
              {isPaying ? '付款處理中...' : `確認付款 HKD ${currentTotal.toLocaleString()}`}
            </button>
          </form>
        </div>
      </div>

      {/* 吐司通知 */}
      <div style={{ position: 'fixed', bottom: '20px', left: '50%', transform: `translateX(-50%) translateY(${isToastShow ? '0' : '150%'})`, backgroundColor: '#333', color: '#fff', padding: '12px 25px', borderRadius: '30px', fontSize: '13px', fontWeight: 500, zIndex: 4000, transition: 'all 0.4s ease' }}>
        {toastMessage}
      </div>

      <footer style={{ backgroundColor: '#fafafa', color: '#888', textAlign: 'center', padding: '40px 20px', fontSize: '12px', marginTop: '100px' }}>
        <p>&copy; 2026 LIGHTNING LIFESTYLE. ALL RIGHTS RESERVED.</p>
      </footer>
    </div>
  );
}