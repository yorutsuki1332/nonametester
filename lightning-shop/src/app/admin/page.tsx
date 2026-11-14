'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import firebase from 'firebase/compat/app';
import { db } from '@/lib/firebase';
import { withoutDocumentId } from '@/lib/errors';

const LOW_STOCK = 5;
const AWAITING = new Set(['pending', 'paid', 'preparing']);

interface OrderItem {
  name?: string;
  quantity?: number;
}

interface Order {
  id: string;
  name?: string;
  total?: number;
  status?: string;
  items?: OrderItem[];
  createdAt?: firebase.firestore.Timestamp;
}

interface Product {
  id: string;
  name?: string;
  stock?: number | null;
}

function createdMillis(value: firebase.firestore.Timestamp | undefined) {
  if (!value || typeof value.toMillis !== 'function') return 0;
  return value.toMillis();
}

function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
}

function formatAmount(value: number) {
  const rounded = Math.round(value * 10) / 10;
  const text = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
  return `HKD $${text}`;
}

function formatWhen(ms: number) {
  if (!ms) return '時間未記';
  const date = new Date(ms);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${month}/${day} ${hours}:${minutes}`;
}

function statusLabel(status?: string) {
  switch (status) {
    case 'paid': return '已確認付款';
    case 'preparing': return '備貨中';
    case 'shipping': return '配送中';
    case 'completed': return '已完成';
    case 'cancelled': return '已取消';
    default: return '待處理';
  }
}

export default function AdminDashboardPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [ordersReady, setOrdersReady] = useState(false);
  const [productsReady, setProductsReady] = useState(false);

  useEffect(() => {
    const unsubscribeOrders = db.collection('orders').onSnapshot((snapshot) => {
      setOrders(snapshot.docs.map((doc) => ({ id: doc.id, ...withoutDocumentId(doc.data()) }) as Order));
      setOrdersReady(true);
    });
    const unsubscribeProducts = db.collection('products').onSnapshot((snapshot) => {
      setProducts(snapshot.docs.map((doc) => ({ id: doc.id, ...withoutDocumentId(doc.data()) }) as Product));
      setProductsReady(true);
    });
    return () => {
      unsubscribeOrders();
      unsubscribeProducts();
    };
  }, []);

  const ready = ordersReady && productsReady;
  const todayStart = startOfToday();
  const activeOrders = orders.filter((order) => order.status !== 'cancelled');
  const todayCount = activeOrders.filter((order) => createdMillis(order.createdAt) >= todayStart).length;
  const revenue = activeOrders.reduce((sum, order) => sum + (Number(order.total) || 0), 0);
  const awaiting = activeOrders
    .filter((order) => !order.status || AWAITING.has(order.status))
    .sort((a, b) => createdMillis(a.createdAt) - createdMillis(b.createdAt));
  const lowStock = products
    .filter((product) => typeof product.stock === 'number' && product.stock <= LOW_STOCK)
    .sort((a, b) => (a.stock ?? 0) - (b.stock ?? 0));
  const untracked = products.filter((product) => typeof product.stock !== 'number').length;

  const cards = [
    { label: '今日訂單', value: ready ? String(todayCount) : '—', hint: '不含已取消', href: '/admin/orders' },
    { label: '總營收', value: ready ? formatAmount(revenue) : '—', hint: '未取消訂單的實收', href: '/admin/orders' },
    { label: '待出貨', value: ready ? String(awaiting.length) : '—', hint: '待處理、已付款、備貨中', href: '/admin/orders', alert: awaiting.length > 0 },
    { label: '低庫存', value: ready ? String(lowStock.length) : '—', hint: `${LOW_STOCK} 件以下`, href: '/admin/products', alert: lowStock.length > 0 },
  ];

  return (
    <>
      <div className="mb-8">
        <h1 className="mb-1 font-serif text-2xl font-semibold text-[#382E2B]">數據儀表板</h1>
        <p className="text-sm text-[#7A6E65]">今日訂單、總營收、待出貨與低庫存。數字會跟著訂單和商品即時更新。</p>
      </div>

      <div className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className={`rounded-2xl border bg-white p-4 no-underline shadow-[0_4px_20px_rgba(56,46,43,0.03)] transition hover:border-[#B35B48]/50 md:p-5 ${
              card.alert ? 'border-[#B35B48]/40' : 'border-[#EBE5DF]'
            }`}
          >
            <p className="text-[12px] font-semibold tracking-[1px] text-[#7A6E65]">{card.label}</p>
            <p className={`mt-2 font-mono text-[22px] leading-none md:text-[28px] ${card.alert ? 'text-[#B35B48]' : 'text-[#382E2B]'}`}>
              {card.value}
            </p>
            <p className="mt-2 text-[11px] text-[#A3958B]">{card.hint}</p>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-[#EBE5DF] bg-white p-5 md:p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="font-serif text-[18px] text-[#382E2B]">待出貨訂單</h2>
            <Link href="/admin/orders" className="text-[12px] font-semibold text-[#B35B48] no-underline">
              前往訂單
            </Link>
          </div>
          {ready && awaiting.length === 0 && (
            <p className="text-sm text-[#7A6E65]">目前沒有待出貨的訂單。</p>
          )}
          <ul className="flex flex-col">
            {awaiting.slice(0, 8).map((order) => (
              <li key={order.id} className="border-b border-[#EBE5DF] py-3 last:border-b-0">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[14px] font-medium text-[#382E2B]">{order.name || '未填收件人'}</p>
                    <p className="text-[12px] text-[#A3958B]">{order.id} · {statusLabel(order.status)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[13px] font-semibold text-[#B35B48]">{formatAmount(Number(order.total) || 0)}</p>
                    <p className="text-[11px] text-[#A3958B]">{formatWhen(createdMillis(order.createdAt))}</p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
          {awaiting.length > 8 && (
            <p className="mt-3 text-[12px] text-[#7A6E65]">還有 {awaiting.length - 8} 筆，請到訂單管理查看。</p>
          )}
        </section>

        <section className="rounded-2xl border border-[#EBE5DF] bg-white p-5 md:p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="font-serif text-[18px] text-[#382E2B]">低庫存警示</h2>
            <Link href="/admin/products" className="text-[12px] font-semibold text-[#B35B48] no-underline">
              前往貨品
            </Link>
          </div>
          {ready && lowStock.length === 0 && (
            <p className="text-sm text-[#7A6E65]">目前沒有 {LOW_STOCK} 件以下的商品。</p>
          )}
          <ul className="flex flex-col">
            {lowStock.slice(0, 8).map((product) => (
              <li key={product.id} className="flex items-center justify-between gap-3 border-b border-[#EBE5DF] py-3 last:border-b-0">
                <div>
                  <p className="text-[14px] font-medium text-[#382E2B]">{product.name || product.id}</p>
                  <p className="text-[12px] text-[#A3958B]">{product.id}</p>
                </div>
                <p className="text-[13px] font-semibold text-[#B35B48]">
                  {product.stock === 0 ? '缺貨' : `剩 ${product.stock} 件`}
                </p>
              </li>
            ))}
          </ul>
          {ready && untracked > 0 && (
            <p className="mt-3 text-[12px] leading-relaxed text-[#7A6E65]">
              另有 {untracked} 件尚未記入庫存，可在現時上架貨品的修改視窗補上數量。
            </p>
          )}
        </section>
      </div>
    </>
  );
}
