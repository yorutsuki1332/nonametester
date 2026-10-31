'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import firebase from 'firebase/compat/app';

interface UserProfile {
  id: string; // accountId
  email: string;
  name?: string;
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
  startTime?: string;
  endTime?: string;
}

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  
  const [code, setCode] = useState('');
  const [discountText, setDiscountText] = useState('');
  const [minSpend, setMinSpend] = useState('');
  const [discountType, setDiscountType] = useState<'fixed' | 'percent'>('fixed');
  const [discountValue, setDiscountValue] = useState('');
  const [usesLeft, setUsesLeft] = useState('1');
  const [targetAccountId, setTargetAccountId] = useState('');
  const [conditionType, setConditionType] = useState<'infinite' | 'counts' | 'periods'>('counts');
  
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  
  const [toastMsg, setToastMsg] = useState('');
  const [isToastShow, setIsToastShow] = useState(false);

  useEffect(() => {
    const unsubscribeCoupons = db.collection("coupons").orderBy("createdAt", "desc").onSnapshot((snapshot) => {
      const list: Coupon[] = [];
      snapshot.forEach((doc) => {
        const { id, ...data } = doc.data() as any;
        list.push({ id: doc.id, ...data });
      });
      setCoupons(list);
    });

    const unsubscribeUsers = db.collection("users").onSnapshot((snapshot) => {
      const userList: UserProfile[] = [];
      snapshot.forEach((doc) => {
        userList.push({ id: doc.id, ...doc.data() } as UserProfile);
      });
      setUsers(userList);
    });

    return () => {
      unsubscribeCoupons();
      unsubscribeUsers();
    };
  }, []);

  const showToast = (message: string) => {
    setToastMsg(message);
    setIsToastShow(true);
    setTimeout(() => setIsToastShow(false), 3000);
  };

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || !discountValue) {
      alert('請填寫完整優惠券資訊！');
      return;
    }

    if (conditionType === 'periods' && (!startTime || !endTime)) {
      alert('期間優惠必須填寫開始時間與完結時間！');
      return;
    }

    // 🌟 永久有效與期間優惠皆設定為無限次數 (99999)
    const finalUses = (conditionType === 'infinite' || conditionType === 'periods') ? 99999 : Number(usesLeft) || 1;

    try {
      const couponId = code.trim().toUpperCase();
      await db.collection("coupons").doc(couponId).set({
        code: couponId,
        discountText: discountText.trim() || `${couponId} 專屬優惠`,
        minSpend: Number(minSpend) || 0,
        discountType,
        discountValue: Number(discountValue),
        usesLeft: finalUses,
        conditionType,
        startTime: conditionType === 'periods' ? startTime : null,
        endTime: conditionType === 'periods' ? endTime : null,
        targetAccountId: targetAccountId.trim() ? targetAccountId.trim() : null,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });

      showToast(`✅ 成功發放優惠券：${couponId}${targetAccountId ? ` (指定給: @${targetAccountId})` : ' (全站通用)'}`);
      setCode('');
      setDiscountText('');
      setMinSpend('');
      setDiscountValue('');
      setUsesLeft('1');
      setTargetAccountId('');
      setConditionType('counts');
      setStartTime('');
      setEndTime('');
    } catch (error: any) {
      alert('發放失敗： ' + error.message);
    }
  };

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
    <>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold mb-1 text-[#333333]">優惠券管理與指定發放</h1>
        <p className="text-[#888888] text-sm">建立全站優惠券或指定特定會員帳號發放專屬折扣。</p>
      </div>

      <div className="bg-white rounded-2xl p-5 md:p-10 shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-[#e5e5e5] mb-8">
        <h2 className="text-base font-semibold mb-5 pb-2.5 border-b border-[#e5e5e5] text-[#333333]">發放新優惠券</h2>
        <form onSubmit={handleCreateCoupon}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-[#333333]">優惠代碼 (Code) <span className="text-[#ff6b6b] ml-1">*</span></label>
              <input type="text" value={code} onChange={(e) => setCode(e.target.value)} placeholder="例如：VIP50" className="py-3 px-4 border border-[#e5e5e5] rounded-lg text-sm uppercase outline-none focus:border-[#d4a373] transition" required />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-[#333333]">有效條件 <span className="text-[#ff6b6b] ml-1">*</span></label>
              <select 
                value={conditionType} 
                onChange={(e) => setConditionType(e.target.value as any)}
                className="py-3 px-4 border border-[#e5e5e5] rounded-lg text-sm outline-none bg-white focus:border-[#d4a373] transition"
              >
                <option value="infinite">永久有效</option>
                <option value="counts">有限次數</option>
                <option value="periods">期間優惠</option>
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-[#333333]">指定會員帳號 (選填)</label>
              <select 
                value={targetAccountId} 
                onChange={(e) => setTargetAccountId(e.target.value)} 
                className="py-3 px-4 border border-[#e5e5e5] rounded-lg text-sm outline-none bg-white focus:border-[#d4a373] transition"
              >
                <option value="">-- 全站通用（不指定特定會員） --</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>
                    @{u.id} {u.name ? `(${u.name})` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-[#333333]">可用總次數 <span className="text-[#ff6b6b] ml-1">*</span></label>
              <input 
                type="number" 
                value={conditionType === 'counts' ? usesLeft : ''} 
                onChange={(e) => setUsesLeft(e.target.value)} 
                placeholder={conditionType === 'counts' ? '例如：1' : '無限次數'} 
                className="py-3 px-4 border border-[#e5e5e5] rounded-lg text-sm outline-none focus:border-[#d4a373] transition disabled:bg-stone-100 disabled:text-stone-400 placeholder:text-stone-400" 
                required={conditionType === 'counts'} 
                disabled={conditionType !== 'counts'}
                min={1} 
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-[#333333]">開始時間 {conditionType === 'periods' && <span className="text-[#ff6b6b] ml-1">*</span>}</label>
              <input
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                style={{ accentColor: '#d4a373' }}
                className="py-3 px-4 border border-[#e5e5e5] rounded-lg text-sm outline-none bg-white focus:border-[#d4a373] transition disabled:bg-stone-100 disabled:text-stone-400"
                required={conditionType === 'periods'}
                disabled={conditionType !== 'periods'}
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-[#333333]">完結時間 {conditionType === 'periods' && <span className="text-[#ff6b6b] ml-1">*</span>}</label>
              <input
                type="datetime-local"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                style={{ accentColor: '#d4a373' }}
                className="py-3 px-4 border border-[#e5e5e5] rounded-lg text-sm outline-none bg-white focus:border-[#d4a373] transition disabled:bg-stone-100 disabled:text-stone-400"
                required={conditionType === 'periods'}
                disabled={conditionType !== 'periods'}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2 mb-6">
            <label className="text-xs font-semibold text-[#333333]">優惠描述文字</label>
            <input type="text" value={discountText} onChange={(e) => setDiscountText(e.target.value)} placeholder="例如：客服補償專屬 9 折券" className="py-3 px-4 border border-[#e5e5e5] rounded-lg text-sm outline-none focus:border-[#d4a373] transition" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-[#333333]">折扣類型</label>
              <select value={discountType} onChange={(e) => setDiscountType(e.target.value as any)} className="py-3 px-4 border border-[#e5e5e5] rounded-lg text-sm outline-none bg-white focus:border-[#d4a373] transition">
                <option value="fixed">固定金額折抵 ($)</option>
                <option value="percent">百分比折扣 (折數)</option>
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-[#333333]">折扣數值 <span className="text-[#ff6b6b] ml-1">*</span></label>
              <input type="number" step="0.01" value={discountValue} onChange={(e) => setDiscountValue(e.target.value)} placeholder={discountType === 'fixed' ? '100' : '0.9'} className="py-3 px-4 border border-[#e5e5e5] rounded-lg text-sm outline-none focus:border-[#d4a373] transition" required />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-[#333333]">最低消費門檻 ($)</label>
              <input type="number" value={minSpend} onChange={(e) => setMinSpend(e.target.value)} placeholder="0 代表無門檻" className="py-3 px-4 border border-[#e5e5e5] rounded-lg text-sm outline-none focus:border-[#d4a373] transition" />
            </div>
          </div>

          <button type="submit" className="w-full md:w-auto py-3 px-7 rounded-full text-sm font-medium bg-[#111111] text-white hover:bg-[#333333] transition cursor-pointer">
            發放優惠券
          </button>
        </form>
      </div>

      <div className="bg-white rounded-2xl p-5 md:p-10 shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-[#e5e5e5]">
        <h2 className="text-base font-semibold mb-5 pb-2.5 border-b border-[#e5e5e5] text-[#333333]">現有優惠券列表</h2>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-[#e5e5e5] text-[#888888]">
                <th className="pb-3 font-semibold">代碼</th>
                <th className="pb-3 font-semibold">發放對象</th>
                <th className="pb-3 font-semibold">有效條件 / 狀態</th>
                <th className="pb-3 font-semibold">說明</th>
                <th className="pb-3 font-semibold">折扣內容</th>
                <th className="pb-3 font-semibold">剩餘次數</th>
                <th className="pb-3 font-semibold text-right">操作</th>
              </tr>
            </thead>
            <tbody>
              {coupons.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-8 text-[#888888]">目前尚無任何優惠券</td></tr>
              ) : (
                coupons.map(c => {
                  const now = new Date().getTime();
                  const isExpired = c.conditionType === 'periods' && c.endTime ? new Date(c.endTime).getTime() < now : false;

                  return (
                    <tr key={c.id} className="border-b border-[#f4f4f2] hover:bg-[#fafaf9]">
                      <td className="py-3.5 font-mono font-bold text-[#111111]">{c.code}</td>
                      <td className="py-3.5 text-xs">
                        {c.targetAccountId ? (
                          <span className="bg-amber-100 text-amber-800 px-2.5 py-1 rounded-md font-mono font-semibold">@{c.targetAccountId} 專屬</span>
                        ) : (
                          <span className="bg-stone-100 text-stone-600 px-2.5 py-1 rounded-md">全站通用</span>
                        )}
                      </td>
                      <td className="py-3.5 text-xs">
                        {c.conditionType === 'infinite' ? (
                          <span className="text-emerald-600 font-medium">永久有效</span>
                        ) : c.conditionType === 'periods' ? (
                          <div>
                            {isExpired ? (
                              <span className="text-red-500 font-bold block">🔴 已過期</span>
                            ) : (
                              <span className="text-blue-600 font-medium block">🟢 期間優惠 (進行中)</span>
                            )}
                            <span className="text-[10px] text-stone-400">{c.startTime?.replace('T', ' ')} ~ {c.endTime?.replace('T', ' ')}</span>
                          </div>
                        ) : (
                          <span className="text-stone-600 font-medium">有限次數</span>
                        )}
                      </td>
                      <td className="py-3.5 text-[#333333]">{c.discountText}</td>
                      <td className="py-3.5 text-[#333333]">{c.discountType === 'fixed' ? `折 $${c.discountValue}` : `${c.discountValue * 10}折`}</td>
                      <td className="py-3.5 font-semibold text-[#d4a373]">
                        {(c.conditionType === 'infinite' || c.conditionType === 'periods') ? '無限次' : `${c.usesLeft} 次`}
                      </td>
                      <td className="py-3.5 text-right">
                        <button onClick={() => handleDeleteCoupon(c.id)} className="text-[#ff6b6b] hover:underline text-xs bg-[rgba(255,107,107,0.1)] px-3 py-1 rounded-md transition cursor-pointer">刪除</button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 bg-[#333333] text-white px-6 py-3 rounded-full text-xs font-medium z-3000 transition-transform duration-500 ${isToastShow ? 'translate-y-0' : 'translate-y-[200%]'}`}>
        {toastMsg}
      </div>
    </>
  );
}