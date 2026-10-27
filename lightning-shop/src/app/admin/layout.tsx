"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  return (
    <div className="bg-[#f9f9f8] text-[#333333] flex min-h-screen font-sans">
      <aside className="w-[260px] bg-[#ffffff] border-r border-[#e5e5e5] px-[20px] pt-[30px] flex flex-col fixed h-screen z-10">
        <div className="logo px-[10px] text-[20px] font-bold mb-[30px] tracking-[2px]">
          LIGHTNING <span className="text-[#888888] text-[12px] block tracking-[1px]">SELLER CENTER</span>
        </div>
        <ul style={{ paddingLeft: 0, paddingRight: 0, marginLeft: 0, marginRight: 0 }}className="list-none flex flex-col gap-[10px] p-0 m-0 w-full">
          <li className="w-full m-0 p-0">
            <Link href="/admin" className={`admin-link ${pathname === '/admin' ? 'active' : ''}`}>
              📍 上架新商品
            </Link>
          </li>
          <li className="w-full m-0 p-0">
            <Link href="/admin/products" className={`admin-link ${pathname === '/admin/products' ? 'active' : ''}`}>
              📦 現時上架貨品
            </Link>
          </li>
          <li className="w-full m-0 p-0">
            <Link href="/admin/discontinued" className={`admin-link ${pathname === '/admin/discontinued' ? 'active' : ''}`}>
              📥 已下架貨品
            </Link>
          </li>
          <li className="w-full m-0 p-0">
            <Link href="/admin/orders" className={`admin-link ${pathname === '/admin/orders' ? 'active' : ''}`}>
              📝 訂單管理
            </Link>
          </li>
        </ul>
      </aside>
      <main className="ml-[260px] flex-grow p-[40px_5%] max-w-[1200px] w-[calc(100%-260px)]">
        {children}
      </main>
    </div>
  );
}