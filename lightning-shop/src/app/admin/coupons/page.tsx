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
  
  // 🌟 可重複使用與次數控制
  const [isReusable, setIsReusable] = useState(false);
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

  // 🌟 自動連動控制：當切換「有效條件」時，自動取消勾選或重新勾選「可重複使用」
  const handleConditionTypeChange = (newType: 'infinite' | 'counts' | 'periods') => {
    setConditionType(newType);
    if (newType === 'counts') {
      setIsReusable(false); // 選擇「有限次數」時，自動 uncheck 可重複使用，讓管理者輸入數字
    } else {
      setIsReusable(true);  // 選擇「永久有效」或「期間優惠」時，自動勾選可重複使用
    }
  };

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();

    const valNum = Number(discountValue);
    if (!code || isNaN(valNum)) {
      alert('請填寫完整優惠券資訊！');
      return;
    }

    if (valNum <= 0) {
      alert('折扣數值必須大於 0！');
      return;
    }

    if (discountType === 'percent') {
      if (valNum < 0 || valNum > 100) {
        alert('百分比折扣數值不可小於 0 或大於 100！');
        return;
      }
    }

    if (conditionType === 'periods' && (!startTime || !endTime)) {
      alert('期間優惠必須填寫開始時間與完結時間！');
      return;
    }

    if (conditionType === 'counts' && (!startTime || !endTime)) {
      alert('次數優惠必須填寫開始時間與完結時間！');
      return;
    }

    const finalDiscountValue = discountType === 'percent' ? valNum / 100 : valNum;

    // 🌟 次數計算：若勾選可重複使用或設定為永久/期間，次數寫入 99999；否則採用輸入次數
    const finalUses = (isReusable || conditionType === 'infinite' || conditionType === 'periods') 
      ? 99999 
      : (Number(usesLeft) || 1);

    try {
      const couponId = code.trim().toUpperCase();
      await db.collection("coupons").doc(couponId).set({
        code: couponId,
        discountText: discountText.trim() || `${couponId} 專屬優惠`,
        minSpend: Number(minSpend) || 0,
        discountType,
        discountValue: finalDiscountValue,
        usesLeft: finalUses,
        conditionType,
        startTime: (conditionType === 'periods' || conditionType === 'counts') ? startTime : null,
        endTime: (conditionType === 'periods' || conditionType === 'counts') ? endTime : null,
        targetAccountId: targetAccountId.trim() ? targetAccountId.trim() : null,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });

      showToast(`✅ 成功發放優惠券：${couponId}${targetAccountId ? ` (指定給: @${targetAccountId})` : ' (全站通用)'}`);
      setCode('');
      setDiscountText('');
      setMinSpend('');
      setDiscountValue('');
      setUsesLeft('1');
      setIsReusable(false);
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

  const getNowDatetimeLocal = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  };

  return (
    <>
      <div className="mb-8">
        <h1 className="text-2xl font-serif font-semibold mb-1 text-[#382E2B]">優惠券管理與指定發放</h1>
        <p className="text-[#7A6E65] text-sm">建立全站優惠券或指定特定會員帳號發放專屬折扣。</p>
      </div>

      <div className="bg-white rounded-2xl p-5 md:p-10 shadow-[0_4px_20px_rgba(56,46,43,0.03)] border border-[#EBE5DF] mb-8">
        <h2 className="text-base font-semibold mb-5 pb-2.5 border-b border-[#EBE5DF] text-[#382E2B]">發放新優惠券</h2>
        <form onSubmit={handleCreateCoupon}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-[#6E6058]">優惠代碼 (Code) <span className="text-[#B35B48] ml-1">*</span></label>
              <input type="text" value={code} onChange={(e) => setCode(e.target.value)} placeholder="例如：VIP50" className="py-3 px-4 border border-[#EBE5DF] rounded-lg text-sm uppercase outline-none bg-[#FAF7F2] focus:border-[#B35B48] transition" required />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-[#6E6058]">有效條件 <span className="text-[#B35B48] ml-1">*</span></label>
              {/* 🌟 透過 onChange 觸發 handleConditionTypeChange 自動連動 */}
              <select 
                value={conditionType} 
                onChange={(e) => handleConditionTypeChange(e.target.value as any)}
                className="py-3 px-4 border border-[#EBE5DF] rounded-lg text-sm outline-none bg-[#FAF7F2] focus:border-[#B35B48] transition cursor-pointer"
              >
                <option value="infinite">永久有效</option>
                <option value="counts">有限次數</option>
                <option value="periods">期間優惠</option>
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-[#6E6058]">指定會員帳號 (選填)</label>
              <select 
                value={targetAccountId} 
                onChange={(e) => setTargetAccountId(e.target.value)} 
                className="py-3 px-4 border border-[#EBE5DF] rounded-lg text-sm outline-none bg-[#FAF7F2] focus:border-[#B35B48] transition cursor-pointer"
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

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="flex gap-4 items-end md:grid md:grid-cols-2 md:gap-6">
              <div className="flex flex-col gap-2 shrink-0">
                <label className="text-xs font-semibold text-[#6E6058]">重複使用</label>
                <label className="flex items-center gap-2 py-3 px-3 border border-[#EBE5DF] bg-[#FAF7F2] rounded-lg text-xs font-medium cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={isReusable} 
                    onChange={(e) => setIsReusable(e.target.checked)} 
                    className="w-4 h-4 accent-[#B35B48] cursor-pointer"
                    disabled={conditionType === 'counts'} // 🌟 若選擇「有限次數」時，禁用勾選可重複使用
                  />
                  可重複使用
                </label>
              </div>

              <div className="flex flex-col gap-2 grow">
                <label className="text-xs font-semibold text-[#6E6058]">可用總次數 <span className="text-[#B35B48] ml-1">*</span></label>
                <input 
                  type="number" 
                  value={isReusable ? '' : usesLeft} 
                  onChange={(e) => setUsesLeft(e.target.value)} 
                  placeholder={isReusable ? '無限制' : '例如：1'} 
                  className="py-3 px-4 border border-[#EBE5DF] rounded-lg text-sm outline-none bg-[#FAF7F2] focus:border-[#B35B48] transition disabled:bg-[#F4F0EA] disabled:text-[#8C7B70] placeholder:text-[#8C7B70]" 
                  required={!isReusable} 
                  disabled={isReusable}
                  min={1} 
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-[#6E6058]">開始時間 {conditionType === 'periods' && <span className="text-[#B35B48] ml-1">*</span>}</label>
              <input
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                style={{ accentColor: '#B35B48' }}
                min={getNowDatetimeLocal()}
                className="py-3 px-4 border border-[#EBE5DF] rounded-lg text-sm outline-none bg-[#FAF7F2] focus:border-[#B35B48] transition disabled:bg-[#F4F0EA] disabled:text-[#8C7B70]"
                required={conditionType === 'periods'}
                disabled={conditionType === 'infinite'}
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-[#6E6058]">完結時間 {conditionType === 'periods' && <span className="text-[#B35B48] ml-1">*</span>}</label>
              <input
                type="datetime-local"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                style={{ accentColor: '#B35B48' }}
                min={getNowDatetimeLocal()}
                className="py-3 px-4 border border-[#EBE5DF] rounded-lg text-sm outline-none bg-[#FAF7F2] focus:border-[#B35B48] transition disabled:bg-[#F4F0EA] disabled:text-[#8C7B70]"
                required={conditionType === 'periods'}
                disabled={conditionType === 'infinite'}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2 mb-6">
            <label className="text-xs font-semibold text-[#6E6058]">優惠描述文字</label>
            <input type="text" value={discountText} onChange={(e) => setDiscountText(e.target.value)} placeholder="例如：客服補償專屬 9 折券" className="py-3 px-4 border border-[#EBE5DF] rounded-lg text-sm outline-none bg-[#FAF7F2] focus:border-[#B35B48] transition" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-[#6E6058]">折扣類型</label>
              <select value={discountType} onChange={(e) => setDiscountType(e.target.value as any)} className="py-3 px-4 border border-[#EBE5DF] rounded-lg text-sm outline-none bg-[#FAF7F2] focus:border-[#B35B48] transition cursor-pointer">
                <option value="fixed">固定金額折抵 ($)</option>
                <option value="percent">百分比折扣 (%)</option>
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-[#6E6058]">
                折扣數值 <span className="text-[#B35B48] ml-1">*</span> 
                {discountType === 'percent' && <span className="text-[11px] text-[#8C7B70] font-normal ml-1.5">(例: 輸入 30 即扣減 30%)</span>}
              </label>
              <input 
                type="number" 
                step={discountType === 'fixed' ? '1' : '0.1'} 
                value={discountValue} 
                onChange={(e) => setDiscountValue(e.target.value)} 
                placeholder={discountType === 'fixed' ? '例如：100' : '例如：30 (代表扣減 30%)'} 
                min={0.01}
                max={discountType === 'percent' ? 100 : undefined}
                className="py-3 px-4 border border-[#EBE5DF] rounded-lg text-sm outline-none bg-[#FAF7F2] focus:border-[#B35B48] transition" 
                required 
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-[#6E6058]">最低消費門檻 ($)</label>
              <input type="number" value={minSpend} onChange={(e) => setMinSpend(e.target.value)} placeholder="0 代表無門檻" min={0} className="py-3 px-4 border border-[#EBE5DF] rounded-lg text-sm outline-none bg-[#FAF7F2] focus:border-[#B35B48] transition" />
            </div>
          </div>

          <button type="submit" className="w-full md:w-auto py-3 px-7 rounded-full text-sm font-medium bg-[#B35B48] text-white hover:bg-[#9B4C3A] transition cursor-pointer shadow-xs">
            發放優惠券
          </button>
        </form>
      </div>

      <div className="bg-white rounded-2xl p-5 md:p-10 shadow-[0_4px_20px_rgba(56,46,43,0.03)] border border-[#EBE5DF]">
        <h2 className="text-base font-serif font-semibold mb-5 pb-2.5 border-b border-[#EBE5DF] text-[#382E2B]">現有優惠券列表</h2>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-[#EBE5DF] text-[#7A6E65]">
                <th className="pb-3 font-semibold">代碼</th>
                <th className="pb-3 font-semibold">發放對象</th>
                <th className="pb-3 font-semibold">有效條件 / 狀態</th>
                <th className="pb-3 font-semibold">說明</th>
                <th className="pb-3 font-semibold">折扣內容</th>
                <th className="pb-3 font-semibold">可用次數</th>
                <th className="pb-3 font-semibold text-right">操作</th>
              </tr>
            </thead>
            <tbody>
              {coupons.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-8 text-[#7A6E65]">目前尚無任何優惠券</td></tr>
              ) : (
                coupons.map(c => {
                  const now = new Date().getTime();
                  const isExpired = (c.conditionType === 'periods' || c.conditionType === 'counts') && c.endTime ? new Date(c.endTime).getTime() < now : false;

                  return (
                    <tr key={c.id} className="border-b border-[#F4F0EA] hover:bg-[#FAF7F2]">
                      <td className="py-3.5 font-mono font-bold text-[#382E2B]">{c.code}</td>
                      <td className="py-3.5 text-xs">
                        {c.targetAccountId ? (
                          <span className="bg-[#E6D5CC]/50 text-[#382E2B] border border-[#E6D5CC] px-2.5 py-1 rounded-md font-mono font-semibold">@{c.targetAccountId} 專屬</span>
                        ) : (
                          <span className="bg-[#F4F0EA] text-[#6E6058] border border-[#EBE5DF] px-2.5 py-1 rounded-md">全站通用</span>
                        )}
                      </td>
                      <td className="py-3.5 text-xs">
                        {c.conditionType === 'infinite' ? (
                          <span className="text-emerald-700 font-medium">永久有效</span>
                        ) : c.conditionType === 'periods' ? (
                          <div>
                            {isExpired ? (
                              <span className="text-rose-700 font-bold block">🔴 已過期</span>
                            ) : (
                              <span className="text-blue-700 font-medium block">🟢 期間優惠 (進行中)</span>
                            )}
                            <span className="text-[10px] text-[#8C7B70]">{c.startTime?.replace('T', ' ')} ~ {c.endTime?.replace('T', ' ')}</span>
                          </div>
                        ) : (
                          <div>
                            {isExpired ? (
                              <span className="text-rose-700 font-bold block">🔴 已過期</span>
                            ) : (
                              <span className="text-blue-700 font-medium block">🟢 有效限期內 + 有限次數</span>
                            )}
                            <span className="text-[10px] text-[#8C7B70]">{c.startTime?.replace('T', ' ')} ~ {c.endTime?.replace('T', ' ')}</span>
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 text-[#382E2B]">{c.discountText}</td>
                      <td className="py-3.5 text-[#382E2B] font-mono">
                        {c.discountType === 'fixed' 
                          ? `折 $${c.discountValue}` 
                          : `${(100 - c.discountValue * 100).toFixed(0)}% OFF (${((1 - c.discountValue) * 10).toFixed(1)}折)`
                        }
                      </td>
                      <td className="py-3.5 font-semibold font-mono text-[#B35B48]">
                        {(c.usesLeft >= 99999 || c.conditionType === 'infinite' || c.conditionType === 'periods') ? '無限次' : `${c.usesLeft} 次`}
                      </td>
                      <td className="py-3.5 text-right">
                        <button onClick={() => handleDeleteCoupon(c.id)} className="text-rose-700 hover:underline text-xs bg-rose-50 border border-rose-200 px-3 py-1 rounded-md transition cursor-pointer">刪除</button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 bg-[#382E2B] text-[#FAF7F2] px-6 py-3 rounded-full text-[13px] font-medium z-3000 transition-transform duration-500 shadow-md ${isToastShow ? 'translate-y-0' : 'translate-y-[300%]'}`}>
        {toastMsg}
      </div>
    </>
  );
}