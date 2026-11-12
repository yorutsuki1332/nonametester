'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import firebase from 'firebase/compat/app';
import { errorMessage, withoutDocumentId } from '@/lib/errors';

interface UserProfile {
  id: string; // accountId (Doc ID)
  email: string;
  name?: string;
  storeCredit?: number;
}

interface Order {
  id: string;
  total: number;
  status: string;
  createdAt: firebase.firestore.Timestamp;
}

export default function AdminCreditsPage() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  
  // 會員訂單清單與選取的退款訂單
  const [userOrders, setUserOrders] = useState<Order[]>([]);
  // 🌟 記錄該會員所有已經發放過退款的訂單 ID 集合
  const [refundedOrderIds, setRefundedOrderIds] = useState<{ [orderId: string]: boolean }>({});
  
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [selectedOrderTotal, setSelectedOrderTotal] = useState<number>(0);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);

  // 發放表單狀態
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 🌟 自定義網頁主題彈窗狀態 (替代 alert)
  const [customModal, setCustomModal] = useState<{
    isOpen: boolean;
    title?: string;
    message: string;
  }>({
    isOpen: false,
    message: '',
  });

  const showAlert = (message: string, title = '提示訊息') => {
    setCustomModal({
      isOpen: true,
      title,
      message,
    });
  };

  // 吐司通知
  const [toastMsg, setToastMsg] = useState('');
  const [isToastShow, setIsToastShow] = useState(false);

  // 監聽所有會員資料
  useEffect(() => {
    const unsubscribe = db.collection("users").onSnapshot((snapshot) => {
      const list: UserProfile[] = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...withoutDocumentId(doc.data()) } as UserProfile);
      });
      setUsers(list);
    });
    return () => unsubscribe();
  }, []);

  const resetOrderForm = () => {
    setUserOrders([]);
    setRefundedOrderIds({});
    setSelectedOrderId('');
    setSelectedOrderTotal(0);
    setAmount('');
    setReason('');
  };

  const selectUser = (user: UserProfile) => {
    setSelectedUser(user);
    resetOrderForm();
    setIsLoadingOrders(true);
  };

  const clearSelectedUser = () => {
    setSelectedUser(null);
    resetOrderForm();
    setIsLoadingOrders(false);
  };

  // 當選取特定會員時，讀取該會員的訂單列表與已發放過退款的紀錄
  useEffect(() => {
    if (!selectedUser) return;

    let cancelled = false;
    const accountId = selectedUser.id;

    const fetchUserData = async () => {
      try {
        const ordersSnap = await db.collection("orders")
          .where("accountId", "==", accountId)
          .get();
        
        const list: Order[] = [];
        ordersSnap.forEach(doc => {
          list.push({ id: doc.id, ...withoutDocumentId(doc.data()) } as Order);
        });

        const logsSnap = await db.collection("users").doc(accountId).collection("credit_logs").get();
        const refundedMap: { [orderId: string]: boolean } = {};
        logsSnap.forEach(doc => {
          const logData = doc.data();
          if (typeof logData.orderId === 'string') {
            refundedMap[logData.orderId] = true;
          }
        });

        if (cancelled) return;
        setUserOrders(list);
        setRefundedOrderIds(refundedMap);
      } catch (err) {
        console.error("載入會員資料與訂單失敗:", err);
      } finally {
        if (!cancelled) setIsLoadingOrders(false);
      }
    };

    void fetchUserData();
    return () => {
      cancelled = true;
    };
  }, [selectedUser]);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setIsToastShow(true);
    setTimeout(() => setIsToastShow(false), 3000);
  };

  // 搜尋會員過濾
  const filteredUsers = users.filter(u => {
    const keyword = searchKeyword.trim().toLowerCase();
    if (!keyword) return true;
    return (
      u.id.toLowerCase().includes(keyword) ||
      (u.email && u.email.toLowerCase().includes(keyword)) ||
      (u.name && u.name.toLowerCase().includes(keyword))
    );
  });

  // 選擇退款訂單變更 Handler
  const handleOrderChange = (orderId: string) => {
    if (refundedOrderIds[orderId]) {
      showAlert('此筆訂單已經發放過退款，無法重複選擇！', '無法操作');
      return;
    }

    setSelectedOrderId(orderId);
    const order = userOrders.find(o => o.id === orderId);
    if (order) {
      setSelectedOrderTotal(order.total);
      setAmount(String(order.total));
      setReason(`訂單 #${order.id} 退款轉換購物金`);
    } else {
      setSelectedOrderTotal(0);
      setAmount('');
      setReason('');
    }
  };

  // 退款購物金 logic
  const handleGrantCredit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) {
      showAlert('請先選擇要退款的會員！', '提示');
      return;
    }
    if (!selectedOrderId) {
      showAlert('請選擇要進行退款的訂單！', '提示');
      return;
    }
    if (refundedOrderIds[selectedOrderId]) {
      showAlert('此筆訂單已經發放過退款，無法重複發放！', '重複發放');
      return;
    }

    const refundAmt = Number(amount);
    if (!refundAmt || refundAmt <= 0) {
      showAlert('請輸入有效的退款金額！', '格式錯誤');
      return;
    }
    
    if (refundAmt > selectedOrderTotal) {
      showAlert(`退款金額 (HKD $${refundAmt}) 不能超過該筆訂單總額 (HKD $${selectedOrderTotal})！`, '金額超出限制');
      return;
    }

    setIsSubmitting(true);
    try {
      const userRef = db.collection("users").doc(selectedUser.id);
      
      const userDoc = await userRef.get();
      const currentCredit = userDoc.data()?.storeCredit || 0;
      const newCredit = currentCredit + refundAmt;

      // 1. 更新會員總購物金
      await userRef.update({
        storeCredit: newCredit
      });

      // 2. 寫入變動紀錄 (附帶 orderId 以便後續檢查)
      await userRef.collection("credit_logs").add({
        type: 'grant',
        amount: refundAmt,
        orderId: selectedOrderId,
        reason: reason.trim() || `訂單 #${selectedOrderId} 退款購物金`,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });

      showToast(`✅ 已成功就訂單 #${selectedOrderId} 退款 HKD $${refundAmt} 至會員購物金！`);
      
      // 更新前端本地已發放紀錄快取
      setRefundedOrderIds(prev => ({ ...prev, [selectedOrderId]: true }));
      clearSelectedUser();
    } catch (error: unknown) {
      showAlert('退款失敗： ' + errorMessage(error), '系統錯誤');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="mb-8">
        <h1 className="text-2xl font-serif font-semibold mb-1 text-[#382E2B]">訂單退款轉購物金管理</h1>
        <p className="text-[#7A6E65] text-sm">搜尋特定會員並選擇其消費訂單，將退款金額轉為會員購物金。</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 左側：搜尋與選擇會員 */}
        <div className="lg:col-span-1 bg-white rounded-2xl p-5 border border-[#EBE5DF] shadow-[0_4px_20px_rgba(56,46,43,0.03)] flex flex-col h-150">
          <h2 className="text-base font-serif font-semibold mb-3 text-[#382E2B]">1. 選擇退款會員</h2>
          <input 
            type="text" 
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            placeholder="🔍 搜尋帳號 ID、姓名或 Email..."
            className="w-full py-2.5 px-3.5 border border-[#EBE5DF] rounded-xl text-sm outline-none mb-4 bg-[#FAF7F2] focus:bg-white focus:border-[#B35B48] transition"
          />

          <div className="grow overflow-y-auto space-y-2 pr-1">
            {filteredUsers.length === 0 ? (
              <p className="text-center text-xs text-[#7A6E65] py-8">找不到符合的會員</p>
            ) : (
              filteredUsers.map(u => (
                <div 
                  key={u.id}
                  onClick={() => selectUser(u)}
                  className={`p-3.5 rounded-xl border cursor-pointer transition flex justify-between items-center ${
                    selectedUser?.id === u.id
                      ? 'border-[#B35B48] bg-[#E6D5CC]/30 shadow-xs'
                      : 'border-[#EBE5DF] bg-white hover:bg-[#FAF7F2]'
                  }`}
                >
                  <div>
                    <div className="font-semibold text-sm text-[#382E2B]">{u.name || u.id}</div>
                    <div className="text-xs text-[#7A6E65]">{u.email}</div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-[#8C7B70] block">現有購物金</span>
                    <span className="text-xs font-bold font-mono text-[#B35B48]">HKD ${u.storeCredit || 0}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 右側：選擇退款訂單與發放表單 */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 md:p-8 border border-[#EBE5DF] shadow-[0_4px_20px_rgba(56,46,43,0.03)]">
          <h2 className="text-base font-serif font-semibold mb-5 pb-2.5 border-b border-[#EBE5DF] text-[#382E2B]">2. 選擇訂單與退款細節</h2>
          
          {selectedUser ? (
            <form onSubmit={handleGrantCredit} className="space-y-6">
              <div className="p-4 bg-[#FAF7F2] rounded-xl border border-[#EBE5DF] flex items-center justify-between">
                <div>
                  <span className="text-xs text-[#7A6E65] block">當前選中的會員</span>
                  <span className="font-bold text-sm text-[#382E2B]">{selectedUser.name || selectedUser.id} ({selectedUser.email})</span>
                </div>
                <button type="button" onClick={clearSelectedUser} className="text-xs text-rose-700 underline cursor-pointer">重新選擇</button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#6E6058] mb-2">
                  選擇要退款的訂單 <span className="text-[#B35B48]">*</span>
                </label>
                {isLoadingOrders ? (
                  <div className="text-xs text-[#7A6E65] py-2">載入會員訂單中...</div>
                ) : userOrders.length === 0 ? (
                  <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-xl">
                    ⚠️ 此會員目前沒有任何訂單記錄，無法進行訂單退款。
                  </div>
                ) : (
                  <select
                    value={selectedOrderId}
                    onChange={(e) => handleOrderChange(e.target.value)}
                    required
                    className="w-full p-3 border border-[#EBE5DF] rounded-xl text-sm bg-[#FAF7F2] focus:border-[#B35B48] transition cursor-pointer font-mono"
                  >
                    <option value="">-- 請選擇訂單 --</option>
                    {userOrders.map(o => {
                      const isRefunded = refundedOrderIds[o.id];
                      return (
                        <option 
                          key={o.id} 
                          value={o.id} 
                          disabled={isRefunded}
                          className={isRefunded ? 'text-stone-400 bg-stone-100' : ''}
                        >
                          #{o.id} - 訂單金額: HKD ${o.total?.toFixed(1)} {isRefunded ? ' (⚠️ 已發放過退款)' : ''}
                        </option>
                      );
                    })}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#6E6058] mb-2">
                  退款至購物金金額 (HKD) <span className="text-[#B35B48]">*</span>
                  {selectedOrderTotal > 0 && (
                    <span className="text-[11px] text-[#8C7B70] font-normal ml-2">
                      (最高上限: HKD ${selectedOrderTotal})
                    </span>
                  )}
                </label>
                <div className="relative">
                  <span className="absolute left-3.75 top-1/2 -translate-y-1/2 text-[#7A6E65] text-sm pointer-events-none">HKD</span>
                  <input 
                    type="number" 
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="請先選擇訂單"
                    min="1"
                    max={selectedOrderTotal || undefined}
                    step="0.1"
                    required
                    disabled={!selectedOrderId || refundedOrderIds[selectedOrderId]}
                    className="w-full py-3 pl-16 pr-4 border border-[#EBE5DF] rounded-xl text-sm outline-none bg-[#FAF7F2] focus:border-[#B35B48] transition font-mono disabled:bg-[#F4F0EA]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#6E6058] mb-2">
                  退款備註 / 原因 (會顯示於會員中心紀錄)
                </label>
                <input 
                  type="text" 
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="例如：訂單 #xxxx 商品瑕疵退款"
                  className="w-full py-3 px-4 border border-[#EBE5DF] rounded-xl text-sm outline-none bg-[#FAF7F2] focus:border-[#B35B48] transition"
                />
              </div>

              <button 
                type="submit" 
                disabled={isSubmitting || !selectedOrderId || refundedOrderIds[selectedOrderId]}
                className="w-full py-4 bg-[#B35B48] text-white rounded-xl font-semibold text-sm hover:bg-[#9B4C3A] transition cursor-pointer shadow-xs disabled:bg-[#EBE5DF] disabled:text-[#8C7B70] disabled:cursor-not-allowed"
              >
                {isSubmitting ? '退款處理中...' : `確認辦理退款至 ${selectedUser.id} 的購物金`}
              </button>
            </form>
          ) : (
            <div className="text-center py-24 text-[#7A6E65]">
              <span className="text-4xl block mb-3">👈</span>
              <p className="text-sm">請先於左側選取要辦理訂單退款的會員</p>
            </div>
          )}
        </div>
      </div>

      {/* 🌟 全域自定義網頁主題彈出介面 (替代 alert) */}
      {customModal.isOpen && (
        <div className="fixed inset-0 bg-[#382E2B]/40 backdrop-blur-xs z-5000 flex items-center justify-center p-4">
          <div className="bg-[#FAF7F2] border border-[#EBE5DF] rounded-2xl w-full max-w-sm p-6 shadow-[0_10px_40px_rgba(56,46,43,0.15)] animate-in fade-in zoom-in duration-200">
            <h3 className="text-base font-serif font-semibold text-[#382E2B] mb-2.5">
              {customModal.title || '提示訊息'}
            </h3>
            <p className="text-xs text-[#6E6058] mb-6 whitespace-pre-wrap leading-relaxed">
              {customModal.message}
            </p>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setCustomModal(prev => ({ ...prev, isOpen: false }))}
                className="px-5 py-2 bg-[#B35B48] text-white rounded-lg text-xs font-semibold hover:bg-[#9B4C3A] transition shadow-xs cursor-pointer"
              >
                確定
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 吐司通知 */}
      <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 bg-[#382E2B] text-[#FAF7F2] px-6 py-3 rounded-full text-[13px] font-medium z-3000 transition-transform duration-500 shadow-md ${isToastShow ? 'translate-y-0' : 'translate-y-[300%]'}`}>
        {toastMsg}
      </div>
    </>
  );
}