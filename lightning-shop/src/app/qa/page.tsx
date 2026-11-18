'use client';

import { useState } from 'react';
import Link from 'next/link';
import StudioPage from '@/components/StudioPage';
import { FREE_SHIPPING_THRESHOLD, shippingRuleText } from '@/lib/shipping';

const QUESTIONS = [
  {
    id: 'shipping',
    title: '運費怎麼計算？',
    body: `${shippingRuleText()} 配送方式只在結帳確認那一步選擇，購物車不會先收運費。`,
  },
  {
    id: 'payment',
    title: '可以怎麼付款？',
    body: '結帳可以選擇 FPS 轉數快、PayMe、信用卡或 Apple Pay。轉數快與 PayMe 會先建立訂單，再依畫面上的金額付款，並在備註填上訂單編號。店家確認入帳後，訂單會標成已確認付款。',
  },
  {
    id: 'guest',
    title: '一定要註冊才能買嗎？',
    body: '不用。可以訪客結帳，也可以用 Google 或 Apple 登入。訪客訂單請保留下單時留下的信箱，確認信會寄到那裡。',
  },
  {
    id: 'tracking',
    title: '怎麼查訂單和物流？',
    body: '登入後到會員中心可以看到自己的訂單。出貨時店家會填上順豐運單編號，頁面上可以複製，也會再寄一封出貨通知。',
  },
  {
    id: 'offers',
    title: '優惠券、會員折扣和免運可以一起用嗎？',
    body: `可以疊加，但免運只看折扣前的商品小計，門檻是 HKD ${FREE_SHIPPING_THRESHOLD}。會員折扣、優惠券與購物金都不計入這道門檻。指定等級的券只有對應會員能用，買 N 送 M 會把同一組裡最便宜的幾件免掉。`,
  },
  {
    id: 'bundle',
    title: '組合優惠是什麼？',
    body: '首頁的組合優惠是店家配好的兩件以上單品，用一個組合價放進購物車，購物車裡會顯示成一行。缺貨的組合不能加入。',
  },
  {
    id: 'returns',
    title: '想改地址、查尺寸或詢問訂單，要寫給誰？',
    body: '網店沒有自動退貨流程。請到聯絡我們留下訂單編號和想處理的事，賣家會依你留下的信箱回覆。尺寸可以先看商品頁的尺寸與材質指南。',
  },
];

export default function QaPage() {
  const [openId, setOpenId] = useState('shipping');

  return (
    <StudioPage
      kicker="Q&A · 常見問題"
      title="下單之前，先把規則看清楚"
      lede="運費、付款、物流與優惠都照店裡現在的做法寫。沒有寫到的，直接留言給我們。"
    >
      <div className="flex flex-col gap-3">
        {QUESTIONS.map((item) => {
          const open = openId === item.id;
          return (
            <section key={item.id} id={item.id} className="scroll-mt-36 rounded-2xl border border-[#EBE5DF] bg-white">
              <h2>
                <button
                  type="button"
                  aria-expanded={open}
                  onClick={() => setOpenId(open ? '' : item.id)}
                  className="flex w-full cursor-pointer items-center justify-between gap-4 px-5 py-4 text-left text-[15px] font-semibold text-[#382E2B] sm:px-6"
                >
                  {item.title}
                  <span className="text-[18px] text-[#B35B48]" aria-hidden>{open ? '–' : '+'}</span>
                </button>
              </h2>
              {open && <p className="px-5 pb-5 text-[14px] leading-[1.9] text-[#5C4D42] sm:px-6">{item.body}</p>}
            </section>
          );
        })}
      </div>
      <p className="mt-8 text-center text-[13px] text-[#7A6E65]">
        還有別的問題？
        <Link href="/contact" className="ml-2 font-semibold text-[#B35B48] no-underline hover:underline">寫給雲棧</Link>
      </p>
    </StudioPage>
  );
}
