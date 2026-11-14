"use client";

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_GROUPS = [
  {
    label: '商品管理',
    items: [
      { href: '/admin/new', label: '上架新商品' },
      { href: '/admin/products', label: '現時上架貨品' },
      { href: '/admin/discontinued', label: '已下架貨品' },
    ],
  },
  {
    label: '內容管理',
    items: [
      { href: '/admin/journey', label: '品牌誌' },
      { href: '/admin/lookbook', label: '造型集' },
    ],
  },
  {
    label: '營運管理',
    items: [
      { href: '/admin/orders', label: '訂單管理' },
      { href: '/admin/coupons', label: '優惠券管理' },
      { href: '/admin/credits', label: '購物金管理' },
      { href: '/admin/tier', label: '會員等級' },
    ],
  },
];

function groupForPath(pathname: string) {
  return NAV_GROUPS.find((group) => group.items.some((item) => item.href === pathname))?.label ?? null;
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const pathGroup = groupForPath(pathname);
  const [openLabel, setOpenLabel] = useState<string | null>(pathGroup);
  const [trackedPath, setTrackedPath] = useState(pathname);

  if (pathname !== trackedPath) {
    setTrackedPath(pathname);
    setOpenLabel(pathGroup);
  }

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-[#FAF7F2] text-[#382E2B] md:flex-row">
      <aside className="z-100 flex w-full shrink-0 flex-col border-b border-[#EBE5DF] bg-white px-4 py-3 md:h-full md:w-65 md:overflow-hidden md:border-r md:border-b-0 md:py-7.5">
        <div className="mb-3 px-2.5 text-center text-[16px] font-bold tracking-[3px] text-[#B35B48] uppercase md:mb-8 md:text-left md:text-[18px]">
          VILLA ATELIER
          <span className="mt-1.25 ml-2 inline-block text-[11px] font-medium tracking-[1px] text-[#8C7B70] md:ml-0 md:block">
            SELLER CENTER
          </span>
        </div>

        <nav className="md:flex-1 md:overflow-y-auto md:pr-1" aria-label="後台導覽">
          <Link
            href="/admin"
            className={`mb-1.5 flex items-center rounded-md px-2 py-2.5 text-[12px] font-semibold tracking-[0.5px] whitespace-nowrap transition-all md:px-3.75 md:py-3 md:text-[14px] md:tracking-[1px] ${
              pathname === '/admin'
                ? 'bg-[#B35B48] text-white'
                : 'text-[#7A6E65] hover:bg-[#E6D5CC]/30 hover:text-[#382E2B] max-md:bg-[#FAF7F2]'
            }`}
          >
            數據儀表板
          </Link>
          <ul className="flex list-none gap-1.5 overflow-x-auto md:flex-col md:overflow-visible">
            {NAV_GROUPS.map((group) => {
              const open = openLabel === group.label;
              return (
                <li key={group.label} className="flex min-w-0 flex-1 md:w-full md:flex-none md:flex-col">
                  <button
                    type="button"
                    aria-expanded={open}
                    onClick={() => setOpenLabel(open ? null : group.label)}
                    className={`flex w-full items-center justify-between gap-1 rounded-md px-2 py-2.5 text-left text-[12px] font-semibold whitespace-nowrap tracking-[0.5px] transition-all md:px-3.75 md:py-3 md:text-[14px] md:tracking-[1px] ${
                      open
                        ? 'bg-[#B35B48] text-white'
                        : 'text-[#7A6E65] hover:bg-[#E6D5CC]/30 hover:text-[#382E2B] max-md:bg-[#FAF7F2]'
                    }`}
                  >
                    {group.label}
                    <span className={`text-[10px] transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden>
                      ▾
                    </span>
                  </button>
                  {open && (
                    <ul className="mt-1.5 hidden list-none flex-col gap-1.5 md:flex md:pl-2">
                      {group.items.map((item) => {
                        const active = pathname === item.href;
                        return (
                          <li key={item.href}>
                            <Link
                              href={item.href}
                              className={`flex items-center rounded-md px-3.75 py-2.5 text-[14px] font-medium whitespace-nowrap transition-all ${
                                active
                                  ? 'bg-[#382E2B] font-semibold text-white'
                                  : 'text-[#7A6E65] hover:bg-[#E6D5CC]/30 hover:text-[#382E2B]'
                              }`}
                            >
                              {item.label}
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
          {openLabel && (
            <ul className="mt-1.5 flex list-none gap-1.5 overflow-x-auto pb-1 md:hidden">
              {NAV_GROUPS.find((group) => group.label === openLabel)?.items.map((item) => {
                const active = pathname === item.href;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={`flex items-center rounded-md px-2.5 py-2 text-[12px] font-medium whitespace-nowrap transition-all ${
                        active
                          ? 'bg-[#382E2B] font-semibold text-white'
                          : 'bg-[#FAF7F2] text-[#7A6E65]'
                      }`}
                    >
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </nav>
      </aside>

      <main className="min-h-0 min-w-0 flex-1 overflow-y-auto">
        <div className="box-border w-full max-w-300 p-5 md:p-[40px_5%]">
          {children}
        </div>
      </main>
    </div>
  );
}
