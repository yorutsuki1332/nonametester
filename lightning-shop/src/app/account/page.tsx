'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
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

interface Coupon {
  id: string;
  code: string;
  discountText: string;
  minSpend: number;
  expireDate: string;
  isUsed: boolean;
}

export default function AccountPage() {
  const router = useRouter();

  // 狀態管理
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [activeTab, setActiveTab] = useState<'orders' | 'coupons' | 'level' | 'profile'>('orders');
  const [orderFilter, setOrderFilter] = useState<'all' | 'pending' | 'shipped' | 'delivered'>('all');
  const [loading, setLoading] = useState(true);

  // 個人資料編輯狀態
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  // 複製優惠碼狀態
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // 模擬優惠券資料（也可改為由 Firebase 載入）
  const [coupons] = useState<Coupon[]>([
    { id: '1', code: 'LIGHTNING100', discountText: 'HKD $100 折價券', minSpend: 500, expireDate: '2026-12-31', isUsed: false },
    { id: '2', code: 'WELCOMEVIP', discountText: '全館 9 折 VIP 專屬券', minSpend: 0, expireDate: '2026-11-30', isUsed: false },
    { id: '3', code: 'FREESHIP', discountText: '免運費優惠券', minSpend: 200, expireDate: '2026-10-15', isUsed: true },
  ]);

  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged(async (user) => {
      if (user) {
        setCurrentUser(user);
        try {
          // 取得用戶 Profile 資料
          const userQuery = await db.collection("users").where("uid", "==", user.uid).get();
          if (!userQuery.empty) {
            const userData = userQuery.docs[0].data() as UserProfile;
            const docId = userQuery.docs[0].id;
            setProfile({ ...userData, accountId: docId });
            setEditName(userData.name || '');
            setEditPhone(userData.phone || '');
            setEditAddress(userData.address || '');
          } else {
            setProfile({ accountId: '會員', email: user.email || '' });
          }

          // 訂閱該用戶訂單（比對 email 或特定欄位）
          const ordersQuery = db.collection("orders")
            .where("email", "==", user.email)
            .orderBy("createdAt", "desc");

          const unsubscribeOrders = ordersQuery.onSnapshot((snapshot) => {
            const list: Order[] = [];
            snapshot.forEach((doc) => {
              list.push({ id: doc.id, ...doc.data() } as Order);
            });
            setOrders(list);
            setLoading(false);
          }, (err) => {
            console.error("Orders fetch error:", err);
            setLoading(false);
          });

          return () => unsubscribeOrders();

        } catch (error) {
          console.error("Profile load error:", error);
          setLoading(false);
        }
      } else {
        // 未登入則導回首頁
        router.push('/');
      }
    });

    return () => unsubscribeAuth();
  }, [router]);

  // 計算累計消費金額
  const totalSpent = orders.reduce((sum, order) => sum + (order.total || 0), 0);

  // 會員等級判斷邏輯
  const getMemberTier = (spent: number) => {
    if (spent >= 3000) return { tier: '鑽石會員 Diamond', color: 'bg-stone-900 text-amber-200', nextTier: '已達最高等級', progress: 100, target: 3000 };
    if (spent >= 1000) return { tier: '金卡會員 Gold', color: 'bg-[#FEF9C3] text-stone-800', nextTier: '鑽石會員', progress: Math.min(100, (spent / 3000) * 100), target: 3000 };
    return { tier: '銀卡會員 Silver', color: 'bg-stone-100 text-stone-600', nextTier: '金卡會員', progress: Math.min(100, (spent / 1000) * 100), target: 1000 };
  };

  const currentTier = getMemberTier(totalSpent);

  // 儲存個人資料
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
      alert('✅ 個人資料已成功更新！');
    } catch (error: any) {
      alert('更新失敗：' + error.message);
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  // 複製優惠碼
  const copyCouponCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // 訂單狀態標籤樣式 (配合後台 status 命名)
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

  // 篩選後訂單 (配合後台 status 命名)
  const filteredOrders = orders.filter(o => {
    if (orderFilter === 'all') return true;
    if (orderFilter === 'pending') return o.status === 'pending' || o.status === 'preparing';
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
      {/* 頂部極簡導覽列 */}
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
        {/* 會員頂部名牌卡片 */}
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

            <div className="bg-stone-800/80 backdrop-blur border border-stone-700/50 p-3.5 rounded-xl text-right min-w-40">
              <span className="text-xs text-stone-400 block mb-1">累積消費金額</span>
              <span className="text-xl font-bold font-mono text-[#FEF9C3]">HKD ${totalSpent.toLocaleString()}</span>
            </div>
          </div>

          {/* 升級進度條 */}
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
        <div className="flex border-b border-stone-200 mb-8 overflow-x-auto no-scrollbar gap-2 sm:gap-8">
          {[
            { id: 'orders', label: '📦 訂單記錄與進度', count: orders.length },
            { id: 'coupons', label: '🎟️ 專屬優惠卷', count: coupons.filter(c => !c.isUsed).length },
            { id: 'level', label: '👑 會員等級權益' },
            { id: 'profile', label: '⚙️ 個人資料設定' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`pb-3.5 px-2 text-sm font-medium border-b-2 whitespace-nowrap transition flex items-center gap-2 ${
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
            {/* 訂單狀態快速過濾 */}
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
                  className={`px-3.5 py-1.5 text-xs rounded-lg transition border ${
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
                <Link href="/" className="inline-block bg-stone-900 text-white px-5 py-2.5 rounded-xl text-xs font-medium hover:bg-stone-800 transition">
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

                  {/* 視覺化物流進度 (完美對應後台 status) */}
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

                  {/* 商品清單 */}
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

        {/* TAB 2: 優惠卷 */}
        {activeTab === 'coupons' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {coupons.map(coupon => (
              <div 
                key={coupon.id} 
                className={`border rounded-2xl p-5 relative overflow-hidden transition ${
                  coupon.isUsed 
                    ? 'bg-stone-50 border-stone-200 opacity-60' 
                    : 'bg-white border-amber-200 shadow-sm hover:shadow-md'
                }`}
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <span className="text-xs font-semibold text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-md inline-block mb-2">
                      {coupon.discountText}
                    </span>
                    <p className="text-xs text-stone-500">
                      {coupon.minSpend > 0 ? `滿 HKD $${coupon.minSpend} 可使用` : '無最低消費限制'}
                    </p>
                  </div>
                  {coupon.isUsed && (
                    <span className="text-xs bg-stone-200 text-stone-600 px-2 py-0.5 rounded">已使用</span>
                  )}
                </div>

                <div className="pt-3 border-t border-dashed border-stone-200 flex justify-between items-center">
                  <div>
                    <span className="text-[10px] text-stone-400 block">折扣代碼</span>
                    <span className="font-mono font-bold text-stone-800 text-sm">{coupon.code}</span>
                  </div>

                  {!coupon.isUsed && (
                    <button
                      onClick={() => copyCouponCode(coupon.code)}
                      className="px-3 py-1.5 bg-stone-900 text-white rounded-lg text-xs hover:bg-stone-800 transition cursor-pointer"
                    >
                      {copiedCode === coupon.code ? '✅ 已複製' : '複製代碼'}
                    </button>
                  )}
                </div>
                <span className="text-[10px] text-stone-400 block mt-2">有效期限至：{coupon.expireDate}</span>
              </div>
            ))}
          </div>
        )}

        {/* TAB 3: 會員等級權益 */}
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
                    <p className="text-xs text-stone-300 mt-1">全館結帳享 9 折最高折扣 | 全全年免運費特權 | 新品優先搶購</p>
                  </div>
                  <span className="text-xs font-mono font-semibold text-amber-200">累積滿 HKD $3,000</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: 個人資料設定 */}
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
    </div>
  );
}