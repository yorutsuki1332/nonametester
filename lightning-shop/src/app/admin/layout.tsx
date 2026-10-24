import Link from 'next/link';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-[#f9f9f8] text-[#333333] flex min-h-screen flex-col md:flex-row font-sans">
      <aside className="w-full md:w-[260px] bg-white border-b md:border-b-0 md:border-r border-[#e5e5e5] p-4 md:p-[30px_20px] flex flex-col md:fixed md:h-screen z-10">
        <div className="text-[16px] md:text-[20px] font-bold tracking-[2px] mb-3 md:mb-[50px] text-center md:text-left">
          LIGHTNING <span className="text-[#888888] text-[11px] md:text-[12px] block md:inline mt-1 md:mt-[5px] font-medium">SELLER CENTER</span>
        </div>
        <ul className="flex flex-row md:flex-col justify-between md:justify-start gap-[5px] md:gap-[10px] overflow-x-auto pb-1 md:pb-0 list-none">
          <li>
            <Link href="/admin" className="flex items-center p-[8px_10px] md:p-[12px_15px] text-[12px] md:text-[14px] font-semibold bg-[#FEF9C3] rounded-lg text-[#333] whitespace-nowrap">
              📍 上架新商品
            </Link>
          </li>
          <li>
            <Link href="/admin/products" className="flex items-center p-[8px_10px] md:p-[12px_15px] text-[12px] md:text-[14px] font-medium text-[#888888] hover:bg-[#FEF9C3] hover:text-[#333] rounded-lg transition whitespace-nowrap">
              📦 現時上架貨品
            </Link>
          </li>
          <li>
            <Link href="/admin/discontinued" className="flex items-center p-[8px_10px] md:p-[12px_15px] text-[12px] md:text-[14px] font-medium text-[#888888] hover:bg-[#FEF9C3] hover:text-[#333] rounded-lg transition whitespace-nowrap">
              📥 已下架貨品
            </Link>
          </li>
          <li>
            <Link href="/admin/orders" className="flex items-center p-[8px_10px] md:p-[12px_15px] text-[12px] md:text-[14px] font-medium text-[#888888] hover:bg-[#FEF9C3] hover:text-[#333] rounded-lg transition whitespace-nowrap">
              📝 訂單管理
            </Link>
          </li>
        </ul>
      </aside>
      <main className="md:ml-[260px] flex-grow p-5 md:p-[40px_5%] max-w-[1200px] w-full md:w-[calc(100%-260px)]">
        {children}
      </main>
    </div>
  );
}