'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { db, auth } from '@/lib/firebase';
import firebase from 'firebase/compat/app';

interface UserProfile {
  accountId: string;
  email: string;
  name?: string;
  phone?: string;
  gender?: string;
  birthday?: string;
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

  // 詳細個人資料編輯狀態
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editGender, setEditGender] = useState('prefer_not_to_say');
  const [editBirthday, setEditBirthday] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  // 帳戶註銷 Modal 狀態
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

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
            setEditGender(userData.gender || 'prefer_not_to_say');
            setEditBirthday(userData.birthday || '');
            setEditAddress(userData.address || '');
          } else {
            setProfile({ accountId: '會員', email: user.email || '' });
          }

          const unsubscribeCoupons = db.collection("coupons")
            .where("usesLeft", ">", 0)
            .onSnapshot((snapshot) => {
              const list: Coupon[] = [];
              const now = new Date().getTime();

              snapshot.forEach((doc) => {
                const { id, ...data } = doc.data() as any;
                const coupon = { id: doc.id, ...data } as Coupon;
                const isTargetUser = !coupon.targetAccountId || coupon.targetAccountId === docId;

                if (isTargetUser) {
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
    if (spent >= 3000) return { tier: '鑽石會員 Diamond', color: 'bg-[#B35B48] text-white border border-[#B35B48]', nextTier: '已達最高等級', progress: 100, target: 3000 };
    if (spent >= 1000) return { tier: '金卡會員 Gold', color: 'bg-[#C28C7A] text-white', nextTier: '鑽石會員', progress: Math.min(100, (spent / 3000) * 100), target: 3000 };
    return { tier: '銀卡會員 Silver', color: 'bg-[#F4F0EA] text-[#6E6058] border border-[#EBE5DF]', nextTier: '金卡會員', progress: Math.min(100, (spent / 1000) * 100), target: 1000 };
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
        gender: editGender,
        birthday: editBirthday,
        address: editAddress.trim(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });

      setProfile(prev => prev ? { 
        ...prev, 
        name: editName, 
        phone: editPhone, 
        gender: editGender, 
        birthday: editBirthday, 
        address: editAddress 
      } : null);

      showToast('✅ 個人資料已確認修改並成功儲存！');
    } catch (error: any) {
      alert('更新失敗：' + error.message);
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleLogout = () => {
    auth.signOut().then(() => {
      showToast('已成功登出帳戶');
      router.push('/');
    }).catch((error) => {
      alert('登出失敗：' + error.message);
    });
  };

  const handleAccountDeletion = async () => {
    if (deleteConfirmText !== '確認註銷帳戶') {
      alert('請正確輸入「確認註銷帳戶」文字以解鎖註銷程序！');
      return;
    }

    if (!currentUser || !profile?.accountId) return;

    setIsDeleting(true);
    try {
      // 1. 先嘗試刪除 Firebase Authentication 內的帳戶
      // (如果登入時間過久，這裡會直接跳錯，不會去動到底層的 Firestore，避免資料不一致)
      await currentUser.delete();

      // 2. Auth 刪除成功後，再刪除 Firestore 內的會員資料與相關紀錄
      await db.collection("users").doc(profile.accountId).delete();

      alert('您的帳戶已成功永久註銷。');
      router.push('/');
    } catch (error: any) {
      console.error('帳戶註銷失敗:', error);
      
      // 處理憑證過期需要重新登入的情況
      if (error.code === 'auth/requires-recent-login') {
        alert('為了您的帳戶安全，此操作需要重新驗證身分。\n請先點擊「登出」，然後重新登入帳戶後，再立即執行一次註銷帳戶。');
      } else {
        alert('註銷失敗：' + (error.message || '未知錯誤'));
      }
      
      setIsDeleting(false);
      setIsDeleteModalOpen(false);
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
        return <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-1 rounded-full text-xs font-medium">已完成訂單</span>;
      case 'shipping':
        return <span className="bg-blue-50 text-blue-800 border border-blue-200 px-3 py-1 rounded-full text-xs font-medium">已完成發貨 (配送中)</span>;
      case 'preparing':
        return <span className="bg-amber-50 text-amber-900 border border-amber-200 px-3 py-1 rounded-full text-xs font-medium">已完成備貨</span>;
      case 'paid':
        return <span className="bg-purple-50 text-purple-800 border border-purple-200 px-3 py-1 rounded-full text-xs font-medium">已確認付款</span>;
      case 'cancelled':
        return <span className="bg-rose-50 text-rose-800 border border-rose-200 px-3 py-1 rounded-full text-xs font-medium">訂單已取消</span>;
      default:
        return <span className="bg-[#F4F0EA] text-[#6E6058] border border-[#EBE5DF] px-3 py-1 rounded-full text-xs font-medium">待確認付款</span>;
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
      <div className="min-h-screen flex justify-center items-center bg-[#FAF7F2] text-[#8C7B70]">
        <div className="animate-pulse flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#EBE5DF] border-t-[#B35B48] rounded-full animate-spin"></div>
          <span className="text-sm">載入尊榮會員資料中...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#FAF7F2] text-[#382E2B] min-h-screen font-sans pb-20 relative">
      {/* 導覽列 */}
      <nav className="fixed top-0 left-0 w-full h-18.75 bg-[#FAF7F2]/95 backdrop-blur-sm flex justify-between items-center px-[6%] z-50 border-b border-[#EBE5DF]">
        <Link href="/" className="text-[18px] font-bold tracking-[3px] uppercase text-[#B35B48] no-underline">
          VILLA ATELIER
        </Link>
        <Link 
          href="/" 
          className="text-[13px] font-medium text-[#382E2B] py-2 px-4 rounded-full bg-[#F4F0EA] border border-[#EBE5DF] transition hover:bg-[#B35B48] hover:text-white no-underline flex items-center gap-1.5"
        >
          <span>←</span> 返回首頁購物
        </Link>
      </nav>

      <main className="max-w-4xl mx-auto pt-28 px-4 sm:px-6">
        {/* 會員尊榮卡片 (強調陶土紅光芒) */}
        <div className="bg-[#382E2B] text-[#FAF7F2] rounded-2xl p-6 sm:p-8 shadow-xl mb-8 relative overflow-hidden border border-[#4E403B]">
          <div className="absolute top-0 right-0 transform translate-x-8 -translate-y-8 w-44 h-44 bg-[#B35B48]/25 rounded-full blur-2xl pointer-events-none" />
          
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative z-10">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-serif tracking-wide text-[#FAF7F2]">
                  {profile?.name || profile?.accountId || '貴賓會員'}
                </h1>
                <span className={`text-xs px-3 py-1 rounded-full font-semibold ${currentTier.color}`}>
                  {currentTier.tier}
                </span>
              </div>
              <p className="text-[#C4B7AD] text-xs tracking-wider">
                帳號 ID: <span className="text-[#B35B48] font-mono font-bold">{profile?.accountId}</span> | Email: {profile?.email}
              </p>
            </div>

            <div className="flex gap-3">
              <div className="bg-[#FAF7F2]/10 border border-[#B35B48]/30 p-3.5 rounded-xl text-right min-w-32">
                <span className="text-xs text-[#D6C7BC] block mb-1">可用購物金</span>
                <span className="text-xl font-bold font-mono text-[#B35B48]">HKD ${profile?.storeCredit || 0}</span>
              </div>
              
              <div className="bg-[#FAF7F2]/10 border border-[#B35B48]/30 p-3.5 rounded-xl text-right min-w-36">
                <span className="text-xs text-[#D6C7BC] block mb-1">累積消費金額</span>
                <span className="text-xl font-bold font-mono text-[#FAF7F2]">HKD ${totalSpent.toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-[#4E403B] relative z-10">
            <div className="flex justify-between text-xs text-[#D6C7BC] mb-2">
              <span>會員權益進度</span>
              <span>
                {currentTier.nextTier === '已達最高等級' 
                  ? '已享有頂級尊榮特權' 
                  : `距離 ${currentTier.nextTier} 還差 HKD $${Math.max(0, currentTier.target - totalSpent).toLocaleString()}`}
              </span>
            </div>
            <div className="w-full bg-[#27201E] h-2 rounded-full overflow-hidden">
              <div 
                className="bg-[#B35B48] h-full rounded-full transition-all duration-500"
                style={{ width: `${currentTier.progress}%` }}
              />
            </div>
          </div>
        </div>

        {/* 分頁 Tab */}
        <div className="flex border-b border-[#EBE5DF] mb-8 overflow-x-auto no-scrollbar gap-2 md:gap-0.5">
          {[
            { id: 'orders', label: '📦 訂單記錄與進度', count: orders.length },
            { id: 'coupons', label: '🎟️ 專屬優惠卷', count: coupons.length },
            { id: 'credits', label: '💰 購物金紀錄', count: creditLogs.length },
            { id: 'favorites', label: '❤️ 我的收藏', count: favorites.length },
            { id: 'level', label: '👑 會員等級權益' },
            { id: 'profile', label: '⚙️ 個人資料與安全' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`pb-3.5 px-2 text-sm font-medium border-b-2 whitespace-nowrap transition flex items-center gap-2 cursor-pointer ${
                activeTab === tab.id
                  ? 'border-[#B35B48] text-[#B35B48] font-semibold'
                  : 'border-transparent text-[#7A6E65] hover:text-[#382E2B]'
              }`}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  activeTab === tab.id ? 'bg-[#B35B48] text-white' : 'bg-[#F4F0EA] text-[#6E6058]'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* TAB 1: 訂單記錄 */}
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
                      ? 'bg-[#B35B48] text-white font-semibold border-[#B35B48]'
                      : 'bg-[#F4F0EA] border-[#EBE5DF] text-[#6E6058] hover:bg-[#EBE5DF]'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {filteredOrders.length === 0 ? (
              <div className="text-center py-16 bg-[#F4F0EA] rounded-2xl border border-dashed border-[#EBE5DF]">
                <span className="text-4xl block mb-3">🛒</span>
                <p className="text-[#7A6E65] text-sm mb-4">目前沒有相關的訂單記錄</p>
                <Link href="/" className="inline-block bg-[#B35B48] text-white px-5 py-2.5 rounded-xl text-xs font-medium hover:bg-[#9B4C3A] transition no-underline">
                  立即前往選購商品
                </Link>
              </div>
            ) : (
              filteredOrders.map(order => (
                <div key={order.id} className="bg-white border border-[#EBE5DF] rounded-2xl p-5 sm:p-6 shadow-xs hover:shadow-md transition">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-4 border-b border-[#EBE5DF] gap-2">
                    <div>
                      <span className="text-xs text-[#8C7B70] block">訂單編號</span>
                      <span className="font-mono font-bold text-[#382E2B] text-sm">#{order.id}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      {getStatusBadge(order.status)}
                      <span className="text-xs text-[#8C7B70]">
                        {order.createdAt?.toDate ? order.createdAt.toDate().toLocaleDateString('zh-TW') : '近期的訂單'}
                      </span>
                    </div>
                  </div>

                  <div className="bg-[#F4F0EA] p-4 rounded-xl mb-4 border border-[#EBE5DF]">
                    <span className="text-xs font-semibold text-[#6E6058] block mb-3">物流進度狀態</span>
                    <div className="grid grid-cols-4 text-center text-xs relative">
                      <div className="absolute top-2.5 left-[12%] right-[12%] h-0.5 bg-[#EBE5DF] z-0" />
                      
                      {[
                        { title: '確認付款', active: order.status === 'paid' || order.status === 'preparing' || order.status === 'shipping' || order.status === 'completed' },
                        { title: '完成備貨', active: order.status === 'preparing' || order.status === 'shipping' || order.status === 'completed' },
                        { title: '完成發貨', active: order.status === 'shipping' || order.status === 'completed' },
                        { title: '訂單完成', active: order.status === 'completed' }
                      ].map((step, idx) => (
                        <div key={idx} className="relative z-10 flex flex-col items-center">
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] mb-1 font-bold ${
                            step.active ? 'bg-[#B35B48] text-white' : 'bg-[#EBE5DF] text-[#8C7B70]'
                          }`}>
                            {step.active ? '✓' : idx + 1}
                          </div>
                          <span className={`text-[11px] ${step.active ? 'text-[#382E2B] font-medium' : 'text-[#8C7B70]'}`}>
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
                          <div className="w-10 h-10 bg-[#F4F0EA] rounded-lg flex items-center justify-center text-xs font-mono text-[#8C7B70] border border-[#EBE5DF]">
                            品項
                          </div>
                          <div>
                            <p className="font-medium text-[#382E2B]">{item.name}</p>
                            <p className="text-xs text-[#8C7B70]">數量: x{item.quantity}</p>
                          </div>
                        </div>
                        <span className="font-mono text-[#B35B48]">HKD ${(item.price * item.quantity).toFixed(1)}</span>
                      </div>
                    ))}
                  </div>

                  <div className="pt-3 border-t border-[#EBE5DF] flex justify-between items-center text-sm">
                    <span className="text-xs text-[#7A6E65]">收件地址: {order.address || '未填寫'}</span>
                    <div className="text-right">
                      <span className="text-xs text-[#7A6E65] mr-2">總計金額</span>
                      <span className="font-bold font-mono text-[#B35B48] text-base">HKD ${order.total?.toFixed(1)}</span>
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
            {coupons.length === 0 ? (
              <div className="col-span-full text-center py-12 bg-[#F4F0EA] rounded-xl border border-dashed border-[#EBE5DF]">
                <span className="text-3xl block mb-2">🎟️</span>
                <p className="text-[#7A6E65] text-xs">目前沒有可用的專屬優惠券</p>
              </div>
            ) : (
              coupons.map(coupon => {
                const isPeriod = coupon.conditionType === 'periods' || coupon.conditionType === 'counts';
                const isUnlimitedPeriod = coupon.conditionType === 'periods';
                const isInfinite = coupon.conditionType === 'infinite';
                return (
                  <div key={coupon.id} className="border border-[#EBE5DF] rounded-2xl p-5 relative overflow-hidden bg-white shadow-xs hover:shadow-md transition">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <span className="text-xs font-semibold text-white bg-[#B35B48] px-2.5 py-0.5 rounded-md inline-block mb-2">
                          {coupon.discountText}
                        </span>
                        <p className="text-xs text-[#7A6E65]">
                          {coupon.minSpend > 0 ? `滿 HKD $${coupon.minSpend} 可使用` : '無最低消費限制'}
                        </p>
                      </div>
                    </div>

                    {isPeriod && coupon.endTime ? (
                      <div className="text-[11px] text-[#B35B48] mb-3 bg-[#F4F0EA] p-2 rounded-lg font-mono border border-[#EBE5DF]">
                        有效期限至：{coupon.endTime.replace('T', ' ')}
                      </div>
                    ) : (
                      <div className="text-[11px] text-[#B35B48] mb-3 bg-[#F4F0EA] p-2 rounded-lg font-mono border border-[#EBE5DF]">
                        永久有效，不限次數使用
                      </div>)
                    }

                    <div className="pt-3 border-t border-dashed border-[#EBE5DF] flex justify-between items-center">
                      <div>
                        <span className="text-[10px] text-[#8C7B70] block">
                          折扣代碼 ({isUnlimitedPeriod ? '期間不限次數' : isInfinite ? '無限次數' : `剩餘 ${coupon.usesLeft} 次`})
                        </span>
                        <span className="font-mono font-bold text-[#382E2B] text-sm">{coupon.code}</span>
                      </div>

                      <button
                        onClick={() => copyCouponCode(coupon.code)}
                        className="px-3 py-1.5 bg-[#B35B48] text-white rounded-lg text-xs hover:bg-[#9B4C3A] transition cursor-pointer"
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

        {/* TAB 3: 購物金 */}
        {activeTab === 'credits' && (
          <div className="bg-white border border-[#EBE5DF] rounded-2xl p-6 shadow-xs">
            <h3 className="font-semibold text-[#382E2B] text-base mb-2">💰 您的購物金與補償明細</h3>
            <p className="text-xs text-[#7A6E65] mb-6">包含管理員發放的客服補償、專屬獎勵及購物折抵紀錄。</p>

            {creditLogs.length === 0 ? (
              <div className="text-center py-12 bg-[#F4F0EA] rounded-xl border border-dashed border-[#EBE5DF]">
                <span className="text-3xl block mb-2">🪙</span>
                <p className="text-[#7A6E65] text-xs">目前尚無任何購物金變動紀錄</p>
              </div>
            ) : (
              <div className="space-y-3">
                {creditLogs.map(log => {
                  const isGrant = log.type === 'grant';
                  return (
                    <div key={log.id} className="p-4 rounded-xl border border-[#EBE5DF] bg-[#FAF7F2] flex justify-between items-center">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
                            isGrant ? 'bg-emerald-100 text-emerald-800' : 'bg-[#EBE5DF] text-[#6E6058]'
                          }`}>
                            {isGrant ? '商店發放 / 補償' : '訂單折抵使用'}
                          </span>
                          <span className="text-xs text-[#8C7B70]">
                            {log.createdAt?.toDate ? log.createdAt.toDate().toLocaleString('zh-TW') : '剛剛'}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-[#382E2B]">{log.reason || '無備註'}</p>
                      </div>
                      <div className={`text-sm font-bold font-mono ${isGrant ? 'text-emerald-700' : 'text-[#B35B48]'}`}>
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
          <div className="bg-white border border-[#EBE5DF] rounded-2xl p-6 shadow-xs">
            <h3 className="font-semibold text-[#382E2B] text-base mb-2">❤️ 我的收藏清單 ({favorites.length})</h3>
            <p className="text-xs text-[#7A6E65] mb-6">您隨手心動關注的選品，隨時可直接前往購買。</p>

            {favorites.length === 0 ? (
              <div className="text-center py-16 bg-[#F4F0EA] rounded-xl border border-dashed border-[#EBE5DF]">
                <span className="text-4xl block mb-3">💔</span>
                <p className="text-[#7A6E65] text-sm mb-4">目前尚未收藏任何選品喔</p>
                <Link href="/" className="inline-block bg-[#B35B48] text-white px-5 py-2.5 rounded-xl text-xs font-medium hover:bg-[#9B4C3A] transition no-underline">
                  前往首頁挑選商品
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {favorites.map(item => {
                  const hasImg = item.images && item.images.length > 0 && item.images[0].trim() !== '';
                  return (
                    <div key={item.id} className="flex gap-4 p-4 rounded-xl border border-[#EBE5DF] bg-[#FAF7F2] items-center hover:border-[#B35B48] transition">
                      <div className="relative w-20 h-20 bg-white rounded-lg overflow-hidden border border-[#EBE5DF] shrink-0 flex items-center justify-center">
                        {hasImg ? (
                          <Image src={item.images![0]} alt={item.name} fill className="object-cover" />
                        ) : (
                          <span className="text-[10px] text-[#8C7B70]">NO IMAGE</span>
                        )}
                      </div>
                      <div className="grow min-w-0">
                        <Link href={`/product/${item.id}`} className="text-sm font-medium text-[#382E2B] hover:underline truncate block mb-1 no-underline">
                          {item.name}
                        </Link>
                        <div className="text-xs font-bold font-mono text-[#B35B48] mb-3">
                          HKD ${Number(item.price).toFixed(1)}
                        </div>
                        <div className="flex gap-2">
                          <Link href={`/product/${item.id}`} className="text-xs bg-[#B35B48] text-white px-3 py-1.5 rounded-lg hover:bg-[#9B4C3A] transition no-underline">
                            查看選品
                          </Link>
                          <button 
                            onClick={() => handleRemoveFavorite(item.id)}
                            className="text-xs text-rose-700 hover:text-rose-900 bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-lg transition cursor-pointer"
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

        {/* TAB 5: 會員權益 */}
        {activeTab === 'level' && (
          <div className="space-y-4">
            <div className="bg-[#F4F0EA] border border-[#EBE5DF] rounded-2xl p-6">
              <h3 className="font-serif font-semibold text-[#382E2B] text-base mb-4">🏆 VILLA ATELIER 會員尊榮階級指南</h3>
              
              <div className="space-y-4 text-sm">
                <div className="p-4 bg-white rounded-xl border border-[#EBE5DF] flex justify-between items-center">
                  <div>
                    <h4 className="font-bold text-[#6E6058]">🥈 銀卡會員 Silver</h4>
                    <p className="text-xs text-[#7A6E65] mt-1">註冊即可加入 | 享有生日專屬禮券</p>
                  </div>
                  <span className="text-xs font-mono text-[#7A6E65]">滿 $0</span>
                </div>

                <div className="p-4 bg-[#C28C7A]/20 rounded-xl border border-[#C28C7A] flex justify-between items-center">
                  <div>
                    <h4 className="font-bold text-[#B35B48]">🥇 金卡會員 Gold</h4>
                    <p className="text-xs text-[#6E6058] mt-1">全館結帳享 95 折折扣 | 專屬免運券 x2 / 月</p>
                  </div>
                  <span className="text-xs font-mono font-semibold text-[#B35B48]">累積滿 HKD $1,000</span>
                </div>

                <div className="p-4 bg-[#B35B48] text-white rounded-xl flex justify-between items-center shadow-xs">
                  <div>
                    <h4 className="font-bold text-white">💎 鑽石會員 Diamond</h4>
                    <p className="text-xs text-stone-100 mt-1">全館結帳享 9 折最高折扣 | 全年免運費特權 | 新品優先搶購</p>
                  </div>
                  <span className="text-xs font-mono font-semibold text-white">累積滿 HKD $3,000</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: 個人資料修改 */}
        {activeTab === 'profile' && (
          <div className="space-y-6">
            <div className="bg-white border border-[#EBE5DF] rounded-2xl p-6 shadow-xs">
              <h3 className="font-semibold text-[#382E2B] text-base mb-1">詳細個人資料填寫</h3>
              <p className="text-xs text-[#7A6E65] mb-6">請填寫或更新您的詳細個人聯絡與基本資料，以確保享有完整的會員權益與配送服務。</p>
              
              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[#6E6058] mb-1.5">帳戶 ID (無法變更)</label>
                  <input 
                    type="text" 
                    value={profile?.accountId || ''} 
                    disabled 
                    className="w-full p-3 bg-[#F4F0EA] border border-[#EBE5DF] rounded-xl text-xs text-[#7A6E65] cursor-not-allowed font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#6E6058] mb-1.5">註冊電子郵件</label>
                  <input 
                    type="email" 
                    value={profile?.email || ''} 
                    disabled 
                    className="w-full p-3 bg-[#F4F0EA] border border-[#EBE5DF] rounded-xl text-xs text-[#7A6E65] cursor-not-allowed font-mono"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#6E6058] mb-1.5">收件人真實姓名</label>
                    <input 
                      type="text" 
                      value={editName} 
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="請輸入真實姓名"
                      className="w-full p-3 border border-[#EBE5DF] bg-[#FAF7F2] rounded-xl text-sm focus:outline-none focus:border-[#B35B48] transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#6E6058] mb-1.5">聯絡電話</label>
                    <input 
                      type="tel" 
                      value={editPhone} 
                      onChange={(e) => setEditPhone(e.target.value)}
                      placeholder="例如：+852 9123 4567"
                      className="w-full p-3 border border-[#EBE5DF] bg-[#FAF7F2] rounded-xl text-sm focus:outline-none focus:border-[#B35B48] transition"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#6E6058] mb-1.5">性別</label>
                    <select 
                      value={editGender}
                      onChange={(e) => setEditGender(e.target.value)}
                      className="w-full p-3 border border-[#EBE5DF] rounded-xl text-sm bg-[#FAF7F2] focus:outline-none focus:border-[#B35B48] transition cursor-pointer"
                    >
                      <option value="male">男性</option>
                      <option value="female">女性</option>
                      <option value="other">其他</option>
                      <option value="prefer_not_to_say">不願透露</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#6E6058] mb-1.5">生日</label>
                    <input 
                      type="date" 
                      value={editBirthday} 
                      onChange={(e) => setEditBirthday(e.target.value)}
                      className="w-full p-3 border border-[#EBE5DF] bg-[#FAF7F2] rounded-xl text-sm focus:outline-none focus:border-[#B35B48] transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#6E6058] mb-1.5">預設配送地址</label>
                  <input 
                    type="text" 
                    value={editAddress} 
                    onChange={(e) => setEditAddress(e.target.value)}
                    placeholder="請輸入完整的收件寄送地址"
                    className="w-full p-3 border border-[#EBE5DF] bg-[#FAF7F2] rounded-xl text-sm focus:outline-none focus:border-[#B35B48] transition"
                  />
                </div>

                {/* 修改確認按鈕 */}
                <button
                  type="submit"
                  disabled={isUpdatingProfile}
                  className="w-full bg-[#B35B48] text-white py-3.5 rounded-xl font-semibold text-sm hover:bg-[#9B4C3A] transition shadow-xs mt-4 cursor-pointer"
                >
                  {isUpdatingProfile ? '資料更新確認中...' : '確認修改並儲存個人資料'}
                </button>
              </form>
            </div>

            {/* 登出與註銷 */}
            <div className="bg-[#F4F0EA] border border-[#EBE5DF] rounded-2xl p-6 shadow-xs space-y-6">
              <div>
                <h3 className="font-semibold text-[#382E2B] text-base mb-1">帳戶登出 (Logout)</h3>
                <p className="text-xs text-[#7A6E65] mb-3">若您需要在共用裝置上登出目前帳戶，請點擊下方按鈕：</p>
                <button
                  onClick={handleLogout}
                  className="bg-[#382E2B] text-[#FAF7F2] px-5 py-2.5 rounded-xl text-xs font-semibold hover:bg-[#4E403B] transition cursor-pointer"
                >
                  登出目前帳戶
                </button>
              </div>

              <div className="pt-6 border-t border-[#EBE5DF]">
                <h3 className="font-semibold text-rose-700 text-base mb-1">⚠️ 帳戶註銷（永久刪除帳戶）方法</h3>
                <p className="text-xs text-[#7A6E65] mb-4 leading-relaxed">
                  註銷帳戶後，您的所有會員權益、購物金餘額、個人資料及歷史紀錄將被永久清除且無法復原。如果你確認不再使用本平台，可點擊下方按鈕執行註銷。
                </p>
                <button
                  onClick={() => { setDeleteConfirmText(''); setIsDeleteModalOpen(true); }}
                  className="bg-rose-700 text-white px-5 py-2.5 rounded-xl text-xs font-semibold hover:bg-rose-800 transition cursor-pointer"
                >
                  申請註銷帳戶
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* 註銷 Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-[#382E2B]/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-[#FAF7F2] rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#EBE5DF]">
            <h3 className="text-lg font-bold text-rose-700 mb-2">⚠️ 安全確認：您確定要註銷帳戶嗎？</h3>
            <p className="text-xs text-[#7A6E65] mb-4 leading-relaxed">
              此動作無法復原。系統將永久刪除您的所有資料、購物金及歷史紀錄。
            </p>
            <p className="text-xs font-semibold text-[#382E2B] mb-2">
              請在下方輸入框手動輸入 <span className="text-rose-700 font-mono">確認註銷帳戶</span>：
            </p>
            <input 
              type="text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="請輸入：確認註銷帳戶"
              className="w-full p-3 border border-[#EBE5DF] bg-white rounded-xl text-sm mb-6 focus:outline-none focus:border-rose-700 font-mono"
            />
            <div className="flex gap-3">
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="grow bg-[#F4F0EA] text-[#382E2B] py-3 rounded-xl text-xs font-medium hover:bg-[#EBE5DF] transition cursor-pointer"
              >
                取消返回
              </button>
              <button
                onClick={handleAccountDeletion}
                disabled={isDeleting || deleteConfirmText !== '確認註銷帳戶'}
                className="grow bg-rose-700 text-white py-3 rounded-xl text-xs font-semibold hover:bg-rose-800 transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {isDeleting ? '註銷中...' : '確認永久註銷'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 bg-[#382E2B] text-[#FAF7F2] px-6 py-3 rounded-full text-xs font-medium z-50 transition-transform duration-500 shadow-md ${isToastShow ? 'translate-y-0' : 'translate-y-[300%]'}`}>
        {toastMessage}
      </div>
    </div>
  );
}