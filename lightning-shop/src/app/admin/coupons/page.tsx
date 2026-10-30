'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import firebase from 'firebase/compat/app';

interface Coupon {
  id: string;
  code: string;
  discountText: string;
  minSpend: number;
  discountType: 'fixed' | 'percent';
  discountValue: number;
  usesLeft: number;
}

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [code, setCode] = useState('');
  const [discountText, setDiscountText] = useState('');
  const [minSpend, setMinSpend] = useState('');
  const [discountType, setDiscountType] = useState<'fixed' | 'percent'>('fixed');
  const [discountValue, setDiscountValue] = useState('');
  const [usesLeft, setUsesLeft] = useState('');
  
  const [toastMsg, setToastMsg] = useState('');
  const [isToastShow, setIsToastShow] = useState(false);

  // 即時監聽優惠券列表
  useEffect(() => {
    const unsubscribe = db.collection("coupons").orderBy("createdAt", "desc").onSnapshot((snapshot) => {
      const list: Coupon[] = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() } as Coupon);
      });
      setCoupons(list);
    });
    return () => unsubscribe();
  }, []);

  const showToast = (message: string) => {
    setToastMsg(message);
    setIsToastShow(true);
    setTimeout(() => setIsToastShow(false), 3000);
  };

  // 發放/新增優惠券
  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || !discountValue || !usesLeft) {
      alert('請填寫完整優惠券資訊！');
      return;
    }

    try {
      const couponId = code.trim().toUpperCase();
      await db.collection("coupons").doc(couponId).set({
        code: couponId,
        discountText: discountText.trim() || `${couponId} 專屬優惠`,
        minSpend: Number(minSpend) || 0,
        discountType,
        discountValue: Number(discountValue),
        usesLeft: Number(usesLeft),
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });

      showToast(`✅ 成功發放優惠券：${couponId}`);
      setCode('');
      setDiscountText('');
      setMinSpend('');
      setDiscountValue('');
      setUsesLeft('');
    } catch (error: any) {
      alert('發放失敗： ' + error.message);
    }
  };

  // 刪除/停用優惠券
  const handleDeleteCoupon = async (couponId: string) => {
    if (!confirm(`確定要刪除優惠券 ${couponId} 嗎？`)) return;
    try {
      await db.collection("coupons").doc(couponId).delete();
      showToast('⚠️ 優惠券已刪除');
    } catch (error: any) {
      alert('刪除失敗：' + error.message);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-[24px] font-semibold mb-1">優惠券管理與發放</h1>
        <p className="text-[#888] text-[14px]">在此建立新優惠券並設定可用次數，前台購物車將自動同步。</p>
      </div>

      {/* 新增/發放表單 */}
      <div className="bg-white p-6 rounded-2xl border border-[#e5e5e5] shadow-xs mb-8 max-w-2xl">
        <h2 className="text-[16px] font-semibold mb-4">發放新優惠券</h2>
        <form onSubmit={handleCreateCoupon} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-600 mb-1">優惠代碼 (Code)</label>
              <input type="text" value={code} onChange={(e) => setCode(e.target.value)} placeholder="例如：SUMMER50" className="w-full p-3 border border-stone-200 rounded-xl text-sm uppercase" required />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-600 mb-1">可用總次數 (Uses Limit)</label>
              <input type="number" value={usesLeft} onChange={(e) => setUsesLeft(e.target.value)} placeholder="例如：100" className="w-full p-3 border border-stone-200 rounded-xl text-sm" required min={1} />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-600 mb-1">優惠描述文字</label>
            <input type="text" value={discountText} onChange={(e) => setDiscountText(e.target.value)} placeholder="例如：夏日全館滿千折百" className="w-full p-3 border border-stone-200 rounded-xl text-sm" />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-600 mb-1">折扣類型</label>
              <select value={discountType} onChange={(e) => setDiscountType(e.target.value as any)} className="w-full p-3 border border-stone-200 rounded-xl text-sm bg-white">
                <option value="fixed">固定金額折抵 ($)</option>
                <option value="percent">百分比折扣 (折數)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-600 mb-1">折扣數值</label>
              <input type="number" step="0.01" value={discountValue} onChange={(e) => setDiscountValue(e.target.value)} placeholder={discountType === 'fixed' ? '100' : '0.9'} className="w-full p-3 border border-stone-200 rounded-xl text-sm" required />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-600 mb-1">最低消費門檻 ($)</label>
              <input type="number" value={minSpend} onChange={(e) => setMinSpend(e.target.value)} placeholder="0 代表無門檻" className="w-full p-3 border border-stone-200 rounded-xl text-sm" />
            </div>
          </div>

          <button type="submit" className="w-full bg-[#111] text-white py-3.5 rounded-xl font-semibold text-sm hover:bg-stone-800 transition cursor-pointer mt-2">
            發放優惠券
          </button>
        </form>
      </div>

      {/* 現有優惠券列表 */}
      <div className="bg-white rounded-2xl border border-[#e5e5e5] p-6 shadow-xs">
        <h2 className="text-[16px] font-semibold mb-4">現有有效優惠券</h2>
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-stone-200 text-stone-500">
              <th className="pb-3 font-semibold">代碼</th>
              <th className="pb-3 font-semibold">說明</th>
              <th className="pb-3 font-semibold">門檻</th>
              <th className="pb-3 font-semibold">折扣內容</th>
              <th className="pb-3 font-semibold">剩餘次數</th>
              <th className="pb-3 font-semibold text-right">操作</th>
            </tr>
          </thead>
          <tbody>
            {coupons.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-6 text-stone-400">目前尚無任何優惠券</td></tr>
            ) : (
              coupons.map(c => (
                <tr key={c.id} className="border-b border-stone-100 hover:bg-stone-50">
                  <td className="py-3 font-mono font-bold">{c.code}</td>
                  <td className="py-3">{c.discountText}</td>
                  <td className="py-3">滿 ${c.minSpend}</td>
                  <td className="py-3">{c.discountType === 'fixed' ? `折 $${c.discountValue}` : `${c.discountValue * 10}折`}</td>
                  <td className="py-3 font-semibold text-amber-600">{c.usesLeft} 次</td>
                  <td className="py-3 text-right">
                    <button onClick={() => handleDeleteCoupon(c.id)} className="text-rose-600 hover:underline text-xs bg-rose-50 px-2.5 py-1 rounded-lg">刪除</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 吐司通知 */}
      <div className={`fixed bottom-4 left-1/2 -translate-x-1/2 bg-[#333] text-white px-6 py-3 rounded-full text-xs font-medium z-3000 transition-transform duration-300 ${isToastShow ? 'translate-y-0' : 'translate-y-[200%]'}`}>
        {toastMsg}
      </div>
    </div>
  );
}