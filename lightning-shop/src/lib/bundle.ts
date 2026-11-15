export interface BundleItem {
  productId: string;
  name: string;
  unitPrice: number;
  quantity: number;
}

export interface ShopBundle {
  id: string;
  name: string;
  price: number;
  active: boolean;
  items: BundleItem[];
}

export function bundleOriginalTotal(items: BundleItem[]) {
  return items.reduce((sum, item) => sum + Number(item.unitPrice) * Number(item.quantity), 0);
}

export function bundleCartName(bundle: Pick<ShopBundle, 'name' | 'items'>) {
  const contents = bundle.items.map((item) => `${item.name}×${item.quantity}`).join('、');
  return `${bundle.name}（${contents}）`;
}
