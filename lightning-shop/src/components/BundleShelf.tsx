'use client';

import { useEffect, useState } from 'react';
import { auth, db } from '@/lib/firebase';
import { withoutDocumentId } from '@/lib/errors';
import { bundleCartName, bundleOriginalTotal, type ShopBundle } from '@/lib/bundle';

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

interface ProductStock {
  stock?: number | null;
}

export default function BundleShelf() {
  const [bundles, setBundles] = useState<ShopBundle[]>([]);
  const [stock, setStock] = useState<Record<string, ProductStock>>({});
  const [uid, setUid] = useState<string | null>(null);
  const [toast, setToast] = useState('');

  useEffect(() => {
    const unsubBundles = db.collection('bundles').onSnapshot((snapshot) => {
      const list: ShopBundle[] = [];
      snapshot.forEach((doc) => {
        const bundle = { id: doc.id, ...withoutDocumentId(doc.data()) } as ShopBundle;
        if (bundle.active && Array.isArray(bundle.items) && bundle.items.length > 1) list.push(bundle);
      });
      setBundles(list);
    });
    const unsubProducts = db.collection('products').onSnapshot((snapshot) => {
      const next: Record<string, ProductStock> = {};
      snapshot.forEach((doc) => {
        next[doc.id] = { stock: doc.data()?.stock };
      });
      setStock(next);
    });
    const unsubAuth = auth.onAuthStateChanged((user) => setUid(user?.uid ?? null));
    return () => {
      unsubBundles();
      unsubProducts();
      unsubAuth();
    };
  }, []);

  if (bundles.length === 0) return toast ? <span className="sr-only">{toast}</span> : null;

  const unavailable = (bundle: ShopBundle) => bundle.items.some((item) => {
    const current = stock[item.productId];
    return !current || (typeof current.stock === 'number' && current.stock < item.quantity);
  });

  const addBundle = (bundle: ShopBundle) => {
    if (unavailable(bundle)) return;
    const key = uid ? `villa_atelier_cart_${uid}` : 'villa_atelier_cart_guest';
    let cart: CartItem[] = [];
    try {
      const parsed: unknown = JSON.parse(localStorage.getItem(key) || '[]');
      if (Array.isArray(parsed)) cart = parsed as CartItem[];
    } catch {
      cart = [];
    }
    const cartId = `bundle:${bundle.id}`;
    const existing = cart.find((item) => item.id === cartId);
    if (existing) existing.quantity += 1;
    else cart.push({ id: cartId, name: bundleCartName(bundle), price: Number(bundle.price), quantity: 1 });
    localStorage.setItem(key, JSON.stringify(cart));
    window.dispatchEvent(new Event('villa-cart-updated'));
    setToast(`已將「${bundle.name}」放入購物車`);
    window.setTimeout(() => setToast(''), 2200);
  };

  return (
    <section id="bundles" className="mt-16 scroll-mt-36" aria-label="組合商品">
      <h2 className="mb-6 text-center font-serif text-[18px] tracking-[3px] text-[#382E2B]">組合優惠 / BUNDLES</h2>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {bundles.map((bundle) => {
          const original = bundleOriginalTotal(bundle.items);
          const blocked = unavailable(bundle);
          return (
            <article key={bundle.id} className="rounded-xl border border-[#EBE5DF] bg-white p-5 shadow-xs">
              <h3 className="text-[16px] font-semibold text-[#382E2B]">{bundle.name}</h3>
              <ul className="mt-3 space-y-1 text-[13px] text-[#6E6058]">
                {bundle.items.map((item) => (
                  <li key={item.productId}>{item.name} × {item.quantity}</li>
                ))}
              </ul>
              <div className="mt-4 flex items-end justify-between gap-3">
                <div>
                  <p className="font-mono text-[18px] font-semibold text-[#B35B48]">HKD {Number(bundle.price).toFixed(1)}</p>
                  {original > Number(bundle.price) && (
                    <p className="text-[12px] text-[#8C7B70] line-through">單買 HKD {original.toFixed(1)}</p>
                  )}
                </div>
                <button
                  type="button"
                  disabled={blocked}
                  onClick={() => addBundle(bundle)}
                  className="cursor-pointer rounded-lg border border-[#EBE5DF] bg-[#FAF7F2] px-4 py-2.5 text-[13px] font-medium text-[#382E2B] transition hover:bg-[#B35B48] hover:text-white disabled:cursor-not-allowed disabled:text-[#A3958B] disabled:hover:bg-[#FAF7F2] disabled:hover:text-[#A3958B]"
                >
                  {blocked ? '組合缺貨' : '加入購物車'}
                </button>
              </div>
            </article>
          );
        })}
      </div>
      <div className={`fixed bottom-8 left-1/2 z-4000 -translate-x-1/2 rounded-[30px] bg-[#382E2B] px-6 py-3 text-[13px] font-medium text-[#FAF7F2] shadow-md transition-all duration-500 ${toast ? 'translate-y-0' : 'pointer-events-none translate-y-[300%]'}`}>
        {toast}
      </div>
    </section>
  );
}
