'use client';

import { BAG_TYPES, SORT_OPTIONS } from '@/lib/catalog';

const fieldClass = 'cursor-pointer rounded-full border border-[#EBE5DF] bg-[#F4F0EA] px-4 py-3 text-[13px] text-[#382E2B] outline-none focus:border-[#B35B48]';

export default function CatalogFilters({
  sort,
  bagType,
  color,
  priceMin,
  priceMax,
  colors,
  onChange,
}: {
  sort: string;
  bagType: string;
  color: string;
  priceMin: string;
  priceMax: string;
  colors: string[];
  onChange: (patch: Partial<{ sort: string; bagType: string; color: string; priceMin: string; priceMax: string }>) => void;
}) {
  return (
    <div className="flex w-full flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-center">
      <label className="flex items-center gap-2 text-[12px] text-[#7A6E65]">
        最低
        <input
          type="number"
          min="0"
          step="1"
          inputMode="decimal"
          aria-label="最低價格"
          value={priceMin}
          onChange={(event) => onChange({ priceMin: event.target.value })}
          placeholder="HKD"
          className="w-24 rounded-full border border-[#EBE5DF] bg-white px-4 py-3 text-[13px] text-[#382E2B] outline-none focus:border-[#B35B48]"
        />
      </label>
      <label className="flex items-center gap-2 text-[12px] text-[#7A6E65]">
        最高
        <input
          type="number"
          min="0"
          step="1"
          inputMode="decimal"
          aria-label="最高價格"
          value={priceMax}
          onChange={(event) => onChange({ priceMax: event.target.value })}
          placeholder="HKD"
          className="w-24 rounded-full border border-[#EBE5DF] bg-white px-4 py-3 text-[13px] text-[#382E2B] outline-none focus:border-[#B35B48]"
        />
      </label>
      <select aria-label="包款類型" value={bagType} onChange={(event) => onChange({ bagType: event.target.value })} className={fieldClass}>
        <option value="all">全部包款</option>
        {BAG_TYPES.map((item) => (
          <option key={item} value={item}>{item}</option>
        ))}
      </select>
      <select aria-label="色系" value={color} onChange={(event) => onChange({ color: event.target.value })} className={fieldClass}>
        <option value="all">全部色系</option>
        {colors.map((item) => (
          <option key={item} value={item}>{item}</option>
        ))}
      </select>
      <select aria-label="排列方式" value={sort} onChange={(event) => onChange({ sort: event.target.value })} className={fieldClass}>
        {SORT_OPTIONS.map((item) => (
          <option key={item.id} value={item.id}>{item.label}</option>
        ))}
      </select>
    </div>
  );
}
