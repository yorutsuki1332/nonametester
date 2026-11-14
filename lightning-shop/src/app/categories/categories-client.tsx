'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import firebase from 'firebase/compat/app';
import { auth, db } from '@/lib/firebase';
import { withoutDocumentId } from '@/lib/errors';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import { hotStockLabel } from '@/lib/stock-hint';

interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  tag?: string;
  stock?: number | null;
  images?: string[];
  createdAt?: firebase.firestore.Timestamp;
}

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

const CATEGORIES = [
  { id: 'all', label: '全部選品 ALL' },
  { id: 'DAILY WEAR', label: '日常服飾 DAILY WEAR' },
  { id: 'BAGS', label: '精選包袋 BAGS' },
  { id: 'ACCESSORY', label: '質感飾品 ACCESSORY' },
] as const;

const CATEGORY_MARK: Record<string, string> = {
  BAGS: '👜',
  ACCESSORY: '💍',
  'DAILY WEAR': '👕',
};

function isCategoryId(value: string): value is (typeof CATEGORIES)[number]['id'] {
  return CATEGORIES.some((item) => item.id === value);
}

export default function CategoriesClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const categoryParam = searchParams.get('category') || 'all';
  const category = isCategoryId(categoryParam) ? categoryParam : 'all';
  const keyword = searchParams.get('q') || '';
  const hotOnly = searchParams.get('hot') === '1';

  const [products, setProducts] = useState<Product[]>([]);
  const [ready, setReady] = useState(false);
  const [draft, setDraft] = useState(keyword);
  const [draftKeyword, setDraftKeyword] = useState(keyword);
  const [uid, setUid] = useState<string | null>(null);
  const [toast, setToast] = useState('');
  if (keyword !== draftKeyword) {
    setDraftKeyword(keyword);
    setDraft(keyword);
  }

  useEffect(() => {
    const unsubscribe = db.collection('products').orderBy('createdAt', 'desc').onSnapshot((snapshot) => {
      const list: Product[] = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...withoutDocumentId(doc.data()) } as Product);
      });
      setProducts(list);
      setReady(true);
    }, () => setReady(true));
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => setUid(user?.uid ?? null));
    return () => unsubscribe();
  }, []);

  const counts = useMemo(() => {
    const result: Record<string, number> = { all: products.length };
    for (const item of CATEGORIES) {
      if (item.id === 'all') continue;
      result[item.id] = products.filter((product) => product.category?.trim() === item.id).length;
    }
    return result;
  }, [products]);

  const visible = useMemo(() => {
    const lower = keyword.trim().toLowerCase();
    return products.filter((product) => {
      if (category !== 'all' && product.category?.trim() !== category) return false;
      if (hotOnly && product.tag?.trim().toUpperCase() !== 'HOT') return false;
      if (!lower) return true;
      return [product.name, product.category, product.tag].some((value) => value?.toLowerCase().includes(lower));
    });
  }, [products, category, keyword, hotOnly]);

  const updateQuery = (nextCategory: string, nextKeyword: string, nextHot = hotOnly) => {
    const params = new URLSearchParams();
    if (nextCategory !== 'all') params.set('category', nextCategory);
    if (nextKeyword) params.set('q', nextKeyword);
    if (nextHot) params.set('hot', '1');
    const query = params.toString();
    router.replace(query ? `/categories?${query}` : '/categories', { scroll: false });
  };

  const addToCart = (product: Product) => {
    const key = uid ? `villa_atelier_cart_${uid}` : 'villa_atelier_cart_guest';
    let cart: CartItem[] = [];
    try {
      const saved = localStorage.getItem(key);
      const parsed: unknown = saved ? JSON.parse(saved) : [];
      if (Array.isArray(parsed)) cart = parsed as CartItem[];
    } catch {
      cart = [];
    }
    const existing = cart.find((item) => item.id === product.id);
    if (existing) existing.quantity += 1;
    else cart.push({ id: product.id, name: product.name, price: Number(product.price), quantity: 1 });
    localStorage.setItem(key, JSON.stringify(cart));
    window.dispatchEvent(new Event('villa-cart-updated'));
    setToast(`已將「${product.name}」放入購物車`);
    window.setTimeout(() => setToast(''), 2200);
  };

  return (
    <div className="min-h-screen bg-[#FAF7F2] font-sans text-[#382E2B]">
      <SiteHeader
        selectedCategory={category}
        onMegaSelect={(nextCategory, nextKeyword) => updateQuery(nextCategory || 'all', nextKeyword, false)}
      />
      <main className="mx-auto w-full max-w-300 px-[4%] pt-36 pb-24">
        <header className="mb-10 text-center">
          <p className="mb-2 text-[11px] tracking-[3px] text-[#A3958B] uppercase">Complete Catalog</p>
          <h1 className="font-serif text-[24px] tracking-[3px] text-[#382E2B] sm:text-[28px]">全站選品分類</h1>
          <p className="mt-2 text-[13px] text-[#7A6E65]">
            瀏覽完整 {products.length} 件季節館藏，依生活場景篩選您的理想單品
          </p>
        </header>

        <div className="mb-8 flex flex-wrap justify-center gap-2.5">
          {CATEGORIES.map((item) => {
            const active = category === item.id && !hotOnly;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => updateQuery(item.id, keyword, false)}
                className={`cursor-pointer rounded-full px-5 py-2.5 text-[13px] font-medium transition ${
                  active
                    ? 'bg-[#B35B48] text-white shadow-xs'
                    : 'border border-[#EBE5DF] bg-[#F4F0EA] text-[#5C4D42] hover:bg-[#E6DCD2]'
                }`}
              >
                {item.label} ({counts[item.id] || 0})
              </button>
            );
          })}
        </div>

        <div className="mx-auto mb-12 max-w-md">
          <input
            type="text"
            value={draft}
            onChange={(event) => {
              const next = event.target.value;
              setDraft(next);
              updateQuery(category, next);
            }}
            placeholder="🔍 在此分類中搜尋商品名稱或材質..."
            aria-label="搜尋目錄"
            className="w-full rounded-full border border-[#EBE5DF] bg-white px-5 py-3.5 text-[14px] shadow-[0_2px_10px_rgba(56,46,43,0.02)] outline-none transition focus:border-[#B35B48]"
          />
        </div>

        {hotOnly && (
          <p className="mb-8 text-center text-[13px] text-[#7A6E65]">目前顯示熱銷單品</p>
        )}

        <div className="grid grid-cols-1 gap-[36px_26px] sm:grid-cols-2 lg:grid-cols-4">
          {!ready ? (
            <p className="col-span-full py-16 text-center text-[#888]">正在載入選品...</p>
          ) : visible.length === 0 ? (
            <p className="col-span-full py-16 text-center text-[#888]">沒有找到符合條件的選品。</p>
          ) : (
            visible.map((product, index) => {
              const image = product.images?.find((item) => item && item.trim());
              const eager = index === 0 && !!image;
              const stockLabel = hotStockLabel(product.tag, product.stock);
              const soldOut = stockLabel === '已售完';
              return (
                <article key={product.id} className="relative flex flex-col overflow-hidden rounded-xl border border-[#EBE5DF] bg-white shadow-xs transition duration-400 hover:-translate-y-1.5">
                  {product.tag && (
                    <div className="absolute top-3.75 left-3.75 z-10 rounded bg-[#B35B48] px-2.5 py-1 text-[10px] font-semibold text-white">
                      {product.tag}
                    </div>
                  )}
                  <Link href={`/product/${product.id}`} className="block grow text-inherit no-underline">
                    <div className="relative flex h-64 w-full items-center justify-center overflow-hidden bg-[#F4F0EA] sm:h-85">
                      {image ? (
                        <Image src={image} alt={product.name} fill sizes="(max-width: 768px) 100vw, 280px" className="object-cover" priority={eager} loading={eager ? 'eager' : 'lazy'} />
                      ) : (
                        <div className="flex flex-col items-center gap-2 px-6 text-center">
                          <span className="text-[28px]">{CATEGORY_MARK[product.category] || '✨'}</span>
                          <span className="text-[13px] text-[#A3958B]">{product.name}</span>
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <h2 className="mb-2 line-clamp-1 text-[14px] font-medium text-[#382E2B]">{product.name}</h2>
                      {stockLabel && (
                        <p className={`mb-1 text-[12px] font-semibold ${soldOut ? 'text-[#7A6E65]' : 'text-[#B35B48]'}`}>{stockLabel}</p>
                      )}
                      <div className="text-[14px] font-semibold text-[#B35B48]">HKD {Number(product.price).toFixed(1)}</div>
                    </div>
                  </Link>
                  <div className="px-4 pb-4">
                    <button
                      type="button"
                      onClick={() => addToCart(product)}
                      className="w-full cursor-pointer rounded-lg border border-[#EBE5DF] bg-[#FAF7F2] py-2.5 text-[13px] font-medium text-[#382E2B] transition hover:bg-[#B35B48] hover:text-white disabled:cursor-not-allowed disabled:bg-[#F4F0EA] disabled:text-[#A3958B] disabled:hover:bg-[#F4F0EA] disabled:hover:text-[#A3958B]"
                      disabled={soldOut}
                    >
                      {soldOut ? '已售完' : '加入購物車'}
                    </button>
                  </div>
                </article>
              );
            })
          )}
        </div>
      </main>
      <SiteFooter />
      <div className={`fixed bottom-8 left-1/2 z-4000 -translate-x-1/2 rounded-[30px] bg-[#382E2B] px-6 py-3 text-[13px] font-medium text-[#FAF7F2] shadow-md transition-all duration-500 ${toast ? 'translate-y-0' : 'translate-y-[300%]'}`}>
        {toast}
      </div>
    </div>
  );
}
