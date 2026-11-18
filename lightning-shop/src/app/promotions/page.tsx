'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import StudioPage from '@/components/StudioPage';
import { db } from '@/lib/firebase';
import { withoutDocumentId } from '@/lib/errors';
import { bundleOriginalTotal, type ShopBundle } from '@/lib/bundle';
import { FREE_SHIPPING_THRESHOLD, shippingRuleText } from '@/lib/shipping';

interface Offer {
  id: string;
  code: string;
  discountText: string;
  minSpend: number;
  discountType?: string;
  usesLeft: number;
  targetAccountId?: string | null;
  conditionType?: string;
  startTime?: string | null;
  endTime?: string | null;
  targetTierName?: string | null;
  buyQuantity?: number | null;
  freeQuantity?: number | null;
}

interface ShelfProduct {
  id: string;
  name: string;
  price: number;
  category?: string;
  images?: string[];
  tag?: string;
}

interface TierItem {
  id: string;
  name: string;
  badge?: string;
  threshold: number;
  discount: number;
}

const CATEGORY_MARK: Record<string, string> = {
  BAGS: '👜',
  ACCESSORY: '✨',
  'DAILY WEAR': '👕',
};

function clockLabel(date: Date) {
  return date.toLocaleTimeString('zh-HK', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function offerWindow(offer: Offer) {
  if (!offer.endTime) return '長期有效';
  const end = new Date(offer.endTime);
  if (Number.isNaN(end.getTime())) return '長期有效';
  return `至 ${end.toLocaleString('zh-HK', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`;
}

function offerNote(offer: Offer) {
  if (offer.discountType === 'bogo') return `買 ${offer.buyQuantity || 0} 送 ${offer.freeQuantity || 0}`;
  if (offer.discountType === 'rank') return `${offer.targetTierName || '指定等級'} 可使用`;
  if (offer.minSpend > 0) return `滿 HKD ${offer.minSpend} 可用`;
  return '無低消';
}

function tierLabel(discount: number) {
  if (discount >= 1) return '原價';
  return `${Math.round(discount * 100)} 折`;
}

export default function PromotionsPage() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [bundles, setBundles] = useState<ShopBundle[]>([]);
  const [products, setProducts] = useState<ShelfProduct[]>([]);
  const [shelfCount, setShelfCount] = useState(0);
  const [tiers, setTiers] = useState<TierItem[]>([]);
  const [ready, setReady] = useState({ offers: false, bundles: false, products: false });
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  useEffect(() => {
    const mark = (key: keyof typeof ready) => {
      setReady((current) => ({ ...current, [key]: true }));
      setUpdatedAt(new Date());
    };
    const unsubOffers = db.collection('coupons').where('usesLeft', '>', 0).onSnapshot((snapshot) => {
      const now = Date.now();
      const list: Offer[] = [];
      snapshot.forEach((doc) => {
        const offer = { id: doc.id, ...withoutDocumentId(doc.data()) } as Offer;
        if (offer.targetAccountId && offer.targetAccountId.trim()) return;
        if ((offer.conditionType === 'periods' || offer.conditionType === 'counts') && offer.startTime && offer.endTime) {
          const start = new Date(offer.startTime).getTime();
          const end = new Date(offer.endTime).getTime();
          if (!(now >= start && now <= end)) return;
        }
        list.push(offer);
      });
      setOffers(list);
      mark('offers');
    }, () => mark('offers'));
    const unsubBundles = db.collection('bundles').onSnapshot((snapshot) => {
      const list: ShopBundle[] = [];
      snapshot.forEach((doc) => {
        const bundle = { id: doc.id, ...withoutDocumentId(doc.data()) } as ShopBundle;
        if (bundle.active && Array.isArray(bundle.items) && bundle.items.length > 1) list.push(bundle);
      });
      setBundles(list);
      mark('bundles');
    }, () => mark('bundles'));
    const unsubProducts = db.collection('products').orderBy('createdAt', 'desc').onSnapshot((snapshot) => {
      const list: ShelfProduct[] = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...withoutDocumentId(doc.data()) } as ShelfProduct);
      });
      setShelfCount(list.length);
      setProducts(list.slice(0, 6));
      mark('products');
    }, () => mark('products'));
    const unsubTiers = db.collection('settings').doc('member_tiers').onSnapshot((doc) => {
      const stored = doc.data()?.tiers;
      setTiers(Array.isArray(stored) ? stored as TierItem[] : []);
    });
    return () => {
      unsubOffers();
      unsubBundles();
      unsubProducts();
      unsubTiers();
    };
  }, []);

  const loaded = ready.offers && ready.bundles && ready.products;

  return (
    <StudioPage
      kicker="NOW · 活動與店況"
      title="這一刻，店裡正在發生的事"
      lede="優惠券、組合與新上架都直接讀網店資料。店家一改，這一頁就跟著變。"
      wide
    >
      <p className="mb-6 text-center text-[12px] tracking-[1px] text-[#A3958B]">
        {updatedAt ? `資料更新於 ${clockLabel(updatedAt)}` : '正在讀取店況...'}
      </p>

      <div className="mb-12 grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: '上架商品', value: loaded ? String(shelfCount) : '—' },
          { label: '進行中的全站優惠', value: loaded ? String(offers.length) : '—' },
          { label: '組合優惠', value: loaded ? String(bundles.length) : '—' },
          { label: '免運門檻', value: `HKD ${FREE_SHIPPING_THRESHOLD}` },
        ].map((item) => (
          <div key={item.label} className="rounded-2xl border border-[#EBE5DF] bg-white px-4 py-5 text-center">
            <p className="font-serif text-[22px] text-[#B35B48]">{item.value}</p>
            <p className="mt-1 text-[12px] text-[#7A6E65]">{item.label}</p>
          </div>
        ))}
      </div>

      <section className="mb-14" aria-label="進行中的優惠">
        <h2 className="mb-5 font-serif text-[22px] text-[#382E2B]">進行中的優惠</h2>
        {!loaded ? (
          <div className="h-28 animate-pulse rounded-2xl bg-[#E7E0D8]" />
        ) : offers.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-[#EBE5DF] bg-white px-5 py-8 text-center text-[14px] text-[#7A6E65]">現在沒有開放給全站的優惠券。</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {offers.map((offer) => (
              <article key={offer.id} className="rounded-2xl border border-[#EBE5DF] bg-white p-5">
                <p className="text-[11px] tracking-[2px] text-[#B35B48]">{offer.code}</p>
                <h3 className="mt-2 font-serif text-[18px] text-[#382E2B]">{offer.discountText || offer.code}</h3>
                <p className="mt-2 text-[13px] text-[#6E6058]">{offerNote(offer)} · {offerWindow(offer)}</p>
                {offer.usesLeft < 99999 && <p className="mt-1 text-[12px] text-[#A3958B]">剩餘 {offer.usesLeft} 次</p>}
              </article>
            ))}
          </div>
        )}
      </section>

      <section id="bundles" className="mb-14 scroll-mt-36" aria-label="組合優惠">
        <div className="mb-5 flex items-end justify-between gap-3">
          <h2 className="font-serif text-[22px] text-[#382E2B]">組合優惠</h2>
          <Link href="/#bundles" className="text-[13px] font-semibold text-[#B35B48] no-underline hover:underline">到首頁加入購物車</Link>
        </div>
        {!loaded ? (
          <div className="h-28 animate-pulse rounded-2xl bg-[#E7E0D8]" />
        ) : bundles.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-[#EBE5DF] bg-white px-5 py-8 text-center text-[14px] text-[#7A6E65]">現在沒有上架中的組合。</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {bundles.map((bundle) => {
              const original = bundleOriginalTotal(bundle.items);
              return (
                <article key={bundle.id} className="rounded-2xl border border-[#EBE5DF] bg-white p-5">
                  <h3 className="text-[16px] font-semibold text-[#382E2B]">{bundle.name}</h3>
                  <ul className="mt-3 space-y-1 text-[13px] text-[#6E6058]">
                    {bundle.items.map((item) => (
                      <li key={item.productId}>{item.name} × {item.quantity}</li>
                    ))}
                  </ul>
                  <p className="mt-4 font-mono text-[18px] font-semibold text-[#B35B48]">HKD {Number(bundle.price).toFixed(1)}</p>
                  {original > Number(bundle.price) && (
                    <p className="text-[12px] text-[#8C7B70] line-through">單買 HKD {original.toFixed(1)}</p>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="mb-14" aria-label="最新上架">
        <div className="mb-5 flex items-end justify-between gap-3">
          <h2 className="font-serif text-[22px] text-[#382E2B]">最新上架</h2>
          <Link href="/categories" className="text-[13px] font-semibold text-[#B35B48] no-underline hover:underline">看全站目錄</Link>
        </div>
        {!loaded ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }, (_, index) => <div key={index} className="h-72 animate-pulse rounded-2xl bg-[#E7E0D8]" />)}
          </div>
        ) : products.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-[#EBE5DF] bg-white px-5 py-8 text-center text-[14px] text-[#7A6E65]">現在沒有上架商品。</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => {
              const image = product.images?.find((item) => item && item.trim());
              return (
                <Link key={product.id} href={`/product/${product.id}`} className="overflow-hidden rounded-2xl border border-[#EBE5DF] bg-white no-underline transition hover:-translate-y-1">
                  <div className="relative flex h-52 items-center justify-center bg-[#F4F0EA]">
                    {image ? (
                      <Image src={image} alt={product.name} fill sizes="(max-width: 768px) 100vw, 280px" className="object-cover" />
                    ) : (
                      <span className="text-[28px]">{CATEGORY_MARK[product.category || ''] || '✨'}</span>
                    )}
                  </div>
                  <div className="p-4">
                    {product.tag && <p className="mb-1 text-[11px] font-semibold text-[#B35B48]">{product.tag}</p>}
                    <h3 className="line-clamp-1 text-[14px] font-medium text-[#382E2B]">{product.name}</h3>
                    <p className="mt-2 text-[14px] font-semibold text-[#B35B48]">HKD {Number(product.price).toFixed(1)}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2" aria-label="會員與配送">
        <article className="rounded-2xl border border-[#EBE5DF] bg-white p-6">
          <h2 className="mb-4 font-serif text-[20px] text-[#382E2B]">會員等級</h2>
          {tiers.length === 0 ? (
            <p className="text-[14px] text-[#7A6E65]">會員等級尚未設定。</p>
          ) : (
            <ul className="space-y-3">
              {tiers.map((tier) => (
                <li key={tier.id} className="flex items-center justify-between gap-3 text-[14px]">
                  <span>{tier.badge ? `${tier.badge} ` : ''}{tier.name}</span>
                  <span className="text-right text-[#6E6058]">滿 HKD {tier.threshold} · {tierLabel(Number(tier.discount))}</span>
                </li>
              ))}
            </ul>
          )}
        </article>
        <article className="rounded-2xl border border-[#EBE5DF] bg-[#F4F0EA] p-6">
          <h2 className="mb-4 font-serif text-[20px] text-[#382E2B]">配送</h2>
          <p className="text-[14px] leading-[1.9] text-[#5C4D42]">{shippingRuleText()}</p>
          <Link href="/qa#shipping" className="mt-4 inline-block text-[13px] font-semibold text-[#B35B48] no-underline hover:underline">看完整說明</Link>
        </article>
      </section>
    </StudioPage>
  );
}
