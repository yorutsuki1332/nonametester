'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import firebase from 'firebase/compat/app';

interface UserProfile {
  id: string; // accountId (Doc ID)
  email: string;
  name?: string;
  storeCredit?: number;
}

export default function AdminCreditsPage() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  
  // 發放表單狀態
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 吐司通知
  const [toastMsg, setToastMsg] = useState('');
  const [isToastShow, setIsToastShow] = useState(false);

  // 監聽所有會員資料
  useEffect(() => {
    const unsubscribe = db.collection("users").onSnapshot((snapshot) => {
      const list: UserProfile[] = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() } as UserProfile);
      });
      setUsers(list);
    });
    return () => unsubscribe();
  }, []);

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

  // 發放購物金 logic
  const handleGrantCredit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return alert('請先選擇要發放補償的會員！');
    if (!amount || Number(amount) <= 0) return alert('請輸入有效的發放金額！');

    setIsSubmitting(true);
    try {
      const grantAmount = Number(amount);
      const userRef = db.collection("users").doc(selectedUser.id);
      
      // 取得現有購物金
      const userDoc = await userRef.get();
      const currentCredit = userDoc.data()?.storeCredit || 0;
      const newCredit = currentCredit + grantAmount;

      // 1. 更新會員總購物金
      await userRef.update({
        storeCredit: newCredit
      });

      // 2. 寫入變動紀錄子集合 (credit_logs)
      await userRef.collection("credit_logs").add({
        type: 'grant', // 發放
        amount: grantAmount,
        reason: reason.trim() || '店家客服補償',
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });

      showToast(`✅ 已成功向會員 ${selectedUser.id} 發放 HKD $${grantAmount} 購物金！`);
      
      // 清空表單
      setSelectedUser(null);
      setAmount('');
      setReason('');
    } catch (error: any) {
      alert('發放失敗： ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold mb-1 text-[#333333]">特定會員購物金/補償發放</h1>
        <p className="text-[#888888] text-sm">搜尋並選擇指定會員，為其增加發放購物金作為客服補償或專屬獎勵。</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 左側：搜尋與選擇會員 */}
        <div className="lg:col-span-1 bg-white rounded-2xl p-5 border border-[#e5e5e5] shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex flex-col h-150">
          <h2 className="text-base font-semibold mb-3 text-[#333333]">1. 選擇受贈會員</h2>
          <input 
            type="text" 
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            placeholder="🔍 搜尋帳號 ID、姓名或 Email..."
            className="w-full py-2.5 px-3.5 border border-[#e5e5e5] rounded-xl text-sm outline-none mb-4 bg-[#fafafa] focus:bg-white focus:border-[#111] transition"
          />

          <div className="grow overflow-y-auto space-y-2 pr-1">
            {filteredUsers.length === 0 ? (
              <p className="text-center text-xs text-[#888888] py-8">找不到符合的會員</p>
            ) : (
              filteredUsers.map(u => (
                <div 
                  key={u.id}
                  onClick={() => setSelectedUser(u)}
                  className={`p-3.5 rounded-xl border cursor-pointer transition flex justify-between items-center ${
                    selectedUser?.id === u.id
                      ? 'border-[#111111] bg-[#FEF9C3]/50 shadow-xs'
                      : 'border-[#f0f0f0] bg-white hover:bg-[#fafafa]'
                  }`}
                >
                  <div>
                    <div className="font-semibold text-sm text-[#333333]">{u.name || u.id}</div>
                    <div className="text-xs text-[#888888]">{u.email}</div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-[#888888] block">現有購物金</span>
                    <span className="text-xs font-bold font-mono text-[#d4a373]">HKD ${u.storeCredit || 0}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 右側：發放補償表單 */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 md:p-8 border border-[#e5e5e5] shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
          <h2 className="text-base font-semibold mb-5 pb-2.5 border-b border-[#e5e5e5] text-[#333333]">2. 設定補償發放細節</h2>
          
          {selectedUser ? (
            <form onSubmit={handleGrantCredit} className="space-y-6">
              <div className="p-4 bg-[#fafafa] rounded-xl border border-[#eee] flex items-center justify-between">
                <div>
                  <span className="text-xs text-[#888888] block">當前選中的會員</span>
                  <span className="font-bold text-sm text-[#111]">{selectedUser.name || selectedUser.id} ({selectedUser.email})</span>
                </div>
                <button type="button" onClick={() => setSelectedUser(null)} className="text-xs text-[#ff6b6b] underline cursor-pointer">重新選擇</button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#333333] mb-2">
                  補償購物金金額 (HKD) <span className="text-[#ff6b6b]">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.75 top-1/2 -translate-y-1/2 text-[#888888] text-sm pointer-events-none">HKD</span>
                  <input 
                    type="number" 
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="例如：50"
                    min="1"
                    step="1"
                    required
                    className="w-full py-3 pl-16 pr-4 border border-[#e5e5e5] rounded-xl text-sm outline-none focus:border-[#d4a373] transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#333333] mb-2">
                  發放備註 / 補償原因 (會顯示於會員中心)
                </label>
                <input 
                  type="text" 
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="例如：訂單 #202610003 商品出貨延誤補償"
                  className="w-full py-3 px-4 border border-[#e5e5e5] rounded-xl text-sm outline-none focus:border-[#d4a373] transition"
                />
              </div>

              <button 
                type="submit" 
                disabled={isSubmitting}
                className="w-full py-4 bg-[#111111] text-white rounded-xl font-semibold text-sm hover:bg-[#333333] transition cursor-pointer"
              >
                {isSubmitting ? '正在發放中...' : `確認向 ${selectedUser.id} 發放購物金`}
              </button>
            </form>
          ) : (
            <div className="text-center py-24 text-[#888888]">
              <span className="text-4xl block mb-3">👈</span>
              <p className="text-sm">請先於左側選取要發放補償購物金的會員</p>
            </div>
          )}
        </div>
      </div>

      {/* 吐司通知 */}
      <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 bg-[#333333] text-white px-6 py-3 rounded-full text-xs font-medium z-3000 transition-transform duration-500 ${isToastShow ? 'translate-y-0' : 'translate-y-[200%]'}`}>
        {toastMsg}
      </div>
    </>
  );
}