'use client';

import { SF_REGIONS } from '@/lib/sf-stores';

export default function SfStorePicker({
  regionId,
  storeId,
  note,
  onRegionChange,
  onStoreChange,
  onNoteChange,
}: {
  regionId: string;
  storeId: string;
  note: string;
  onRegionChange: (regionId: string) => void;
  onStoreChange: (storeId: string) => void;
  onNoteChange: (note: string) => void;
}) {
  const region = SF_REGIONS.find((item) => item.id === regionId);
  const stores = region?.stores ?? [];
  const fieldClass = 'w-full rounded-lg border border-[#EBE5DF] bg-white p-3 text-[14px] outline-none transition focus:border-[#B35B48]';

  return (
    <div className="rounded-xl border border-[#EBE5DF] bg-white p-4">
      <p className="text-[13px] font-semibold text-[#382E2B]">順豐自取點</p>
      <p className="mt-1 text-[12px] leading-relaxed text-[#6E6058]">先選地區，再選該區順豐站，選擇結果會填進下方欄位。你也可以直接改成門市編號或地點，訂單會採用欄位裡的內容。</p>
      <div className="mt-3 grid gap-3">
        <label className="grid gap-1.5 text-[12px] font-semibold text-[#6E6058]">
          地區
          <select
            aria-label="順豐地區"
            value={regionId}
            onChange={(event) => onRegionChange(event.target.value)}
            className={fieldClass}
          >
            <option value="">選擇地區</option>
            {SF_REGIONS.map((item) => (
              <option key={item.id} value={item.id}>{item.label}</option>
            ))}
          </select>
        </label>
        <label className="grid gap-1.5 text-[12px] font-semibold text-[#6E6058]">
          順豐站
          <select
            aria-label="順豐站"
            value={storeId}
            disabled={!region}
            onChange={(event) => onStoreChange(event.target.value)}
            className={`${fieldClass} disabled:bg-[#F4F0EA] disabled:text-[#8C7B70]`}
          >
            <option value="">{region ? '選擇順豐站' : '請先選擇地區'}</option>
            {stores.map((store) => (
              <option key={store.id} value={store.id}>{store.name}（{store.id}）</option>
            ))}
          </select>
        </label>
        <label className="grid gap-1.5 text-[12px] font-semibold text-[#6E6058]">
          直接填寫門市編號或地點
          <input
            type="text"
            value={note}
            onChange={(event) => onNoteChange(event.target.value)}
            placeholder="例如：852LAB，或銅鑼灣時代廣場順豐站"
            aria-label="順豐站編號或地點"
            className={fieldClass}
          />
        </label>
      </div>
    </div>
  );
}
