'use client';

import { useState, useRef, useEffect } from 'react';

interface MegaMenuProps {
  selectedCategory: string;
  onSelect: (category: string, keyword: string) => void;
}

interface SubColumn {
  heading: string;
  items: { label: string; keyword: string }[];
}

interface FeaturedCard {
  tag: string;
  name: string;
  price: string;
  bg: string;
  icon: string;
  keyword: string;
}

interface CategoryItem {
  id: string; // 對應 Firebase products 的 category 欄位 ('all' | 'BAGS' | 'ACCESSORY' | 'DAILY WEAR')
  title: string;
  emoji: string;
  tagline: string;
  columns: SubColumn[];
  featuredCards: FeaturedCard[];
}

const MENU_DATA: Record<string, CategoryItem> = {
  all: {
    id: 'all',
    title: '全部選品',
    emoji: '✨',
    tagline: '精選本週熱賣、新品上市、聯名系列與限時優惠',
    columns: [
      {
        heading: '本週熱賣精選',
        items: [
          { label: '人氣熱銷 TOP 10', keyword: '熱銷' },
          { label: '店長私心推薦', keyword: '推薦' },
          { label: '回購率最高單品', keyword: '經典' },
        ],
      },
      {
        heading: '新品上市',
        items: [
          { label: '本週新上架單品', keyword: '新品' },
          { label: '早秋法式新品系列', keyword: '法式' },
          { label: '設計師限量預購', keyword: '限量' },
        ],
      },
      {
        heading: '人氣聯名與優惠',
        items: [
          { label: '人氣聯名系列', keyword: '聯名' },
          { label: '限時優惠專區', keyword: '優惠' },
          { label: '查看全站所有商品', keyword: '' },
        ],
      },
    ],
    featuredCards: [
      {
        tag: 'NEW ARRIVAL',
        name: '秋冬法式焦糖色系全套選品',
        price: '滿 $600 享 88 折',
        bg: 'from-amber-100 to-orange-100',
        icon: '✨',
        keyword: '法式',
      },
      {
        tag: 'BEST SELLER',
        name: '本月熱銷 TOP 10 經典單品榜',
        price: '立即瀏覽全站選品 →',
        bg: 'from-rose-100 to-amber-50',
        icon: '🏆',
        keyword: '',
      },
    ],
  },
  BAGS: {
    id: 'BAGS',
    title: '包包',
    emoji: '👜',
    tagline: '日常包款、真皮編織工藝與多功能通勤收納包袋',
    columns: [
      {
        heading: '日常包款',
        items: [
          { label: '托特包', keyword: '托特' },
          { label: '斜背包', keyword: '斜背' },
          { label: '腋下包', keyword: '腋下' },
          { label: '水桶包', keyword: '水桶' },
        ],
      },
      {
        heading: '材質與風格',
        items: [
          { label: '真皮系列', keyword: '真皮' },
          { label: '帆布輕量', keyword: '帆布' },
          { label: '編織設計', keyword: '編織' },
        ],
      },
      {
        heading: '功能包袋',
        items: [
          { label: '通勤電腦包', keyword: '通勤' },
          { label: '迷你廢包', keyword: '迷你' },
          { label: '旅行收納', keyword: '收納' },
        ],
      },
    ],
    featuredCards: [
      {
        tag: 'HOT PICK',
        name: '頭層牛皮極簡半月腋下包',
        price: 'HK$ 468',
        bg: 'from-stone-200 to-amber-100',
        icon: '👜',
        keyword: '腋下',
      },
      {
        tag: 'COMMUTE',
        name: '大容量防潑水通勤電腦包',
        price: 'HK$ 389',
        bg: 'from-orange-100 to-stone-100',
        icon: '💼',
        keyword: '通勤',
      },
    ],
  },
  ACCESSORY: {
    id: 'ACCESSORY',
    title: '首飾配件',
    emoji: '💍',
    tagline: '純銀耳飾、鎖骨項鍊與質感生活穿搭配件',
    columns: [
      {
        heading: '耳飾系列',
        items: [
          { label: '純銀耳環', keyword: '耳環' },
          { label: '珍珠耳扣', keyword: '珍珠' },
          { label: '垂墜耳飾', keyword: '耳飾' },
        ],
      },
      {
        heading: '頸間與手部',
        items: [
          { label: '鎖骨項鍊', keyword: '項鍊' },
          { label: '疊戴手鍊', keyword: '手鍊' },
          { label: '設計師戒指', keyword: '戒指' },
        ],
      },
      {
        heading: '生活配件',
        items: [
          { label: '絲巾髮飾', keyword: '髮飾' },
          { label: '復古墨鏡', keyword: '墨鏡' },
          { label: '皮革皮帶', keyword: '皮帶' },
        ],
      },
    ],
    featuredCards: [
      {
        tag: '925 SILVER',
        name: '巴洛克天然淡水珍珠耳扣',
        price: 'HK$ 248',
        bg: 'from-purple-100 to-pink-50',
        icon: '💍',
        keyword: '珍珠',
      },
      {
        tag: 'ACCESSORIES',
        name: '法式真絲印花髮飾與墨鏡組',
        price: 'HK$ 198',
        bg: 'from-amber-50 to-yellow-100',
        icon: '🕶️',
        keyword: '髮飾',
      },
    ],
  },
  'DAILY WEAR': {
    id: 'DAILY WEAR',
    title: '日常穿搭',
    emoji: '👕',
    tagline: '法式襯衫、垂墜長裙與高質感四季外套',
    columns: [
      {
        heading: '上身單品',
        items: [
          { label: '法式襯衫', keyword: '襯衫' },
          { label: '針織開衫', keyword: '針織' },
          { label: '純棉T恤', keyword: 'T恤' },
        ],
      },
      {
        heading: '下身與連身',
        items: [
          { label: '高腰西裝褲', keyword: '褲' },
          { label: '垂墜長裙', keyword: '長裙' },
          { label: '氣質連身裙', keyword: '連身裙' },
        ],
      },
      {
        heading: '季節外套',
        items: [
          { label: '風衣外套', keyword: '風衣' },
          { label: '針織背心', keyword: '背心' },
          { label: '輕薄西裝', keyword: '西裝' },
        ],
      },
    ],
    featuredCards: [
      {
        tag: 'SOFT KNIT',
        name: '法式慵懶軟糯針織開衫',
        price: 'HK$ 329',
        bg: 'from-emerald-100 to-teal-50',
        icon: '👕',
        keyword: '針織',
      },
      {
        tag: 'BEST FIT',
        name: '高腰顯瘦垂墜感西裝褲',
        price: 'HK$ 299',
        bg: 'from-slate-200 to-stone-100',
        icon: '👖',
        keyword: '西裝褲',
      },
    ],
  },
};

