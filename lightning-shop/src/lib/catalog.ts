export const BAG_TYPES = ['托特包', '腋下包', '通勤包', '水桶包', '肩背包', '相機包'] as const;

export const SORT_OPTIONS = [
  { id: 'newest', label: '最新上架' },
  { id: 'price-desc', label: '價格高至低' },
  { id: 'price-asc', label: '價格低至高' },
  { id: 'hot', label: '熱銷程度' },
] as const;

export type CatalogSort = (typeof SORT_OPTIONS)[number]['id'];

export interface CatalogColor {
  name?: string;
  hex?: string;
}

export interface CatalogItem {
  id: string;
  name?: string;
  price?: number;
  category?: string;
  tag?: string;
  bagType?: string;
  colorName?: string;
  colorHex?: string;
  colorGroup?: string;
  colors?: CatalogColor[];
  createdAt?: { toMillis?: () => number; seconds?: number };
}

export interface CatalogQuery {
  keyword: string;
  category: string;
  hotOnly: boolean;
  sort: CatalogSort;
  priceMin: string;
  priceMax: string;
  bagType: string;
  color: string;
}

export interface ColorDot {
  name: string;
  hex: string;
  productId?: string;
}

const BAG_HINTS: { id: (typeof BAG_TYPES)[number]; pattern: RegExp }[] = [
  { id: '托特包', pattern: /托特|tote/i },
  { id: '腋下包', pattern: /腋下|underarm|hobo/i },
  { id: '通勤包', pattern: /通勤|boston|公事/i },
  { id: '水桶包', pattern: /水桶|bucket/i },
  { id: '肩背包', pattern: /肩背|shoulder/i },
  { id: '相機包', pattern: /相機|camera/i },
];

export function normalizeHex(value: string) {
  const trimmed = value.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(trimmed)) return trimmed.toUpperCase();
  if (/^[0-9a-fA-F]{6}$/.test(trimmed)) return `#${trimmed.toUpperCase()}`;
  return '';
}

export function variantFields(product: CatalogItem) {
  const colors = (product.colors || [])
    .map((color) => ({ name: color.name?.trim() || '', hex: normalizeHex(color.hex || '') }))
    .filter((color) => color.name && color.hex);
  return {
    bagType: product.bagType?.trim() || '',
    colorGroup: product.colorGroup?.trim() || '',
    colorName: product.colorName?.trim() || '',
    colorHex: normalizeHex(product.colorHex || ''),
    colors,
  };
}

export function resolvedBagType(product: CatalogItem) {
  const explicit = product.bagType?.trim();
  if (explicit) return explicit;
  if (product.category?.trim() !== 'BAGS') return '';
  const name = product.name || '';
  return BAG_HINTS.find((item) => item.pattern.test(name))?.id || '';
}

function createdAtMs(product: CatalogItem) {
  const createdAt = product.createdAt;
  if (!createdAt) return 0;
  if (typeof createdAt.toMillis === 'function') return createdAt.toMillis();
  return typeof createdAt.seconds === 'number' ? createdAt.seconds * 1000 : 0;
}

function pushDot(dots: ColorDot[], name: string, hex: string, productId?: string) {
  if (!name || !hex) return;
  if (dots.some((dot) => dot.name === name)) return;
  dots.push({ name, hex, productId });
}

export function productSwatches(product: CatalogItem, products: CatalogItem[]) {
  const dots: ColorDot[] = [];
  pushDot(dots, product.colorName?.trim() || '', normalizeHex(product.colorHex || ''), product.id);
  for (const color of product.colors || []) {
    pushDot(dots, color.name?.trim() || '', normalizeHex(color.hex || ''));
  }
  const group = product.colorGroup?.trim();
  if (group) {
    for (const sibling of products) {
      if (sibling.id === product.id || sibling.colorGroup?.trim() !== group) continue;
      pushDot(dots, sibling.colorName?.trim() || '', normalizeHex(sibling.colorHex || ''), sibling.id);
    }
  }
  return dots;
}

export function ownColorNames(product: CatalogItem) {
  const names = new Set<string>();
  const own = product.colorName?.trim();
  if (own) names.add(own);
  for (const color of product.colors || []) {
    const name = color.name?.trim();
    if (name) names.add(name);
  }
  return names;
}

export function colorChoices(products: CatalogItem[]) {
  const names = new Set<string>();
  for (const product of products) {
    for (const name of ownColorNames(product)) names.add(name);
  }
  return [...names].sort((a, b) => a.localeCompare(b, 'zh-Hant'));
}

function priceBound(value: string) {
  if (value.trim() === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export function applyCatalogFilters<T extends CatalogItem>(list: T[], query: CatalogQuery) {
  const lower = query.keyword.trim().toLowerCase();
  const min = priceBound(query.priceMin);
  const max = priceBound(query.priceMax);
  const filtered = list.filter((product) => {
    if (query.category !== 'all' && product.category?.trim() !== query.category) return false;
    if (query.hotOnly && product.tag?.trim().toUpperCase() !== 'HOT') return false;
    if (query.bagType !== 'all' && resolvedBagType(product) !== query.bagType) return false;
    if (query.color !== 'all' && !ownColorNames(product).has(query.color)) return false;
    const price = Number(product.price);
    if (min !== null && price < min) return false;
    if (max !== null && price > max) return false;
    if (!lower) return true;
    return [product.name, product.category, product.tag, product.colorName, resolvedBagType(product)]
      .some((value) => value?.toLowerCase().includes(lower));
  });
  const result = [...filtered];
  if (query.sort === 'price-desc') {
    result.sort((a, b) => Number(b.price) - Number(a.price) || createdAtMs(b) - createdAtMs(a));
  } else if (query.sort === 'price-asc') {
    result.sort((a, b) => Number(a.price) - Number(b.price) || createdAtMs(b) - createdAtMs(a));
  } else if (query.sort === 'hot') {
    result.sort((a, b) => {
      const hotA = a.tag?.trim().toUpperCase() === 'HOT' ? 0 : 1;
      const hotB = b.tag?.trim().toUpperCase() === 'HOT' ? 0 : 1;
      return hotA - hotB || createdAtMs(b) - createdAtMs(a);
    });
  } else {
    result.sort((a, b) => createdAtMs(b) - createdAtMs(a));
  }
  return result;
}

export function isCatalogSort(value: string): value is CatalogSort {
  return SORT_OPTIONS.some((item) => item.id === value);
}
