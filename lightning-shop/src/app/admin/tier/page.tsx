'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { errorMessage } from '@/lib/errors';

interface TierItem {
  id: string;
  name: string;        // 例如：金卡會員 Gold
  badge: string;       // 例如：🥇 或 💎
  threshold: number;   // 累積消費門檻
  discount: number;    // 折扣係數 (例如 0.95 代表 95折)
}

export default function AdminTierSettingsPage() {
  const [tiers, setTiers] = useState<TierItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [isToastShow, setIsToastShow] = useState(false);

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

  useEffect(() => {
    const fetchTiers = async () => {
      try {
        const doc = await db.collection("settings").doc("member_tiers").get();
        if (doc.exists) {
          const data = doc.data();
          if (data?.tiers && Array.isArray(data.tiers)) {
            setTiers(data.tiers);
            return;
          }
        }
        
        // 預設初始等級資料
        setTiers([
          { id: 'silver', name: '銀卡會員 Silver', badge: '🥈', threshold: 0, discount: 1.0 },
          { id: 'gold', name: '金卡會員 Gold', badge: '🥇', threshold: 1000, discount: 0.95 },
          { id: 'diamond', name: '鑽石會員 Diamond', badge: '💎', threshold: 3000, discount: 0.90 }
        ]);
      } catch (error) {
        console.error("載入會員等級設定失敗:", error);
      }
    };

    fetchTiers();
  }, []);

  const showToast = (message: string) => {
    setToastMsg(message);
    setIsToastShow(true);
    setTimeout(() => setIsToastShow(false), 3000);
  };

  const handleTierChange = (index: number, field: keyof TierItem, value: TierItem[keyof TierItem]) => {
    const updated = [...tiers];
    updated[index] = { ...updated[index], [field]: value };
    setTiers(updated);
  };

  const handleAddTier = () => {
    const newTier: TierItem = {
      id: `tier_${Date.now()}`,
      name: '新會員等級',
      badge: '👑',
      threshold: 5000,
      discount: 0.85
    };
    setTiers([...tiers, newTier]);
  };

  const handleRemoveTier = (index: number) => {
    if (tiers.length <= 1) {
      showAlert('至少需保留一個會員等級！', '無法刪除');
      return;
    }
    const updated = tiers.filter((_, i) => i !== index);
    setTiers(updated);
  };

  // 🌟 移動順序功能：向上移動
  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const updated = [...tiers];
    const temp = updated[index];
    updated[index] = updated[index - 1];
    updated[index - 1] = temp;
    setTiers(updated);
  };

  // 🌟 移動順序功能：向下移動
  const handleMoveDown = (index: number) => {
    if (index === tiers.length - 1) return;
    const updated = [...tiers];
    const temp = updated[index];
    updated[index] = updated[index + 1];
    updated[index + 1] = temp;
    setTiers(updated);
  };

  const handleSaveAll = async (e: React.FormEvent) => {
    e.preventDefault();

    // 驗證數值
    for (const t of tiers) {
      if (isNaN(Number(t.threshold)) || isNaN(Number(t.discount))) {
        showAlert(`等級「${t.name}」的門檻或折扣數值無效！`, '輸入錯誤');
        return;
      }
      if (t.discount < 0 || t.discount > 1) {
        showAlert(`等級「${t.name}」的折扣係數必須介於 0 到 1 之間（例如 0.9 代表 9 折）！`, '數值範圍錯誤');
        return;
      }
    }

    setIsSaving(true);
    try {
      // 🌟 保留使用者自定的排序順序儲存
      await db.collection("settings").doc("member_tiers").set({
        tiers: tiers,
        // 同時保留相容舊欄位
        goldThreshold: tiers.find(t => t.id === 'gold')?.threshold || 1000,
        goldDiscount: tiers.find(t => t.id === 'gold')?.discount || 0.95,
        diamondThreshold: tiers.find(t => t.id === 'diamond')?.threshold || 3000,
        diamondDiscount: tiers.find(t => t.id === 'diamond')?.discount || 0.90,
      });

      showToast('✅ 會員等級與顯示順序設定已成功儲存！');
    } catch (error: unknown) {
      showAlert('儲存失敗： ' + errorMessage(error), '系統錯誤');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-serif font-semibold mb-1 text-[#382E2B]">會員等級自定與優惠設定</h1>
          <p className="text-[#7A6E65] text-sm">您可以自由新增、刪除、移動排序或修改各會員等級的名稱、符號、升級門檻與結帳折扣率。</p>
        </div>
        <button
          type="button"
          onClick={handleAddTier}
          className="bg-[#FAF7F2] text-[#382E2B] border border-[#EBE5DF] px-4 py-2.5 rounded-xl text-xs font-semibold hover:bg-[#EBE5DF] transition cursor-pointer shadow-xs flex items-center gap-1.5"
        >
          <span>＋</span> 新增會員等級
        </button>
      </div>

      <form onSubmit={handleSaveAll} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {tiers.map((tier, index) => (
            <div key={tier.id} className="bg-white rounded-2xl p-6 md:p-8 border border-[#EBE5DF] shadow-[0_4px_20px_rgba(56,46,43,0.03)] relative overflow-hidden flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-6 pb-3 border-b border-[#EBE5DF] gap-3">
                  <div className="flex items-center gap-2 grow">
                    {/* 🌟 排序移動按鈕組 */}
                    <div className="flex flex-col gap-0.5 shrink-0 mr-1">
                      <button
                        type="button"
                        onClick={() => handleMoveUp(index)}
                        disabled={index === 0}
                        className="w-6 h-5 flex items-center justify-center text-[10px] bg-[#FAF7F2] border border-[#EBE5DF] rounded text-[#6E6058] hover:bg-[#EBE5DF] disabled:opacity-30 disabled:cursor-not-allowed transition"
                        title="向上移動順序"
                      >
                        ▲
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveDown(index)}
                        disabled={index === tiers.length - 1}
                        className="w-6 h-5 flex items-center justify-center text-[10px] bg-[#FAF7F2] border border-[#EBE5DF] rounded text-[#6E6058] hover:bg-[#EBE5DF] disabled:opacity-30 disabled:cursor-not-allowed transition"
                        title="向下移動順序"
                      >
                        ▼
                      </button>
                    </div>

                    <input
                      type="text"
                      value={tier.badge}
                      onChange={(e) => handleTierChange(index, 'badge', e.target.value)}
                      className="w-12 text-center py-1.5 border border-[#EBE5DF] rounded-lg text-lg bg-[#FAF7F2] outline-none font-mono"
                      title="圖標 Emoji"
                    />
                    <input
                      type="text"
                      value={tier.name}
                      onChange={(e) => handleTierChange(index, 'name', e.target.value)}
                      className="grow py-1.5 px-3 border border-[#EBE5DF] rounded-lg text-sm font-semibold text-[#382E2B] bg-[#FAF7F2] outline-none focus:border-[#B35B48]"
                      placeholder="等級名稱"
                      required
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveTier(index)}
                    className="text-xs text-rose-700 bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-lg hover:bg-rose-700 hover:text-white transition cursor-pointer shrink-0"
                  >
                    刪除等級
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#6E6058] mb-1.5">
                      升級累積消費門檻 (HKD)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={tier.threshold}
                      onChange={(e) => handleTierChange(index, 'threshold', Number(e.target.value))}
                      className="w-full py-3 px-4 border border-[#EBE5DF] rounded-xl text-sm outline-none bg-[#FAF7F2] focus:border-[#B35B48] transition font-mono"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#6E6058] mb-1">
                      全館結帳折扣率 (係數)
                    </label>
                    <p className="text-[11px] text-[#8C7B70] mb-2">
                      折數預覽：<span className="font-semibold text-[#B35B48]">{(Number(tier.discount) * 10).toFixed(1)} 折</span> (例如填入 <code className="bg-[#FAF7F2] px-1 py-0.5 rounded border border-[#EBE5DF]">0.9</code> 代表 9 折)
                    </p>
                    <input
                      type="number"
                      min="0"
                      max="1"
                      step="0.01"
                      value={tier.discount}
                      onChange={(e) => handleTierChange(index, 'discount', Number(e.target.value))}
                      className="w-full py-3 px-4 border border-[#EBE5DF] rounded-xl text-sm outline-none bg-[#FAF7F2] focus:border-[#B35B48] transition font-mono"
                      required
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <button
          type="submit"
          disabled={isSaving}
          className="w-full py-4 bg-[#B35B48] text-white rounded-xl font-semibold text-sm hover:bg-[#9B4C3A] transition cursor-pointer shadow-xs"
        >
          {isSaving ? '正在儲存所有等級設定...' : '儲存所有會員等級與順序並即時生效'}
        </button>
      </form>

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