export const LAST_UNITS_LIMIT = 5;

export function hotStockLabel(tag?: string | null, stock?: number | null) {
  if (!tag || tag.trim().toUpperCase() !== 'HOT') return null;
  if (typeof stock === 'number' && stock <= 0) return '已售完';
  if (typeof stock === 'number' && stock <= LAST_UNITS_LIMIT) return `僅剩最後 ${stock} 件`;
  return '熱賣中';
}
