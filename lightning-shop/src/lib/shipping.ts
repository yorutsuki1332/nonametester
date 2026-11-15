export const FREE_SHIPPING_THRESHOLD = 600;

export type DeliveryMethod = 'sf-pickup' | 'home';

export const DELIVERY_OPTIONS: {
  id: DeliveryMethod;
  label: string;
  fee: number;
  detail: string;
  addressLabel: string;
  addressPlaceholder: string;
}[] = [
  {
    id: 'sf-pickup',
    label: '順豐速遞自取點',
    fee: 30,
    detail: '送到順豐站、順便智能櫃或 OK 便利店，由你自行領取。',
    addressLabel: '順豐自取點',
    addressPlaceholder: '例如：銅鑼灣時代廣場順豐站',
  },
  {
    id: 'home',
    label: '住宅配送',
    fee: 50,
    detail: '順豐派送到住宅或辦公室，需有人簽收。',
    addressLabel: '收件地址',
    addressPlaceholder: '請輸入完整住宅或辦公室地址',
  },
];

export function deliveryOption(method: DeliveryMethod) {
  return DELIVERY_OPTIONS.find((option) => option.id === method) ?? DELIVERY_OPTIONS[1];
}

export function shippingFeeFor(subtotal: number, method: DeliveryMethod) {
  if (subtotal >= FREE_SHIPPING_THRESHOLD) return 0;
  return deliveryOption(method).fee;
}

export function shippingRuleText() {
  const fees = DELIVERY_OPTIONS.map((option) => `${option.label} HKD ${option.fee}`).join('、');
  return `運費依商品小計計算。未滿 HKD ${FREE_SHIPPING_THRESHOLD}：${fees}。滿 HKD ${FREE_SHIPPING_THRESHOLD} 兩種都免運。會員折扣、優惠券與購物金不計入門檻。`;
}
