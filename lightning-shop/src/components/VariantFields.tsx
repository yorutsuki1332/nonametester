'use client';

import { BAG_TYPES, normalizeHex, type CatalogColor } from '@/lib/catalog';

const inputClass = 'w-full rounded-lg border border-[#EBE5DF] bg-white p-3 text-[14px] outline-none focus:border-[#B35B48]';

export default function VariantFields({
  bagType,
  colorGroup,
  colorName,
  colorHex,
  colors,
  onBagType,
  onColorGroup,
  onColorName,
  onColorHex,
  onColors,
}: {
  bagType: string;
  colorGroup: string;
  colorName: string;
  colorHex: string;
  colors: CatalogColor[];
  onBagType: (value: string) => void;
  onColorGroup: (value: string) => void;
  onColorName: (value: string) => void;
  onColorHex: (value: string) => void;
  onColors: (value: CatalogColor[]) => void;
}) {
  const picker = normalizeHex(colorHex) || '#C4A484';

  return (
    <div className="mb-5 grid gap-4">
      <div>
        <label className="mb-2 block text-[13px] font-semibold text-[#6E6058]">包款類型</label>
        <select value={bagType} onChange={(event) => onBagType(event.target.value)} className={inputClass}>
          <option value="">未指定</option>
          {BAG_TYPES.map((item) => (
            <option key={item} value={item}>{item}</option>
          ))}
        </select>
        <p className="mt-1 text-[11px] leading-relaxed text-[#A3958B]">包款才需要選。目錄與選品區可以用這個條件篩選。</p>
      </div>
      <div>
        <label className="mb-2 block text-[13px] font-semibold text-[#6E6058]">同款色組</label>
        <input value={colorGroup} onChange={(event) => onColorGroup(event.target.value)} placeholder="例如 tote-mini" className={inputClass} />
        <p className="mt-1 text-[11px] leading-relaxed text-[#A3958B]">同一組編號的商品會在卡片上互相顯示色點，點色點可前往該顏色。</p>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-2 block text-[13px] font-semibold text-[#6E6058]">此款色名</label>
          <input value={colorName} onChange={(event) => onColorName(event.target.value)} placeholder="焦糖" className={inputClass} />
        </div>
        <div>
          <label className="mb-2 block text-[13px] font-semibold text-[#6E6058]">色碼</label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              aria-label="選擇色碼"
              value={picker}
              onChange={(event) => onColorHex(event.target.value)}
              className="h-11 w-12 cursor-pointer rounded-lg border border-[#EBE5DF] bg-white p-1"
            />
            <input value={colorHex} onChange={(event) => onColorHex(event.target.value)} placeholder="#C4A484" className={inputClass} />
          </div>
        </div>
      </div>
      <div>
        <div className="mb-2 flex items-center justify-between gap-3">
          <label className="text-[13px] font-semibold text-[#6E6058]">同款其他顏色</label>
          <button
            type="button"
            onClick={() => onColors([...colors, { name: '', hex: '#111111' }])}
            className="affordance cursor-pointer rounded-full border border-[#EBE5DF] bg-[#F4F0EA] px-3 py-1 text-[12px] text-[#382E2B]"
          >
            新增顏色
          </button>
        </div>
        <div className="grid gap-2">
          {colors.map((color, index) => (
            <div key={index} className="grid grid-cols-[1fr_8rem_auto] items-center gap-2">
              <input
                aria-label={`其他顏色 ${index + 1} 的名稱`}
                value={color.name || ''}
                onChange={(event) => {
                  const next = [...colors];
                  next[index] = { ...color, name: event.target.value };
                  onColors(next);
                }}
                placeholder="米白"
                className={inputClass}
              />
              <input
                aria-label={`其他顏色 ${index + 1} 的色碼`}
                value={color.hex || ''}
                onChange={(event) => {
                  const next = [...colors];
                  next[index] = { ...color, hex: event.target.value };
                  onColors(next);
                }}
                placeholder="#F5F0E6"
                className={inputClass}
              />
              <button
                type="button"
                aria-label={`移除其他顏色 ${index + 1}`}
                onClick={() => onColors(colors.filter((_, item) => item !== index))}
                className="cursor-pointer border-none bg-transparent text-[18px] text-[#7A6E65]"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
