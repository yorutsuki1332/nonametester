'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { db, auth } from '@/lib/firebase';
import firebase from 'firebase/compat/app';

// 介面定義
interface UserProfile {
  accountId: string;
  email: string;
  name?: string;
  phone?: string;
  address?: string;
  totalSpent?: number;
  storeCredit?: number;
}

interface Order {
  id: string;
  total: number;
  status: 'pending' | 'paid' | 'preparing' | 'shipping' | 'completed' | 'cancelled';
  createdAt: any;
  items: Array<{
    id: string;
    name: string;
    price: number;
    quantity: number;
  }>;
  name?: string;
  address?: string;
}

// 優惠券介面 (新增期間欄位)
interface Coupon {
  id: string;
  code: string;
  discountText: string;
  minSpend: number;
  usesLeft: number;
  targetAccountId?: string | null;
  conditionType?: 'infinite' | 'counts' | 'periods';
  startTime?: string | null;
  endTime?: string | null;
}

interface CreditLog {
  id: string;
  type: 'grant' | 'use';
  amount: number;
  reason: string;
  createdAt: any;
}

interface FavoriteItem {
  id: string;
  name: string;
  price: number;
  images?: string[];
  category?: string;
}

export default function AccountPage() {
  const router = useRouter();

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [creditLogs, setCreditLogs] = useState<CreditLog[]>([]);
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  
  const [activeTab, setActiveTab] = useState<'orders' | 'coupons' | 'credits' | 'favorites' | 'level' | 'profile'>('orders');
  const [orderFilter, setOrderFilter] = useState<'all' | 'pending' | 'shipped' | 'delivered'>('all');
  const [loading, setLoading] = useState(true);

  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState('');
  const [isToastShow, setIsToastShow] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setIsToastShow(true);
    setTimeout(() => setIsToastShow(false), 2500);
  };

  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged(async (user) => {
      if (user) {
        setCurrentUser(user);
        try {
          const userQuery = await db.collection("users").where("uid", "==", user.uid).get();
          let docId = '';
          if (!userQuery.empty) {
            const userDoc = userQuery.docs[0];
            const userData = userDoc.data() as UserProfile;
            docId = userDoc.id;
            setProfile({ ...userData, accountId: docId });
            setEditName(userData.name || '');
            setEditPhone(userData.phone || '');
            setEditAddress(userData.address || '');
          } else {
            setProfile({ accountId: '會員', email: user.email || '' });
          }

          // 🌟 2. 即時訂閱優惠券：過濾全站通用/指定會員，並自動隱藏未生效與已過期的期間優惠券
          const unsubscribeCoupons = db.collection("coupons")
            .where("usesLeft", ">", 0)
            .onSnapshot((snapshot) => {
              const list: Coupon[] = [];
              const now = new Date().getTime();

              snapshot.forEach((doc) => {
                const { id, ...data } = doc.data() as any;
                const coupon = { id: doc.id, ...data } as Coupon;

                // 檢查是否為當前用戶的優惠券 (全站通用 或 指定給當前會員)
                const isTargetUser = !coupon.targetAccountId || coupon.targetAccountId === docId;

                if (isTargetUser) {
                  // 若為期間優惠券，檢查是否已過期或未開始
                  if ((coupon.conditionType === 'periods' || coupon.conditionType === 'counts') && coupon.startTime && coupon.endTime) {
                    const start = new Date(coupon.startTime).getTime();
                    const end = new Date(coupon.endTime).getTime();
                    if (now >= start && now <= end) {
                      list.push(coupon);
                    }
                  } else {
                    list.push(coupon);
                  }
                }
              });
              setCoupons(list);
            });

          let unsubscribeCreditLogs = () => {};
          let unsubscribeFavorites = () => {};

          if (docId) {
            unsubscribeCreditLogs = db.collection("users").doc(docId).collection("credit_logs")
              .orderBy("createdAt", "desc")
              .onSnapshot((snapshot) => {
                const logs: CreditLog[] = [];
                snapshot.forEach((doc) => {
                  const { id, ...data } = doc.data() as any;
                  logs.push({ id: doc.id, ...data });
                });
                setCreditLogs(logs);
              });

            unsubscribeFavorites = db.collection("users").doc(docId).collection("favorites")
              .onSnapshot(async (favSnap) => {
                const favProductIds = favSnap.docs.map(doc => doc.id);
                if (favProductIds.length === 0) {
                  setFavorites([]);
                  return;
                }

                const productPromises = favProductIds.map(id => db.collection("products").doc(id).get());
                const productDocs = await Promise.all(productPromises);
                
                const favList: FavoriteItem[] = [];
                productDocs.forEach(pDoc => {
                  if (pDoc.exists) {
                    favList.push({ id: pDoc.id, ...pDoc.data() } as FavoriteItem);
                  }
                });
                setFavorites(favList);
              });
          }

          const ordersQuery = db.collection("orders")
            .where("email", "==", user.email)
            .orderBy("createdAt", "desc");

          const unsubscribeOrders = ordersQuery.onSnapshot((snapshot) => {
            const list: Order[] = [];
            snapshot.forEach((doc) => {
              const { id, ...data } = doc.data() as any;
              list.push({ id: doc.id, ...data });
            });
            setOrders(list);
            setLoading(false);
          }, (err) => {
            console.error("Orders fetch error:", err);
            setLoading(false);
          });

          return () => {
            unsubscribeOrders();
            unsubscribeCreditLogs();
            unsubscribeCoupons();
            unsubscribeFavorites();
          };

        } catch (error) {
          console.error("Profile load error:", error);
          setLoading(false);
        }
      } else {
        router.push('/');
      }
    });

    return () => unsubscribeAuth();
  }, [router]);

  const totalSpent = orders.reduce((sum, order) => sum + (order.total || 0), 0);

  const getMemberTier = (spent: number) => {
    if (spent >= 3000) return { tier: '鑽石會員 Diamond', color: 'bg-stone-900 text-amber-200', nextTier: '已達最高等級', progress: 100, target: 3000 };
    if (spent >= 1000) return { tier: '金卡會員 Gold', color: 'bg-[#FEF9C3] text-stone-800', nextTier: '鑽石會員', progress: Math.min(100, (spent / 3000) * 100), target: 3000 };
    return { tier: '銀卡會員 Silver', color: 'bg-stone-100 text-stone-600', nextTier: '金卡會員', progress: Math.min(100, (spent / 1000) * 100), target: 1000 };
  };

  const currentTier = getMemberTier(totalSpent);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.accountId) return;

    setIsUpdatingProfile(true);
    try {
      await db.collection("users").doc(profile.accountId).update({
        name: editName.trim(),
        phone: editPhone.trim(),
        address: editAddress.trim(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });

      setProfile(prev => prev ? { ...prev, name: editName, phone: editPhone, address: editAddress } : null);
      showToast('✅ 個人資料已成功更新！');
    } catch (error: any) {
      alert('更新失敗：' + error.message);
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const copyCouponCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleRemoveFavorite = async (productId: string) => {
    if (!profile?.accountId) return;
    try {
      await db.collection("users").doc(profile.accountId).collection("favorites").doc(productId).delete();
      showToast('已移除該收藏商品');
    } catch (err: any) {
      alert('移除失敗：' + err.message);
    }
  };

  const getStatusBadge = (status: Order['status']) => {
    switch (status) {
      case 'completed':
        return <span className="bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full text-xs font-medium">已完成訂單</span>;
      case 'shipping':
        return <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-xs font-medium">已完成發貨 (配送中)</span>;
      case 'preparing':
        return <span className="bg-amber-50 text-amber-600 px-3 py-1 rounded-full text-xs font-medium">已完成備貨</span>;
      case 'paid':
        return <span className="bg-purple-50 text-purple-600 px-3 py-1 rounded-full text-xs font-medium">已確認付款</span>;
      case 'cancelled':
        return <span className="bg-rose-50 text-rose-600 px-3 py-1 rounded-full text-xs font-medium">訂單已取消</span>;
      default:
        return <span className="bg-stone-100 text-stone-600 px-3 py-1 rounded-full text-xs font-medium">待確認付款</span>;
    }
  };

  const filteredOrders = orders.filter(o => {
    if (orderFilter === 'all') return true;
    if (orderFilter === 'pending') return o.status === 'pending' || o.status === 'paid' || o.status === 'preparing';
    if (orderFilter === 'shipped') return o.status === 'shipping';
    if (orderFilter === 'delivered') return o.status === 'completed';
    return true;
  });

  if (loading) {
    return (
      <div className="min-h-screen flex justify-center items-center bg-white text-stone-400">
        <div className="animate-pulse flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-stone-300 border-t-stone-800 rounded-full animate-spin"></div>
          <span className="text-sm">載入會員資料中...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white text-[#333333] min-h-screen font-sans pb-20">
      <nav className="fixed top-0 left-0 w-full h-18.75 bg-white/95 backdrop-blur-sm flex justify-between items-center px-[6%] z-50 border-b border-[#f0f0f0]">
        <Link href="/" className="text-[20px] font-bold tracking-[2px] uppercase text-[#333] no-underline">
          LIGHTNING
        </Link>
        <Link 
          href="/" 
          className="text-[13px] font-medium text-[#333] py-2 px-4 rounded-full bg-[#fafafa] border border-[#f0f0f0] transition hover:bg-[#FEF9C3] no-underline flex items-center gap-1.5"
        >
          <span>←</span> 返回首頁購物
        </Link>
      </nav>

      <main className="max-w-4xl mx-auto pt-28 px-4 sm:px-6">
        <div className="bg-linear-to-r from-stone-900 via-stone-800 to-stone-900 text-white rounded-2xl p-6 sm:p-8 shadow-xl mb-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 transform translate-x-8 -translate-y-8 w-40 h-40 bg-[#FEF9C3]/10 rounded-full blur-2xl pointer-events-none" />
          
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative z-10">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-semibold tracking-wide">
                  {profile?.name || profile?.accountId || '貴賓會員'}
                </h1>
                <span className={`text-xs px-3 py-1 rounded-full font-semibold ${currentTier.color}`}>
                  {currentTier.tier}
                </span>
              </div>
              <p className="text-stone-400 text-xs tracking-wider">
                帳號 ID: <span className="text-stone-200 font-mono">{profile?.accountId}</span> | Email: {profile?.email}
              </p>
            </div>

            <div className="flex gap-3">
              <div className="bg-amber-500/20 border border-amber-400/30 p-3.5 rounded-xl text-right min-w-32">
                <span className="text-xs text-amber-200 block mb-1">可用購物金</span>
                <span className="text-xl font-bold font-mono text-amber-300">HKD ${profile?.storeCredit || 0}</span>
              </div>
              
              <div className="bg-stone-800/80 backdrop-blur border border-stone-700/50 p-3.5 rounded-xl text-right min-w-36">
                <span className="text-xs text-stone-400 block mb-1">累積消費金額</span>
                <span className="text-xl font-bold font-mono text-[#FEF9C3]">HKD ${totalSpent.toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-stone-700/60 relative z-10">
            <div className="flex justify-between text-xs text-stone-300 mb-2">
              <span>會員權益進度</span>
              <span>
                {currentTier.nextTier === '已達最高等級' 
                  ? '已享有頂級尊榮特權' 
                  : `距離 ${currentTier.nextTier} 還差 HKD $${Math.max(0, currentTier.target - totalSpent).toLocaleString()}`}
              </span>
            </div>
            <div className="w-full bg-stone-700 h-2 rounded-full overflow-hidden">
              <div 
                className="bg-linear-to-r from-amber-200 to-[#FEF9C3] h-full rounded-full transition-all duration-500"
                style={{ width: `${currentTier.progress}%` }}
              />
            </div>
          </div>
        </div>

        {/* 分頁 Tab 切換 */}
        <div className="flex border-b border-stone-200 mb-8 overflow-x-auto no-scrollbar gap-2 sm:gap-1.5">
          {[
            { id: 'orders', label: '📦 訂單記錄與進度', count: orders.length },
            { id: 'coupons', label: '🎟️ 專屬優惠卷', count: coupons.length },
            { id: 'credits', label: '💰 購物金紀錄', count: creditLogs.length },
            { id: 'favorites', label: '❤️ 我的收藏', count: favorites.length },
            { id: 'level', label: '👑 會員等級權益' },
            { id: 'profile', label: '⚙️ 個人資料設定' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`pb-3.5 px-2 text-sm font-medium border-b-2 whitespace-nowrap transition flex items-center gap-2 cursor-pointer ${
                activeTab === tab.id
                  ? 'border-stone-900 text-stone-900 font-semibold'
                  : 'border-transparent text-stone-500 hover:text-stone-800'
              }`}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  activeTab === tab.id ? 'bg-stone-900 text-white' : 'bg-stone-100 text-stone-600'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* TAB 1: 訂單記錄與進度 */}
        {activeTab === 'orders' && (
          <div className="space-y-6">
            <div className="flex gap-2 mb-4 overflow-x-auto">
              {[
                { id: 'all', label: '全部訂單' },
                { id: 'pending', label: '待處理 / 備貨中' },
                { id: 'shipped', label: '配送中' },
                { id: 'delivered', label: '已送達完成' }
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setOrderFilter(f.id as any)}
                  className={`px-3.5 py-1.5 text-xs rounded-lg transition border cursor-pointer ${
                    orderFilter === f.id
                      ? 'bg-[#FEF9C3] border-amber-300 text-stone-900 font-semibold'
                      : 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {filteredOrders.length === 0 ? (
              <div className="text-center py-16 bg-stone-50 rounded-2xl border border-dashed border-stone-200">
                <span className="text-4xl block mb-3">🛒</span>
                <p className="text-stone-500 text-sm mb-4">目前沒有相關的訂單記錄</p>
                <Link href="/" className="inline-block bg-stone-900 text-white px-5 py-2.5 rounded-xl text-xs font-medium hover:bg-stone-800 transition no-underline">
                  立即前往選購商品
                </Link>
              </div>
            ) : (
              filteredOrders.map(order => (
                <div key={order.id} className="bg-white border border-stone-200 rounded-2xl p-5 sm:p-6 shadow-sm hover:shadow-md transition">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-4 border-b border-stone-100 gap-2">
                    <div>
                      <span className="text-xs text-stone-400 block">訂單編號</span>
                      <span className="font-mono font-bold text-stone-800 text-sm">#{order.id}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      {getStatusBadge(order.status)}
                      <span className="text-xs text-stone-400">
                        {order.createdAt?.toDate ? order.createdAt.toDate().toLocaleDateString('zh-TW') : '近期的訂單'}
                      </span>
                    </div>
                  </div>

                  <div className="bg-stone-50 p-4 rounded-xl mb-4">
                    <span className="text-xs font-semibold text-stone-700 block mb-3">物流進度狀態</span>
                    <div className="grid grid-cols-4 text-center text-xs relative">
                      <div className="absolute top-2.5 left-[12%] right-[12%] h-0.5 bg-stone-200 z-0" />
                      
                      {[
                        { title: '確認付款', active: order.status === 'paid' || order.status === 'preparing' || order.status === 'shipping' || order.status === 'completed' },
                        { title: '完成備貨', active: order.status === 'preparing' || order.status === 'shipping' || order.status === 'completed' },
                        { title: '完成發貨', active: order.status === 'shipping' || order.status === 'completed' },
                        { title: '訂單完成', active: order.status === 'completed' }
                      ].map((step, idx) => (
                        <div key={idx} className="relative z-10 flex flex-col items-center">
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] mb-1 font-bold ${
                            step.active ? 'bg-stone-900 text-[#FEF9C3]' : 'bg-stone-200 text-stone-500'
                          }`}>
                            {step.active ? '✓' : idx + 1}
                          </div>
                          <span className={`text-[11px] ${step.active ? 'text-stone-900 font-medium' : 'text-stone-400'}`}>
                            {step.title}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3 mb-4">
                    {order.items?.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center text-sm">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-stone-100 rounded-lg flex items-center justify-center text-xs font-mono text-stone-400">
                            品項
                          </div>
                          <div>
                            <p className="font-medium text-stone-800">{item.name}</p>
                            <p className="text-xs text-stone-400">數量: x{item.quantity}</p>
                          </div>
                        </div>
                        <span className="font-mono text-stone-700">HKD ${(item.price * item.quantity).toFixed(1)}</span>
                      </div>
                    ))}
                  </div>

                  <div className="pt-3 border-t border-stone-100 flex justify-between items-center text-sm">
                    <span className="text-xs text-stone-500">收件地址: {order.address || '未填寫'}</span>
                    <div className="text-right">
                      <span className="text-xs text-stone-500 mr-2">總計金額</span>
                      <span className="font-bold font-mono text-stone-900 text-base">HKD ${order.total?.toFixed(1)}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* 🌟 TAB 2: 優惠卷 (顯示使用期限提示) */}
        {activeTab === 'coupons' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {coupons.length === 0 ? (
              <div className="col-span-full text-center py-12 bg-stone-50 rounded-xl border border-dashed border-stone-200">
                <span className="text-3xl block mb-2">🎟️</span>
                <p className="text-stone-500 text-xs">目前沒有可用的專屬優惠券</p>
              </div>
            ) : (
              coupons.map(coupon => {
                const isPeriod = coupon.conditionType === 'periods' || coupon.conditionType === 'counts';
                return (
                  <div key={coupon.id} className="border border-amber-200 rounded-2xl p-5 relative overflow-hidden sm:content-between bg-white shadow-sm hover:shadow-md transition">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <span className="text-xs font-semibold text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-md inline-block mb-2">
                          {coupon.discountText}
                        </span>
                        <p className="text-xs text-stone-500">
                          {coupon.minSpend > 0 ? `滿 HKD $${coupon.minSpend} 可使用` : '無最低消費限制'}
                        </p>
                      </div>
                      {coupon.targetAccountId ? (
                        <span className="text-[10px] bg-stone-900 text-amber-200 px-2 py-0.5 rounded font-mono">專屬發放</span>
                      ) : isPeriod ? (
                        <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-medium">期間限時</span>
                      ) : null}
                    </div>

                    {isPeriod && coupon.endTime && (
                      <div className="text-[11px] text-blue-600 mb-3 bg-blue-50/60 p-2 rounded-lg font-mono">
                        有效期限至：{coupon.endTime.replace('T', ' ')}
                      </div>
                    )}

                    {!isPeriod && (
                      <div className="text-[11px] text-yellow-600 mb-3 bg-yellow-50/60 p-2 rounded-lg font-mono">
                        無有效期限
                      </div> 
                    )}

                    <div className="pt-3 border-t border-dashed border-stone-200 flex justify-between items-center">
                      <div>
                        <span className="text-[10px] text-stone-400 block">
                          折扣代碼 ({isPeriod ? '期間不限次數' : `剩餘 ${coupon.usesLeft} 次`})
                        </span>
                        <span className="font-mono font-bold text-stone-800 text-sm">{coupon.code}</span>
                      </div>

                      <button
                        onClick={() => copyCouponCode(coupon.code)}
                        className="px-3 py-1.5 bg-stone-900 text-white rounded-lg text-xs hover:bg-stone-800 transition cursor-pointer"
                      >
                        {copiedCode === coupon.code ? '✅ 已複製' : '複製代碼'}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* TAB 3: 購物金與補償紀錄 */}
        {activeTab === 'credits' && (
          <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-sm">
            <h3 className="font-semibold text-stone-800 text-base mb-2">💰 您的購物金與補償明細</h3>
            <p className="text-xs text-stone-500 mb-6">包含管理員發放的客服補償、專屬獎勵及購物折抵紀錄。</p>

            {creditLogs.length === 0 ? (
              <div className="text-center py-12 bg-stone-50 rounded-xl border border-dashed border-stone-200">
                <span className="text-3xl block mb-2">🪙</span>
                <p className="text-stone-500 text-xs">目前尚無任何購物金變動紀錄</p>
              </div>
            ) : (
              <div className="space-y-3">
                {creditLogs.map(log => {
                  const isGrant = log.type === 'grant';
                  return (
                    <div key={log.id} className="p-4 rounded-xl border border-stone-100 bg-stone-50/50 flex justify-between items-center">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
                            isGrant ? 'bg-emerald-100 text-emerald-700' : 'bg-stone-200 text-stone-700'
                          }`}>
                            {isGrant ? '商店發放 / 補償' : '訂單折抵使用'}
                          </span>
                          <span className="text-xs text-stone-400">
                            {log.createdAt?.toDate ? log.createdAt.toDate().toLocaleString('zh-TW') : '剛剛'}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-stone-800">{log.reason || '無備註'}</p>
                      </div>
                      <div className={`text-sm font-bold font-mono ${isGrant ? 'text-emerald-600' : 'text-stone-700'}`}>
                        {isGrant ? `+HKD $${log.amount}` : `-HKD $${log.amount}`}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: 我的收藏 */}
        {activeTab === 'favorites' && (
          <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-sm">
            <h3 className="font-semibold text-stone-800 text-base mb-2">❤️ 我的收藏清單 ({favorites.length})</h3>
            <p className="text-xs text-stone-500 mb-6">您隨手心動關注的商品，隨時可直接前往購買。</p>

            {favorites.length === 0 ? (
              <div className="text-center py-16 bg-stone-50 rounded-xl border border-dashed border-stone-200">
                <span className="text-4xl block mb-3">💔</span>
                <p className="text-stone-500 text-sm mb-4">目前尚未收藏任何商品喔</p>
                <Link href="/" className="inline-block bg-stone-900 text-white px-5 py-2.5 rounded-xl text-xs font-medium hover:bg-stone-800 transition no-underline">
                  前往首頁挑選商品
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {favorites.map(item => {
                  const hasImg = item.images && item.images.length > 0 && item.images[0].trim() !== '';
                  return (
                    <div key={item.id} className="flex gap-4 p-4 rounded-xl border border-stone-200 bg-stone-50/50 items-center hover:border-amber-300 transition">
                      <div className="relative w-20 h-20 bg-white rounded-lg overflow-hidden border border-stone-200 shrink-0 flex items-center justify-center">
                        {hasImg ? (
                          <Image src={item.images![0]} alt={item.name} fill className="object-cover" />
                        ) : (
                          <span className="text-[10px] text-stone-400">NO IMAGE</span>
                        )}
                      </div>
                      <div className="grow min-w-0">
                        <Link href={`/product/${item.id}`} className="text-sm font-medium text-stone-900 hover:underline truncate block mb-1 no-underline">
                          {item.name}
                        </Link>
                        <div className="text-xs font-bold font-mono text-amber-900 mb-3">
                          HKD ${Number(item.price).toFixed(1)}
                        </div>
                        <div className="flex gap-2">
                          <Link href={`/product/${item.id}`} className="text-xs bg-stone-900 text-white px-3 py-1.5 rounded-lg hover:bg-stone-800 transition no-underline">
                            查看商品
                          </Link>
                          <button 
                            onClick={() => handleRemoveFavorite(item.id)}
                            className="text-xs text-rose-600 hover:text-rose-800 bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-lg transition cursor-pointer"
                          >
                            移除收藏
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 5: 會員等級權益 */}
        {activeTab === 'level' && (
          <div className="space-y-4">
            <div className="bg-stone-50 border border-stone-200 rounded-2xl p-6">
              <h3 className="font-semibold text-stone-800 text-base mb-4">🏆 LIGHTNING 會員尊榮階級指南</h3>
              
              <div className="space-y-4 text-sm">
                <div className="p-4 bg-white rounded-xl border border-stone-200 flex justify-between items-center">
                  <div>
                    <h4 className="font-bold text-stone-700">🥈 銀卡會員 Silver</h4>
                    <p className="text-xs text-stone-500 mt-1">註冊即可加入 | 享有生日專屬禮券</p>
                  </div>
                  <span className="text-xs font-mono text-stone-500">滿 $0</span>
                </div>

                <div className="p-4 bg-[#FEF9C3]/40 rounded-xl border border-amber-200 flex justify-between items-center">
                  <div>
                    <h4 className="font-bold text-stone-900">🥇 金卡會員 Gold</h4>
                    <p className="text-xs text-stone-600 mt-1">全館結帳享 95 折折扣 | 專屬免運券 x2 / 月</p>
                  </div>
                  <span className="text-xs font-mono font-semibold text-stone-800">累積滿 HKD $1,000</span>
                </div>

                <div className="p-4 bg-stone-900 text-white rounded-xl flex justify-between items-center">
                  <div>
                    <h4 className="font-bold text-amber-200">💎 鑽石會員 Diamond</h4>
                    <p className="text-xs text-stone-300 mt-1">全館結帳享 9 折最高折扣 | 全年免運費特權 | 新品優先搶購</p>
                  </div>
                  <span className="text-xs font-mono font-semibold text-amber-200">累積滿 HKD $3,000</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: 個人資料設定 */}
        {activeTab === 'profile' && (
          <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-sm">
            <h3 className="font-semibold text-stone-800 text-base mb-6">修改基本聯絡與預設收件資料</h3>
            
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-1.5">帳號 ID (無法變更)</label>
                <input 
                  type="text" 
                  value={profile?.accountId || ''} 
                  disabled 
                  className="w-full p-3 bg-stone-100 border border-stone-200 rounded-xl text-xs text-stone-500 cursor-not-allowed font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-1.5">收件人姓名</label>
                <input 
                  type="text" 
                  value={editName} 
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="請輸入常用收件人真實姓名"
                  className="w-full p-3 border border-stone-200 rounded-xl text-sm focus:outline-none focus:border-stone-900 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-1.5">聯絡電話</label>
                <input 
                  type="tel" 
                  value={editPhone} 
                  onChange={(e) => setEditPhone(e.target.value)}
                  placeholder="請輸入常用手機號碼"
                  className="w-full p-3 border border-stone-200 rounded-xl text-sm focus:outline-none focus:border-stone-900 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-1.5">預設配送地址</label>
                <input 
                  type="text" 
                  value={editAddress} 
                  onChange={(e) => setEditAddress(e.target.value)}
                  placeholder="請輸入完整的寄送地址"
                  className="w-full p-3 border border-stone-200 rounded-xl text-sm focus:outline-none focus:border-stone-900 transition"
                />
              </div>

              <button
                type="submit"
                disabled={isUpdatingProfile}
                className="w-full bg-[#FEF9C3] text-stone-900 py-3.5 rounded-xl font-semibold text-sm hover:bg-amber-200 transition shadow-sm mt-4 cursor-pointer"
              >
                {isUpdatingProfile ? '更新儲存中...' : '儲存變更資料'}
              </button>
            </form>
          </div>
        )}
      </main>

      {/* 吐司通知 */}
      <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 bg-[#333333] text-white px-6 py-3 rounded-full text-xs font-medium z-50 transition-transform duration-500 ${isToastShow ? 'translate-y-0' : 'translate-y-[300%]'}`}>
        {toastMessage}
      </div>
    </div>
  );
}