const CATEGORY_ORDER = ['all', 'BAGS', 'ACCESSORY', 'DAILY WEAR'] as const;

export default function MegaMenu({ selectedCategory, onSelect }: MegaMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeCat, setActiveCat] = useState<string>('all');
  const [fadeTick, setFadeTick] = useState(0);

  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const switchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollLockRef = useRef<{ y: number } | null>(null);

  const openedByHover = useRef(false);

  const isMobileMenu = () => window.matchMedia('(max-width: 767px)').matches;

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
      if (switchTimerRef.current) clearTimeout(switchTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');

    const lockPage = () => {
      if (scrollLockRef.current) return;
      const y = window.scrollY;
      scrollLockRef.current = { y };
      document.body.style.position = 'fixed';
      document.body.style.top = `-${y}px`;
      document.body.style.left = '0';
      document.body.style.right = '0';
      document.body.style.width = '100%';
      document.body.style.overflow = 'hidden';
    };

    const unlockPage = () => {
      const locked = scrollLockRef.current;
      if (!locked) return;
      scrollLockRef.current = null;
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.left = '';
      document.body.style.right = '';
      document.body.style.width = '';
      document.body.style.overflow = '';
      window.scrollTo(0, locked.y);
    };

    const applyLock = () => {
      if (isOpen && mq.matches) lockPage();
      else unlockPage();
    };

    applyLock();
    mq.addEventListener('change', applyLock);
    return () => {
      mq.removeEventListener('change', applyLock);
      unlockPage();
    };
  }, [isOpen]);

  const replayFade = (catKey: string) => {
    setActiveCat(catKey);
    setFadeTick((tick) => tick + 1);
  };

  const closeMenu = () => {
    setIsOpen(false);
  };

  const openMenu = () => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    if (switchTimerRef.current) clearTimeout(switchTimerRef.current);
    setIsOpen(true);
    replayFade('all');
  };

  const scheduleCloseMenu = () => {
    if (isMobileMenu()) return;
    closeTimerRef.current = setTimeout(() => {
      closeMenu();
    }, 180);
  };

  // 左側分類 120ms 防誤觸延遲偵測 (Hover Intent)
  const handleCategoryMouseEnter = (catKey: string) => {
    if (isMobileMenu()) return;
    if (switchTimerRef.current) clearTimeout(switchTimerRef.current);
    switchTimerRef.current = setTimeout(() => {
      replayFade(catKey);
    }, 120);
  };

  const handleCategoryMouseLeave = () => {
    if (switchTimerRef.current) clearTimeout(switchTimerRef.current);
  };

  const handleSelectAndClose = (catKey: string, keyword = '') => {
    onSelect(catKey, keyword);
    closeMenu();
  };

  const currentData = MENU_DATA[activeCat] || MENU_DATA.all;

  return (
    <div
      onMouseLeave={scheduleCloseMenu}
      className={`fixed top-18.75 left-0 w-full bg-[#FAF6F0]/95 backdrop-blur-md border-b border-[#EFE7DF] z-900 shadow-[0_4px_12px_rgba(56,46,43,0.03)] ${
        isOpen ? 'max-md:bottom-0 max-md:flex max-md:flex-col' : ''
      }`}
    >
      {/* 膠囊導覽列 */}
      <div className="max-w-7xl mx-auto px-[6%] py-2.5 flex items-center justify-start md:justify-center gap-2.5 overflow-x-auto no-scrollbar">
        {/* 觸發下滑選單的主按鈕 */}
        <button
          type="button"
          onMouseEnter={() => {
            if (isMobileMenu()) return;
            openedByHover.current = true;
            openMenu();
          }}
          onClick={() => {
            onSelect('all', '');
            if (openedByHover.current) {
              openedByHover.current = false;
              openMenu();
              return;
            }
            if (isOpen) closeMenu();
            else openMenu();
          }}
          className={`flex items-center gap-2 px-5 py-2 rounded-full font-medium text-xs sm:text-sm shadow-xs transition shrink-0 cursor-pointer ${
            isOpen || selectedCategory === 'all'
              ? 'bg-[#A8573E] text-white'
              : 'bg-[#F2ECE4] hover:bg-[#E6DCD2] text-[#5C4D42]'
          }`}
        >
          <span>✨</span>
          <span>全部選品分類</span>
          <svg
            className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* 快捷膠囊分類 (滑鼠移入同樣可直接開啟並切換至該分類) */}
        <button
          type="button"
          onMouseEnter={() => {
            if (!isMobileMenu()) openMenu();
          }}
          onClick={() => handleSelectAndClose('BAGS', '')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs sm:text-sm font-medium transition shrink-0 cursor-pointer ${
            selectedCategory === 'BAGS' && !isOpen
              ? 'bg-[#A8573E] text-white shadow-xs'
              : 'bg-[#F2ECE4] hover:bg-[#E6DCD2] text-[#5C4D42]'
          }`}
        >
          <span>👜</span> 包包
        </button>

        <button
          type="button"
          onMouseEnter={() => {
            if (!isMobileMenu()) openMenu();
          }}
          onClick={() => handleSelectAndClose('ACCESSORY', '')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs sm:text-sm font-medium transition shrink-0 cursor-pointer ${
            selectedCategory === 'ACCESSORY' && !isOpen
              ? 'bg-[#A8573E] text-white shadow-xs'
              : 'bg-[#F2ECE4] hover:bg-[#E6DCD2] text-[#5C4D42]'
          }`}
        >
          <span>💍</span> 首飾配件
        </button>

        <button
          type="button"
          onMouseEnter={() => {
            if (!isMobileMenu()) openMenu();
          }}
          onClick={() => handleSelectAndClose('DAILY WEAR', '')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs sm:text-sm font-medium transition shrink-0 cursor-pointer ${
            selectedCategory === 'DAILY WEAR' && !isOpen
              ? 'bg-[#A8573E] text-white shadow-xs'
              : 'bg-[#F2ECE4] hover:bg-[#E6DCD2] text-[#5C4D42]'
          }`}
        >
          <span>👕</span> 日常穿搭
        </button>
      </div>

      {/* 下滑雙欄選單面板 (含 120ms 防誤觸切換 + 精選圖文卡片) */}
      {isOpen && (
        <div
          onMouseEnter={() => {
            if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
          }}
          className="mega-panel-in bg-white border-t border-[#EAE0D5] z-50 max-md:flex max-md:min-h-0 max-md:flex-1 max-md:flex-col max-md:overflow-hidden md:absolute md:left-0 md:right-0 md:top-full md:shadow-2xl"
        >
          <div className="max-w-7xl mx-auto flex min-h-0 flex-1 flex-col overflow-hidden md:min-h-95 md:flex-row md:overflow-visible">
            {/* 左側：4大分類 (含 120ms Hover Intent 偵測) */}
            <div className="w-full shrink-0 overflow-hidden border-[#EFE7DF] bg-[#FAF6F0] max-md:border-b max-md:px-2 max-md:py-2 md:w-64 md:overflow-visible md:border-b-0 md:border-r md:p-3">
              <div className="max-md:flex max-md:items-center max-md:gap-2 max-md:overflow-x-auto md:space-y-1.5">
              <div className="hidden px-3 py-1.5 text-[11px] font-medium text-[#9C897B] tracking-wider uppercase md:block">
                瀏覽商品種類
              </div>
              {CATEGORY_ORDER.map((catKey) => {
                const item = MENU_DATA[catKey];
                const isActive = activeCat === catKey;
                return (
                  <button
                    key={catKey}
                    type="button"
                    onMouseEnter={() => handleCategoryMouseEnter(catKey)}
                    onMouseLeave={handleCategoryMouseLeave}
                    onClick={() => {
                      if (switchTimerRef.current) clearTimeout(switchTimerRef.current);
                      replayFade(catKey);
                      onSelect(catKey, '');
                    }}
                    className={`flex items-center justify-between rounded-xl text-sm transition cursor-pointer max-md:w-auto max-md:shrink-0 max-md:px-3 max-md:py-2 md:w-full md:px-4 md:py-3 ${
                      isActive
                        ? 'font-bold bg-[#A8573E] text-white shadow-xs'
                        : 'font-medium text-[#5C4D42] hover:bg-[#F2ECE4]'
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <span>{item.emoji}</span> {item.title}
                    </span>
                    <span className={`hidden md:inline ${isActive ? '' : 'opacity-50'}`}>
                      {isActive ? '→' : '›'}
                    </span>
                  </button>
                );
              })}
              </div>
            </div>

            {/* 右側：子分類文字連結 + 2張精選圖文推薦卡片 */}
            <div key={fadeTick} className="mega-fade-in min-h-0 flex-1 overflow-y-auto overscroll-contain bg-white p-6 sm:p-8 md:overflow-visible">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-4 mb-5 border-b border-[#EFE7DF]">
                <div>
                  <h3 className="text-lg font-bold text-[#3D312A] flex items-center gap-2">
                    <span>{currentData.emoji}</span> {currentData.title}
                  </h3>
                  <p className="text-xs text-[#8C6D5E] mt-0.5">{currentData.tagline}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleSelectAndClose(currentData.id, '')}
                  className="text-sm font-semibold text-[#A8573E] hover:underline bg-transparent border-none cursor-pointer"
                >
                  查看所有{currentData.title} →
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* 左側 7 欄：子分類清單 */}
                <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-5 text-sm">
                  {currentData.columns.map((col, idx) => (
                    <div key={idx}>
                      <h4 className="font-bold text-[#3D312A] mb-2.5">{col.heading}</h4>
                      <ul className="space-y-2 text-[#6E5D52]">
                        {col.items.map((sub, sIdx) => (
                          <li key={sIdx}>
                            <button
                              type="button"
                              onClick={() => handleSelectAndClose(currentData.id, sub.keyword)}
                              className="hover:text-[#A8573E] transition-colors text-left bg-transparent border-none cursor-pointer p-0"
                            >
                              {sub.label}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>

                {/* 右側 5 欄：2 張精選圖文推薦卡片 */}
                <div className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3">
                  {currentData.featuredCards.map((card, cIdx) => (
                    <button
                      key={cIdx}
                      type="button"
                      onClick={() => handleSelectAndClose(currentData.id, card.keyword)}
                      className={`group flex items-center gap-3.5 p-3 rounded-2xl bg-linear-to-r ${card.bg} border border-black/5 hover:shadow-md transition text-left cursor-pointer`}
                    >
                      <div className="w-14 h-14 rounded-xl bg-white/90 flex items-center justify-center text-2xl shrink-0 group-hover:scale-110 transition-transform">
                        {card.icon}
                      </div>
                      <div className="min-w-0">
                        <span className="inline-block text-[10px] font-bold tracking-wider uppercase text-[#A8573E]">
                          {card.tag}
                        </span>
                        <div className="text-sm font-bold text-[#3D312A] truncate">{card.name}</div>
                        <div className="text-xs font-medium text-[#6E5D52] mt-0.5">{card.price}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}