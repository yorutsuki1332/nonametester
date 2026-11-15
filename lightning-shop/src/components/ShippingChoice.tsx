'use client';

import {
  DELIVERY_OPTIONS,
  FREE_SHIPPING_THRESHOLD,
  deliveryOption,
  shippingFeeFor,
  shippingRuleText,
  type DeliveryMethod,
} from '@/lib/shipping';

export default function ShippingChoice({
  subtotal,
  method,
  onChange,
  amountLabel,
}: {
  subtotal: number;
  method: DeliveryMethod;
  onChange: (method: DeliveryMethod) => void;
  amountLabel: (value: number) => string;
}) {
  const reached = subtotal >= FREE_SHIPPING_THRESHOLD;
  const selected = deliveryOption(method);
  const fee = shippingFeeFor(subtotal, method);

  return (
    <div className="mb-4">
      <p className="text-[12px] font-semibold text-[#382E2B]">送貨與運費</p>
      <p className="mt-1 text-[12px] leading-relaxed text-[#6E6058]">{shippingRuleText()}</p>
      <p className="mt-1 text-[12px] text-[#382E2B]">
        {reached
          ? `目前商品小計 HKD ${amountLabel(subtotal)}，已滿免運門檻。`
          : `目前商品小計 HKD ${amountLabel(subtotal)}，未滿 HKD ${FREE_SHIPPING_THRESHOLD}。`}
      </p>
      <div role="radiogroup" aria-label="送貨選項" className="mt-2.5 grid gap-2">
        {DELIVERY_OPTIONS.map((option) => {
          const active = method === option.id;
          const optionFee = shippingFeeFor(subtotal, option.id);
          return (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(option.id)}
              className={`rounded-xl border px-3 py-2.5 text-left transition ${
                active ? 'border-[#B35B48] bg-white' : 'border-[#EBE5DF] bg-white/70 hover:border-[#CDBFB4]'
              }`}
            >
              <span className="flex items-center justify-between gap-3">
                <span className="text-[13px] font-semibold text-[#382E2B]">{option.label}</span>
                <span className="shrink-0 text-[12px] font-semibold text-[#B35B48]">
                  {optionFee === 0 ? '本次免運' : `HKD ${optionFee}`}
                </span>
              </span>
              <span className="mt-0.5 block text-[11px] leading-relaxed text-[#8C7B70]">{option.detail}</span>
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-[12px] text-[#6E6058]">
        已選{selected.label}，本次運費 {fee === 0 ? '免運' : `HKD ${fee}`}。
      </p>
    </div>
  );
}
