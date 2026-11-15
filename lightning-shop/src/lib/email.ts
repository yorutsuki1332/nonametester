import { Resend } from 'resend';
import type { OrderEmailItem } from '@/lib/errors';

const FROM = 'LIGHTNING LIFESTYLE <onboarding@resend.dev>';

export function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function isEmail(value: unknown): value is string {
  return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 200;
}

function asItems(value: unknown): OrderEmailItem[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 40).flatMap((item) => {
    if (!item || typeof item !== 'object') return [];
    const record = item as { name?: unknown; quantity?: unknown; price?: unknown };
    const quantity = Number(record.quantity);
    const price = Number(record.price);
    if (typeof record.name !== 'string' || !record.name.trim()) return [];
    if (!Number.isFinite(quantity) || !Number.isFinite(price)) return [];
    return [{ name: record.name.trim(), quantity, price }];
  });
}

function itemList(items: OrderEmailItem[]) {
  return items
    .map((item) => `<li>${escapeHtml(item.name)} × ${item.quantity} — HKD $${(item.price * item.quantity).toFixed(1)}</li>`)
    .join('');
}

function shell(body: string) {
  return `
    <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
      <h2 style="color: #111; border-bottom: 2px solid #E7D3CB; padding-bottom: 10px;">VILLA ATELIER</h2>
      ${body}
      <p style="margin-top: 30px; font-size: 12px; color: #888;">此為系統自動發送信件，請勿直接回覆。</p>
    </div>
  `;
}

export type OrderMailResult = { ok: true } | { ok: false; status: number; error: string };

export async function sendOrderMail(body: unknown): Promise<OrderMailResult> {
  if (!body || typeof body !== 'object') return { ok: false, status: 400, error: '信件內容不完整' };
  const record = body as Record<string, unknown>;
  const kind = record.kind === 'shipped' ? 'shipped' : record.kind === 'confirm' ? 'confirm' : '';
  if (!kind) return { ok: false, status: 400, error: '請指定信件種類' };
  if (!isEmail(record.email)) return { ok: false, status: 400, error: '收件信箱不正確' };
  if (typeof record.orderId !== 'string' || !record.orderId.trim()) return { ok: false, status: 400, error: '缺少訂單編號' };

  const orderId = record.orderId.trim();
  const name = typeof record.name === 'string' ? record.name.trim() : '';
  const deliveryLabel = typeof record.deliveryLabel === 'string' ? record.deliveryLabel.trim() : '';
  const address = typeof record.address === 'string' ? record.address.trim() : '';
  const greeting = name ? `${escapeHtml(name)} 您好` : '您好';

  let subject = '';
  let html = '';

  if (kind === 'confirm') {
    const items = asItems(record.items);
    const total = Number(record.total);
    if (!items.length || !Number.isFinite(total)) return { ok: false, status: 400, error: '訂單明細不完整' };
    subject = `【VILLA ATELIER】訂單 #${orderId} 已成立`;
    html = shell(`
      <p>${greeting}，訂單已成立。</p>
      <div style="background: #fafafa; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 5px 0;"><strong>訂單編號：</strong> #${escapeHtml(orderId)}</p>
        <p style="margin: 5px 0;"><strong>訂單總計：</strong> HKD $${total.toFixed(1)}</p>
        ${deliveryLabel ? `<p style="margin: 5px 0;"><strong>送貨方式：</strong> ${escapeHtml(deliveryLabel)}</p>` : ''}
        ${address ? `<p style="margin: 5px 0;"><strong>收件資料：</strong> ${escapeHtml(address)}</p>` : ''}
      </div>
      <h3>購買品項</h3>
      <ul>${itemList(items)}</ul>
      <p>出貨時會再寄一封信，附上順豐物流追蹤編號。會員可在會員中心的訂單裡查看同一組編號。</p>
    `);
  } else {
    const trackingNumber = typeof record.trackingNumber === 'string' ? record.trackingNumber.trim() : '';
    if (!trackingNumber || trackingNumber.length > 40) return { ok: false, status: 400, error: '請填寫物流追蹤編號' };
    subject = `【VILLA ATELIER】訂單 #${orderId} 已出貨`;
    html = shell(`
      <p>${greeting}，訂單 #${escapeHtml(orderId)} 已交給順豐速遞。</p>
      <div style="background: #fafafa; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 5px 0;"><strong>物流追蹤編號：</strong> ${escapeHtml(trackingNumber)}</p>
        <p style="margin: 5px 0;"><strong>承運：</strong> 順豐速遞</p>
        ${deliveryLabel ? `<p style="margin: 5px 0;"><strong>送貨方式：</strong> ${escapeHtml(deliveryLabel)}</p>` : ''}
        ${address ? `<p style="margin: 5px 0;"><strong>收件資料：</strong> ${escapeHtml(address)}</p>` : ''}
      </div>
      <p>請用這個追蹤編號向順豐查詢。會員中心的訂單進度也會顯示同一組編號。</p>
    `);
  }

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({ from: FROM, to: [record.email], subject, html });
    return { ok: true };
  } catch (error) {
    console.error('發送訂單郵件失敗:', error);
    return { ok: false, status: 500, error: '信件未能寄出' };
  }
}
