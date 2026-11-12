'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import firebase from 'firebase/compat/app';
import { errorMessage, withoutDocumentId } from '@/lib/errors';

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
  startTime?: string | null;
  endTime?: string | null;
}

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  
  const [code, setCode] = useState('');
  const [discountText, setDiscountText] = useState('');
  const [minSpend, setMinSpend] = useState('');
  const [discountType, setDiscountType] = useState<'fixed' | 'percent'>('fixed');
  const [discountValue, setDiscountValue] = useState('');
  
  // 可重複使用與次數控制
  const [isReusable, setIsReusable] = useState(true);
  const [usesLeft, setUsesLeft] = useState('1');

  const [canHaveExpiryPeriod, setCanHaveExpiryPeriod] = useState(false);
  
  const [targetAccountId, setTargetAccountId] = useState('');
  const [conditionType, setConditionType] = useState<'infinite' | 'counts' | 'periods'>('infinite');
  
  // 無有效限期控制
  const [hasNoExpiry, setHasNoExpiry] = useState(true);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');

  // 🌟 自定義網頁主題彈窗狀態 (替代 alert / confirm)
  const [customModal, setCustomModal] = useState<{
    isOpen: boolean;
    title?: string;
    message: string;
    isConfirm?: boolean;
    onConfirm?: () => void;
  }>({
    isOpen: false,
    message: '',
    isConfirm: false,
  });

  const showAlert = (message: string, title = '提示訊息') => {
    setCustomModal({
      isOpen: true,
      title,
      message,
      isConfirm: false,
    });
  };

  const showConfirm = (message: string, onConfirm: () => void, title = '確認操作') => {
    setCustomModal({
      isOpen: true,
      title,
      message,
      isConfirm: true,
      onConfirm,
    });
  };
  
  const [toastMsg, setToastMsg] = useState('');
  const [isToastShow, setIsToastShow] = useState(false);

  useEffect(() => {
    const unsubscribeCoupons = db.collection("coupons").orderBy("createdAt", "desc").onSnapshot((snapshot) => {
      const list: Coupon[] = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...withoutDocumentId(doc.data()) } as Coupon);
      });
      setCoupons(list);
    });

    const unsubscribeUsers = db.collection("users").onSnapshot((snapshot) => {
      const userList: UserProfile[] = [];
      snapshot.forEach((doc) => {
        userList.push({ id: doc.id, ...withoutDocumentId(doc.data()) } as UserProfile);
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

  const handleConditionTypeChange = (newType: 'infinite' | 'counts' | 'periods') => {
    setConditionType(newType);

    if (newType === 'infinite') {
      setIsReusable(true);
      setHasNoExpiry(true);
      setCanHaveExpiryPeriod(false);
      setStartTime('');
      setEndTime('');
    } else if (newType === 'periods') {
      setIsReusable(true);
      setHasNoExpiry(false);
      setCanHaveExpiryPeriod(true);
    } else if (newType === 'counts') {
      setIsReusable(false);
      setHasNoExpiry(true);
      setCanHaveExpiryPeriod(true);
      setStartTime('');
      setEndTime('');
    }
  };

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();

    const valNum = Number(discountValue);
    if (!code || isNaN(valNum)) {
      showAlert('請填寫完整優惠券資訊！', '提示');
      return;
    }

    if (valNum <= 0) {
      showAlert('折扣數值必須大於 0！', '提示');
      return;
    }

    if (discountType === 'percent') {
      if (valNum < 0 || valNum > 100) {
        showAlert('百分比折扣數值不可小於 0 或大於 100！', '提示');
        return;
      }
    }

    if (!hasNoExpiry && (!startTime || !endTime)) {
      showAlert('有設定有效限期時，必須填寫開始時間與完結時間！', '提示');
      return;
    }

    if (!hasNoExpiry && startTime && endTime) {
      const startMs = new Date(startTime).getTime();
      const endMs = new Date(endTime).getTime();
      if (endMs <= startMs) {
        showAlert('❌ 完結時間必須大於開始時間至少一分鐘！', '時間設定錯誤');
        return;
      }
    }

    const finalDiscountValue = valNum.toFixed(0);

    const finalUses = (isReusable || conditionType === 'infinite') 
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
        startTime: !hasNoExpiry && startTime ? startTime : null,
        endTime: !hasNoExpiry && endTime ? endTime : null,
        targetAccountId: targetAccountId.trim() ? targetAccountId.trim() : null,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });

      showToast(`✅ 成功發放優惠券：${couponId}${targetAccountId ? ` (指定給: @${targetAccountId})` : ' (全站通用)'}`);
      setCode('');
      setDiscountText('');
      setMinSpend('');
      setDiscountValue('');
      setUsesLeft('1');
      setIsReusable(true);
      setTargetAccountId('');
      setConditionType('infinite');
      setCanHaveExpiryPeriod(false);
      setHasNoExpiry(true);
      setStartTime('');
      setEndTime('');
    } catch (error: unknown) {
      showAlert('發放失敗： ' + errorMessage(error), '錯誤');
    }
  };

  const handleDeleteCoupon = (couponId: string) => {
    showConfirm(`確定要刪除優惠券 ${couponId} 嗎？`, async () => {
      try {
        await db.collection("coupons").doc(couponId).delete();
        showToast('⚠️ 優惠券已刪除');
      } catch (error: unknown) {
        showAlert('刪除失敗：' + errorMessage(error), '錯誤');
      }
    }, '刪除確認');
  };

  const getNowDatetimeLocal = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  };

  const getStartTimeMin = () => {
    if (!startTime) return getNowDatetimeLocal();

    const dateObj = new Date(startTime);
    dateObj.setMinutes(dateObj.getMinutes() + 5);

    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    const hours = String(dateObj.getHours()).padStart(2, '0');
    const minutes = String(dateObj.getMinutes()).padStart(2, '0');

    return `${year}-${month}-${day}T${hours}:${minutes}`;
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
              <select 
                value={conditionType} 
                onChange={(e) => handleConditionTypeChange(e.target.value as 'infinite' | 'counts' | 'periods')}
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

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6 items-end">
            <div className="grid grid-cols-1 gap-4 items-end md:grid md:grid-cols-3 md:gap-3">
              <div className="flex flex-col gap-2 shrink-0">
                <label className="text-xs font-semibold text-[#6E6058]">重複使用</label>
                <label className="flex items-center justify-center gap-2 py-3.5 px-3 border border-[#EBE5DF] bg-[#FAF7F2] rounded-lg text-xs font-medium cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={isReusable} 
                    onChange={(e) => setIsReusable(e.target.checked)} 
                    className="w-4 h-4 accent-[#B35B48] cursor-pointer"
                    disabled={conditionType === 'counts'}
                  />
                  可以
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

              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-[#6E6058]">有效限期設定</label>
                <label className="flex items-center justify-center gap-2 py-3.5 px-4 border border-[#EBE5DF] outline-none bg-[#FAF7F2] focus:border-[#B35B48] rounded-lg text-xs font-medium cursor-pointer transition disabled:bg-[#F4F0EA] disabled:text-[#8C7B70]">
                  <input 
                    type="checkbox" 
                    checked={hasNoExpiry && canHaveExpiryPeriod} 
                    onChange={(e) => {
                      setHasNoExpiry(e.target.checked);
                      if (e.target.checked) {
                        setStartTime('');
                        setEndTime('');
                      }
                    }}
                    className="w-4 h-4 accent-[#B35B48] cursor-pointer bg-[#FAF7F2] transition"
                    disabled={conditionType === 'infinite'}
                  />
                  無限
                </label>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-[#6E6058]">開始時間 {!hasNoExpiry && <span className="text-[#B35B48] ml-1">*</span>}</label>
              <input
                type="datetime-local"
                value={startTime}
                onChange={(e) => {
                  const newStart = e.target.value;
                  setStartTime(newStart);
                  if (endTime && newStart && new Date(endTime).getTime() <= new Date(newStart).getTime()) {
                    setEndTime('');
                  }
                }}
                style={{ accentColor: '#B35B48' }}
                min={getNowDatetimeLocal()}
                className="py-3 px-4 border border-[#EBE5DF] rounded-lg text-sm outline-none bg-[#FAF7F2] focus:border-[#B35B48] transition disabled:bg-[#F4F0EA] disabled:text-[#8C7B70]"
                required={!hasNoExpiry}
                disabled={hasNoExpiry}
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-[#6E6058]">完結時間 {!hasNoExpiry && <span className="text-[#B35B48] ml-1">*</span>}</label>
              <input
                type="datetime-local"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                style={{ accentColor: '#B35B48' }}
                min={getStartTimeMin()}
                className="py-3 px-4 border border-[#EBE5DF] rounded-lg text-sm outline-none bg-[#FAF7F2] focus:border-[#B35B48] transition disabled:bg-[#F4F0EA] disabled:text-[#8C7B70]"
                required={!hasNoExpiry}
                disabled={hasNoExpiry}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2 mb-6">
            <label className="text-xs font-semibold text-[#6E6058]">優惠描述文字</label>
            <input type="text" value={discountText} onChange={(e) => setDiscountText(e.target.value)} placeholder="例如：客服補償專屬 9 折券" className="py-3 px-4 border border-[#EBE5DF] rounded-lg text-sm uppercase outline-none bg-[#FAF7F2] focus:border-[#B35B48] transition" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-[#6E6058]">折扣類型</label>
              <select value={discountType} onChange={(e) => setDiscountType(e.target.value as 'fixed' | 'percent')} className="py-3 px-4 border border-[#EBE5DF] rounded-lg text-sm outline-none bg-[#FAF7F2] focus:border-[#B35B48] transition cursor-pointer">
                <option value="fixed">固定金額折抵 ($)</option>
                <option value="percent">百分比折扣 (%)</option>
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-[#6E6058]">
                折扣數值 <span className="text-[#B35B48] ml-1">*</span> 
                {discountType === 'percent' && <span className="text-[11px] text-[#8C7B70] font-normal ml-1.5">(例: 輸入 30 即扣減 30% / 7折)</span>}
              </label>
              <input 
                type="number" 
                step="any" 
                value={discountValue} 
                onChange={(e) => setDiscountValue(e.target.value)} 
                placeholder={discountType === 'fixed' ? '例如：100' : '例如：30 (代表扣減 30%)'} 
                min={0}
                max={discountType === 'percent' ? 100 : undefined}
                className="py-3 px-4 border border-[#EBE5DF] rounded-lg text-sm outline-none bg-[#FAF7F2] focus:border-[#B35B48] transition font-mono" 
                required 
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-[#6E6058]">最低消費門檻 ($)</label>
              <input type="number" step="any" value={minSpend} onChange={(e) => setMinSpend(e.target.value)} placeholder="0 代表無門檻" min={0} className="py-3 px-4 border border-[#EBE5DF] rounded-lg text-sm outline-none bg-[#FAF7F2] focus:border-[#B35B48] transition font-mono" />
            </div>
          </div>

          <button type="submit" className="w-full md:w-auto py-3 px-7 rounded-full text-sm font-medium bg-[#B35B48] text-white hover:bg-[#9B4C3A] transition cursor-pointer shadow-xs">
            發放優惠券
          </button>
        </form>
      </div>

      <div className="bg-white rounded-2xl p-5 md:p-10 shadow-[0_4px_20px_rgba(56,46,43,0.03)] border border-[#EBE5DF] overflow-hidden">
        <h2 className="text-base font-serif font-semibold mb-5 pb-2.5 border-b border-[#EBE5DF] text-[#382E2B]">現有優惠券列表</h2>
        <div className="overflow-x-auto w-full">
          <table className="w-full border-collapse text-left text-sm min-w-175">
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
                  const isExpired = c.endTime ? new Date(c.endTime).getTime() < now : false;

                  let displayDiscount = '';
                  if (c.discountType === 'fixed') {
                    displayDiscount = `折 HKD $${c.discountValue}`;
                  } else {
                    const rawVal = c.discountValue;
                    const offPercent = rawVal;
                    const discountFold = (100 - Number(offPercent)) / 10;
                    displayDiscount = `-${offPercent}% OFF (${discountFold.toFixed(1)}折)`;
                  }

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
                        {!c.endTime ? (
                          <span className="text-emerald-700 font-medium">🟢 無有效限期</span>
                        ) : (
                          <div>
                            {isExpired ? (
                              <span className="text-rose-700 font-bold block">🔴 已過期</span>
                            ) : (
                              <span className="text-blue-700 font-medium block">🟢 進行中</span>
                            )}
                            <span className="text-[10px] text-[#8C7B70]">{c.startTime?.replace('T', ' ')} ~ {c.endTime?.replace('T', ' ')}</span>
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 text-[#382E2B]">{c.discountText}</td>
                      <td className="py-3.5 text-[#B35B48] font-semibold font-mono">
                        {displayDiscount}
                      </td>
                      <td className="py-3.5 font-semibold font-mono text-[#B35B48]">
                        {(c.usesLeft >= 99999 || c.conditionType === 'infinite') ? '無限次' : `${c.usesLeft} 次`}
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

      {/* 🌟 全域自定義網頁主題彈出介面 (替代 alert / confirm) */}
      {customModal.isOpen && (
        <div className="fixed inset-0 bg-[#382E2B]/40 backdrop-blur-xs z-5000 flex items-center justify-center p-4">
          <div className="bg-[#FAF7F2] border border-[#EBE5DF] rounded-2xl w-full max-w-sm p-6 shadow-[0_10px_40px_rgba(56,46,43,0.15)] animate-in fade-in zoom-in duration-200">
            <h3 className="text-base font-serif font-semibold text-[#382E2B] mb-2.5">
              {customModal.title || '提示訊息'}
            </h3>
            <p className="text-xs text-[#6E6058] mb-6 whitespace-pre-wrap leading-relaxed">
              {customModal.message}
            </p>
            <div className="flex justify-end gap-3">
              {customModal.isConfirm && (
                <button
                  type="button"
                  onClick={() => setCustomModal(prev => ({ ...prev, isOpen: false }))}
                  className="px-4 py-2 bg-[#F4F0EA] text-[#382E2B] border border-[#EBE5DF] rounded-lg text-xs font-semibold hover:bg-[#EBE5DF] transition cursor-pointer"
                >
                  取消
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  if (customModal.onConfirm) customModal.onConfirm();
                  setCustomModal(prev => ({ ...prev, isOpen: false }));
                }}
                className="px-5 py-2 bg-[#B35B48] text-white rounded-lg text-xs font-semibold hover:bg-[#9B4C3A] transition shadow-xs cursor-pointer"
              >
                確定
              </button>
            </div>
          </div>
        </div>
      )}

      <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 bg-[#382E2B] text-[#FAF7F2] px-6 py-3 rounded-full text-[13px] font-medium z-3000 transition-transform duration-500 shadow-md ${isToastShow ? 'translate-y-0' : 'translate-y-[300%]'}`}>
        {toastMsg}
      </div>
    </>
  );
}