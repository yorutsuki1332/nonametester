export type LookPanel = 'cream' | 'ink' | 'sand';

export interface Look {
  id: string;
  order: number;
  season: string;
  title: string;
  body: string;
  colors: string;
  panel: LookPanel;
  href: string;
}

export const LOOK_PANELS: Record<LookPanel, { panel: string; palette: string; label: string }> = {
  cream: {
    panel: 'bg-[#F4F0EA] text-[#382E2B] border-b border-[#EBE5DF]',
    palette: 'text-[#B35B48]',
    label: '米白',
  },
  ink: {
    panel: 'bg-[#382E2B] text-[#FAF7F2]',
    palette: 'text-[#D8A494]',
    label: '墨色',
  },
  sand: {
    panel: 'bg-[#E6DCD2] text-[#382E2B] border-b border-[#EBE5DF]',
    palette: 'text-[#B35B48]',
    label: '暖沙',
  },
};

export const LOOKS: Look[] = [
  {
    id: '01',
    order: 1,
    season: 'AUTUMN / WINTER 2026',
    panel: 'cream',
    colors: 'PALETTE · 燕麥米 · 暖沙色 · 霧面金',
    title: '晨間咖啡與亞麻廓形',
    body: '以寬鬆垂墜的燕麥色長版亞麻襯衫搭配結構感軟皮肩背包，在微涼早晨維持輕鬆而不失俐落的層次感。',
    href: '/categories?category=DAILY%20WEAR',
  },
  {
    id: '02',
    order: 2,
    season: 'AUTUMN / WINTER 2026',
    panel: 'ink',
    colors: 'PALETTE · 焦糖棕 · 深炭墨 · 珍珠白',
    title: '城市漫步者的極簡行囊',
    body: '選用大容量赤陶棕托特包收納隨身筆記本與保溫瓶，搭配細緻金屬耳骨夾，為通勤造型注入低調亮點。',
    href: '/categories?category=BAGS',
  },
  {
    id: '03',
    order: 3,
    season: 'AUTUMN / WINTER 2026',
    panel: 'sand',
    colors: 'PALETTE · 奶油白 · 栗子褐 · 黃銅金',
    title: '午後畫廊的靜謐針織',
    body: '柔軟親膚的細針織上衣搭配手工黃銅與天然淡水珍珠飾品，展現溫潤光澤，適合週末看展與午後閱讀時光。',
    href: '/categories?category=ACCESSORY',
  },
];

const PANEL_KEYS: LookPanel[] = ['cream', 'ink', 'sand'];

export function normalizeLook(id: string, data: Record<string, unknown>): Look | null {
  const title = typeof data.title === 'string' ? data.title.trim() : '';
  if (!id || !title) return null;

  const panel = PANEL_KEYS.includes(data.panel as LookPanel) ? (data.panel as LookPanel) : 'cream';
  const order = typeof data.order === 'number' && Number.isFinite(data.order) ? data.order : Number(id) || 0;

  return {
    id,
    order,
    season: typeof data.season === 'string' && data.season.trim() ? data.season.trim() : 'AUTUMN / WINTER 2026',
    title,
    body: typeof data.body === 'string' ? data.body.trim() : '',
    colors: typeof data.colors === 'string' ? data.colors.trim() : '',
    panel,
    href: typeof data.href === 'string' && data.href.trim() ? data.href.trim() : '/categories',
  };
}

export function sortLooks(looks: Look[]) {
  return [...looks].sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
}
