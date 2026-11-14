'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import MegaMenu from '@/components/MegaMenu';

interface SiteHeaderProps {
  selectedCategory?: string;
  onMegaSelect?: (category: string, keyword: string) => void;
}

function readCartCount(uid: string | null) {
  const key = uid ? `villa_atelier_cart_${uid}` : 'villa_atelier_cart_guest';
  try {
    const raw = localStorage.getItem(key);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return 0;
    return parsed.reduce((sum, item) => {
      const quantity = item && typeof item === 'object' && 'quantity' in item ? Number(item.quantity) : 0;
      return sum + (Number.isFinite(quantity) ? quantity : 0);
    }, 0);
  } catch {
    return 0;
  }
}

export default function SiteHeader({ selectedCategory = '', onMegaSelect }: SiteHeaderProps) {
  const router = useRouter();
  const [uid, setUid] = useState<string | null>(null);
  const [accountId, setAccountId] = useState('');
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      setUid(user?.uid ?? null);
      if (!user) {
        setAccountId('');
        return;
      }
      try {
        const snapshot = await db.collection('users').where('uid', '==', user.uid).get();
        setAccountId(snapshot.empty ? '' : snapshot.docs[0].id);
      } catch {
        setAccountId('');
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const sync = () => setCartCount(readCartCount(uid));
    sync();
    window.addEventListener('storage', sync);
    window.addEventListener('villa-cart-updated', sync);
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener('villa-cart-updated', sync);
    };
  }, [uid]);

  const handleMegaSelect = (category: string, keyword: string) => {
    if (onMegaSelect) {
      onMegaSelect(category, keyword);
      return;
    }
    const params = new URLSearchParams();
    if (category && category !== 'all') params.set('category', category);
    if (keyword) params.set('q', keyword);
    const query = params.toString();
    router.push(query ? `/categories?${query}` : '/categories');
  };

  return (
    <>
      <nav className="fixed top-0 left-0 z-1000 flex h-18.75 w-full items-center justify-between border-b border-[#EBE5DF] bg-[#FAF7F2]/95 px-[6%] backdrop-blur-sm">
        <Link href="/" className="text-[18px] font-bold tracking-[3px] text-[#B35B48] uppercase no-underline">
          VILLA ATELIER
        </Link>
        <div className="flex items-center gap-4">
          <Link
            href={uid ? '/account' : '/?login=1'}
            className="group flex items-center justify-center gap-1.5 rounded-md border border-[#EBE5DF] bg-[#F4F0EA] p-2 text-[13px] font-medium text-[#382E2B] transition hover:bg-[#C28C7A] hover:text-white md:px-3 md:py-1.5"
            title={uid ? `會員中心 (${accountId})` : '會員登入 / 註冊'}
          >
            <svg
              className="h-5 w-5 fill-none stroke-[#382E2B] stroke-[1.5] transition group-hover:stroke-white"
              viewBox="0 0 24 24"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
            <span className="hidden md:inline">
              {uid ? `會員中心${accountId ? ` (${accountId})` : ''}` : '會員登入 / 註冊'}
            </span>
          </Link>
          <Link href="/?cart=1" aria-label={`購物車，${cartCount} 件`} className="relative flex items-center p-1.5">
            <svg className="h-5.5 w-5.5 fill-none stroke-[#382E2B] stroke-[1.5]" viewBox="0 0 24 24">
              <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <path d="M16 10a4 4 0 0 1-8 0"></path>
            </svg>
            <div className="absolute -top-1 -right-1.5 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-[#B35B48] text-[11px] font-semibold text-white shadow-xs">
              {cartCount}
            </div>
          </Link>
        </div>
      </nav>
      <MegaMenu selectedCategory={selectedCategory} onSelect={handleMegaSelect} />
    </>
  );
}
