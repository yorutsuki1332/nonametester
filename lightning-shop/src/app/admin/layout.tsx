"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-[#f9f9f8] text-[#333333]">
      {/* 側邊導覽列：手機版為上方橫向導覽，電腦版為左側固定 260px */}
      <aside className="w-full md:w-65 bg-white border-b md:border-b-0 md:border-r border-[#e5e5e5] px-4 py-3 md:py-7.5 flex flex-col md:fixed md:h-screen z-100 shrink-0">
        <div className="text-[16px] text-center md:text-left md:text-[20px] font-bold tracking-[2px] mb-3 md:mb-12.5 text-[#333333] px-2.5">
          LIGHTNING 
          <span className="text-[#888888] text-[12px] md:block inline-block ml-2 md:ml-0 mt-1.25 tracking-[1px] font-medium">
            SELLER CENTER
          </span>
        </div>

        <ul className="list-none flex flex-row md:flex-direction md:flex-col gap-1.5 overflow-x-auto pb-1 md:pb-0">
          <li>
            <Link 
              href="/admin" 
              className={`flex items-center text-[12px] px-2 py-2.5 md:px-3.75 md:py-3 md:text-[14px] font-medium rounded-md transition-all whitespace-nowrap ${
                pathname === '/admin' 
                  ? 'bg-[#FEF9C3] text-[#333333] font-semibold' 
                  : 'max-md:bg-[#f9f9f8] text-[#888888] hover:bg-[#FEF9C3] hover:text-[#333333]'
              }`}
            >
              📍 上架新商品
            </Link>
          </li>
          <li>
            <Link 
              href="/admin/products" 
              className={`flex items-center text-[12px] px-2 py-2.5 md:px-3.75 md:py-3 md:text-[14px] font-medium rounded-md transition-all whitespace-nowrap ${
                pathname === '/admin/products' 
                  ? 'bg-[#FEF9C3] text-[#333333] font-semibold' 
                  : 'max-md:bg-[#f9f9f8] text-[#888888] hover:bg-[#FEF9C3] hover:text-[#333333]'
              }`}
            >
              📦 現時上架貨品
            </Link>
          </li>
          <li>
            <Link 
              href="/admin/discontinued" 
              className={`flex items-center text-[12px] px-2 py-2.5 md:px-3.75 md:py-3 md:text-[14px] font-medium rounded-md transition-all whitespace-nowrap ${
                pathname === '/admin/discontinued' 
                  ? 'bg-[#FEF9C3] text-[#333333] font-semibold' 
                  : 'max-md:bg-[#f9f9f8] text-[#888888] hover:bg-[#FEF9C3] hover:text-[#333333]'
              }`}
            >
              📥 已下架貨品
            </Link>
          </li>
          <li>
            <Link 
              href="/admin/orders" 
              className={`flex items-center text-[12px] px-2 py-2.5 md:px-3.75 md:py-3 md:text-[14px] font-medium rounded-md transition-all whitespace-nowrap ${
                pathname === '/admin/orders' 
                  ? 'bg-[#FEF9C3] text-[#333333] font-semibold' 
                  : 'max-md:bg-[#f9f9f8] text-[#888888] hover:bg-[#FEF9C3] hover:text-[#333333]'
              }`}
            >
              📝 訂單管理
            </Link>
          </li>
          <li>
            <Link 
              href="/admin/coupons" 
              className={`flex items-center text-[12px] px-2 py-2.5 md:px-3.75 md:py-3 md:text-[14px] font-medium rounded-md transition-all whitespace-nowrap ${
                pathname === '/admin/coupons' 
                  ? 'bg-[#FEF9C3] text-[#333333] font-semibold' 
                  : 'max-md:bg-[#f9f9f8] text-[#888888] hover:bg-[#FEF9C3] hover:text-[#333333]'
              }`}
            >
              🎟️ 優惠券管理
            </Link>
          </li>
          <li>
            <Link 
              href="/admin/credits" 
              className={`flex items-center text-[12px] px-2 py-2.5 md:px-3.75 md:py-3 md:text-[14px] font-medium rounded-md transition-all whitespace-nowrap ${
                pathname === '/admin/credits' 
                  ? 'bg-[#FEF9C3] text-[#333333] font-semibold' 
                  : 'max-md:bg-[#f9f9f8] text-[#888888] hover:bg-[#FEF9C3] hover:text-[#333333]'
              }`}
            >
              💰 購物金/補償管理
            </Link>
          </li>
        </ul>
      </aside>

      {/* 主內容區：電腦版自動留出左側 260px 空間，手機版無邊距且在下方 */}
      <main className="ml-0 md:ml-65 grow p-5 md:p-[40px_5%] max-w-300 w-full md:w-[calc(100%-260px)] box-border">
        {children}
      </main>
    </div>
  );
}