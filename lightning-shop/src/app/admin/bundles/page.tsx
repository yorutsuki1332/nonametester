'use client';

import { useEffect, useMemo, useState } from 'react';
import { db } from '@/lib/firebase';
import firebase from 'firebase/compat/app';
import { errorMessage, withoutDocumentId } from '@/lib/errors';
import { bundleOriginalTotal, type BundleItem, type ShopBundle } from '@/lib/bundle';

interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  stock?: number | null;
}

interface BundleRecord extends ShopBundle {
  createdAt?: firebase.firestore.Timestamp;
}

const CATEGORY_OPTIONS = [
  { id: 'all', label: '全部分類' },
  { id: 'DAILY WEAR', label: '日常服飾' },
  { id: 'BAGS', label: '精選包袋' },
  { id: 'ACCESSORY', label: '質感飾品' },
] as const;

function money(value: number) {
  return `HKD ${Number(value).toFixed(1)}`;
}

export default function AdminBundlesPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [bundles, setBundles] = useState<BundleRecord[]>([]);
  const [keyword, setKeyword] = useState('');
  const [category, setCategory] = useState('all');
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [picked, setPicked] = useState<Record<string, string>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [modal, setModal] = useState<{ open: boolean; title: string; message: string; confirm?: () => void }>({
    open: false,
    title: '',
    message: '',
  });

  useEffect(() => {
    const unsubProducts = db.collection('products').orderBy('createdAt', 'desc').onSnapshot((snapshot) => {
      const list: Product[] = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...withoutDocumentId(doc.data()) } as Product);
      });
      setProducts(list);
    });
    const unsubBundles = db.collection('bundles').onSnapshot((snapshot) => {
      const list: BundleRecord[] = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...withoutDocumentId(doc.data()) } as BundleRecord);
      });
      list.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
      setBundles(list);
    });
    return () => {
      unsubProducts();
      unsubBundles();
    };
  }, []);

  const showAlert = (message: string, title = '提示訊息') => {
    setModal({ open: true, title, message });
  };

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(''), 2800);
  };

  const categoryOptions = useMemo(() => {
    const known = new Set<string>(CATEGORY_OPTIONS.map((item) => item.id));
    const extra = [...new Set(products.map((product) => product.category?.trim()).filter(Boolean))]
      .filter((id) => !known.has(id))
      .sort();
    return [...CATEGORY_OPTIONS, ...extra.map((id) => ({ id, label: id }))];
  }, [products]);

  const visibleProducts = useMemo(() => {
    const lower = keyword.trim().toLowerCase();
    return products.filter((product) => {
      if (category !== 'all' && product.category?.trim() !== category) return false;
      if (!lower) return true;
      return `${product.name} ${product.category} ${product.id}`.toLowerCase().includes(lower);
    });
  }, [products, keyword, category]);

  const selectedItems = useMemo(() => {
    const items: BundleItem[] = [];
    Object.entries(picked).forEach(([productId, qtyText]) => {
      const product = products.find((item) => item.id === productId);
      const quantity = Math.floor(Number(qtyText));
      if (!product || quantity < 1) return;
      items.push({
        productId,
        name: product.name,
        unitPrice: Number(product.price),
        quantity,
      });
    });
    return items;
  }, [picked, products]);

  const originalTotal = bundleOriginalTotal(selectedItems);
  const bundlePrice = Number(price);
  const savingAmount = Number.isFinite(bundlePrice) ? originalTotal - bundlePrice : 0;

  const resetForm = () => {
    setName('');
    setPrice('');
    setPicked({});
    setEditingId(null);
  };

  const toggleProduct = (productId: string) => {
    setPicked((current) => {
      const next = { ...current };
      if (next[productId]) delete next[productId];
      else next[productId] = '1';
      return next;
    });
  };

  const loadBundle = (bundle: BundleRecord) => {
    const next: Record<string, string> = {};
    bundle.items.forEach((item) => {
      next[item.productId] = String(item.quantity);
    });
    setEditingId(bundle.id);
    setName(bundle.name);
    setPrice(String(bundle.price));
    setPicked(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const saveBundle = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      showAlert('請填寫組合名稱。');
      return;
    }
    const missingIds = Object.keys(picked).filter((id) => !products.some((product) => product.id === id));
    if (missingIds.length > 0) {
      showAlert('有已選商品不在上架清單，請先移除再儲存。');
      return;
    }
    if (selectedItems.length < 2) {
      showAlert('請至少選擇兩件不同商品。');
      return;
    }
    if (!Number.isFinite(bundlePrice) || bundlePrice <= 0) {
      showAlert('組合價格必須大於 0。');
      return;
    }

    setSaving(true);
    try {
      const id = editingId || `B${Date.now()}`;
      const existing = bundles.find((bundle) => bundle.id === id);
      await db.collection('bundles').doc(id).set({
        name: trimmedName,
        price: Math.round(bundlePrice * 10) / 10,
        active: existing ? existing.active : true,
        items: selectedItems,
        createdAt: existing?.createdAt || firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
      showToast(editingId ? `已更新組合「${trimmedName}」` : `已建立組合「${trimmedName}」`);
      resetForm();
    } catch (error: unknown) {
      showAlert('儲存失敗：' + errorMessage(error), '錯誤');
    } finally {
      setSaving(false);
    }
  };

  const setActive = async (bundle: BundleRecord, active: boolean) => {
    try {
      await db.collection('bundles').doc(bundle.id).update({
        active,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
      showToast(active ? `「${bundle.name}」已上架` : `「${bundle.name}」已下架`);
    } catch (error: unknown) {
      showAlert('更新失敗：' + errorMessage(error), '錯誤');
    }
  };

  const removeBundle = (bundle: BundleRecord) => {
    setModal({
      open: true,
      title: '刪除組合',
      message: `確定刪除「${bundle.name}」？已放入購物車的組合不會自動移除。`,
      confirm: async () => {
        try {
          await db.collection('bundles').doc(bundle.id).delete();
          if (editingId === bundle.id) resetForm();
          showToast(`已刪除「${bundle.name}」`);
        } catch (error: unknown) {
          showAlert('刪除失敗：' + errorMessage(error), '錯誤');
        }
      },
    });
  };

  return (
    <>
      <div className="mb-8">
        <h1 className="mb-1 font-serif text-2xl font-semibold text-[#382E2B]">組合商品</h1>
        <p className="text-sm text-[#7A6E65]">把指定商品組成一套，並用一個組合價出售。前台只顯示上架中的組合。</p>
      </div>

      <form onSubmit={saveBundle} className="mb-8 rounded-2xl border border-[#EBE5DF] bg-white p-5 shadow-[0_4px_20px_rgba(56,46,43,0.03)] md:p-10">
        <div className="mb-5 flex items-center justify-between gap-3 border-b border-[#EBE5DF] pb-2.5">
          <h2 className="text-base font-semibold text-[#382E2B]">{editingId ? '修改組合' : '建立組合'}</h2>
          {editingId && (
            <button type="button" onClick={resetForm} className="cursor-pointer text-xs text-[#7A6E65] underline">取消修改</button>
          )}
        </div>

        <div className="mb-6 grid gap-6 md:grid-cols-2">
          <label className="grid gap-2 text-xs font-semibold text-[#6E6058]">
            組合名稱 <span className="text-[#B35B48]">*</span>
            <input value={name} onChange={(event) => setName(event.target.value)} required placeholder="例如：通勤包袋雙件組" className="rounded-lg border border-[#EBE5DF] bg-[#FAF7F2] px-4 py-3 text-sm font-normal outline-none focus:border-[#B35B48]" />
          </label>
          <label className="grid gap-2 text-xs font-semibold text-[#6E6058]">
            組合價格 (HKD) <span className="text-[#B35B48]">*</span>
            <input type="number" min={0.1} step="0.1" value={price} onChange={(event) => setPrice(event.target.value)} required placeholder="例如：499" className="rounded-lg border border-[#EBE5DF] bg-[#FAF7F2] px-4 py-3 font-mono text-sm font-normal outline-none focus:border-[#B35B48]" />
          </label>
        </div>

        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold text-[#6E6058]">選擇商品 <span className="text-[#B35B48]">*</span></p>
            <p className="mt-1 text-[12px] text-[#8C7B70]">已選 {selectedItems.length} 件，單買合計 {money(originalTotal)}{Number.isFinite(bundlePrice) && bundlePrice > 0 ? `，組合價相差 ${money(savingAmount)}` : ''}</p>
          </div>
          <div className="flex w-full flex-col gap-2 sm:max-w-md sm:flex-row">
            <select
              aria-label="篩選分類"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className="cursor-pointer rounded-full border border-[#EBE5DF] bg-[#FAF7F2] px-4 py-2.5 text-sm text-[#382E2B] outline-none focus:border-[#B35B48]"
            >
              {categoryOptions.map((item) => (
                <option key={item.id} value={item.id}>{item.label}</option>
              ))}
            </select>
            <input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="搜尋商品名稱或編號" aria-label="搜尋可組合商品" className="w-full rounded-full border border-[#EBE5DF] bg-[#FAF7F2] px-4 py-2.5 text-sm outline-none focus:border-[#B35B48]" />
          </div>
        </div>

        <div className="mb-6 max-h-105 overflow-y-auto rounded-xl border border-[#EBE5DF]">
          {visibleProducts.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-[#7A6E65]">沒有符合的上架商品。</p>
          ) : (
            visibleProducts.map((product) => {
              const checked = picked[product.id] !== undefined;
              return (
                <div key={product.id} className="flex items-center gap-3 border-b border-[#F4F0EA] px-4 py-3 last:border-b-0">
                  <input type="checkbox" checked={checked} onChange={() => toggleProduct(product.id)} aria-label={`選取 ${product.name}`} className="h-4 w-4 accent-[#B35B48]" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-[#382E2B]">{product.name}</p>
                    <p className="text-[11px] text-[#8C7B70]">{product.category} · {product.id} · {money(Number(product.price))}{typeof product.stock === 'number' ? ` · 庫存 ${product.stock}` : ''}</p>
                  </div>
                  <label className="flex items-center gap-2 text-[12px] text-[#6E6058]">
                    數量
                    <input
                      type="number"
                      min={1}
                      step={1}
                      disabled={!checked}
                      value={picked[product.id] || '1'}
                      onChange={(event) => setPicked((current) => ({ ...current, [product.id]: event.target.value }))}
                      className="w-16 rounded-lg border border-[#EBE5DF] bg-[#FAF7F2] px-2 py-1.5 font-mono text-sm outline-none focus:border-[#B35B48] disabled:text-[#C4B8B0]"
                    />
                  </label>
                </div>
              );
            })
          )}
        </div>

        <button type="submit" disabled={saving} className="cursor-pointer rounded-full bg-[#B35B48] px-7 py-3 text-sm font-medium text-white transition hover:bg-[#9B4C3A] disabled:cursor-wait disabled:opacity-70">
          {saving ? '儲存中...' : editingId ? '儲存修改' : '建立組合'}
        </button>
      </form>

      <div className="rounded-2xl border border-[#EBE5DF] bg-white p-5 shadow-[0_4px_20px_rgba(56,46,43,0.03)] md:p-10">
        <h2 className="mb-5 border-b border-[#EBE5DF] pb-2.5 font-serif text-base font-semibold text-[#382E2B]">現有組合</h2>
        {bundles.length === 0 ? (
          <p className="py-8 text-center text-sm text-[#7A6E65]">尚未建立組合。</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-175 border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-[#EBE5DF] text-[#7A6E65]">
                  <th className="pb-3 font-semibold">組合</th>
                  <th className="pb-3 font-semibold">內容</th>
                  <th className="pb-3 font-semibold">價格</th>
                  <th className="pb-3 font-semibold">狀態</th>
                  <th className="pb-3 text-right font-semibold">操作</th>
                </tr>
              </thead>
              <tbody>
                {bundles.map((bundle) => {
                  const original = bundleOriginalTotal(bundle.items || []);
                  return (
                    <tr key={bundle.id} className="border-b border-[#F4F0EA]">
                      <td className="py-3.5 pr-4 align-top">
                        <p className="font-semibold text-[#382E2B]">{bundle.name}</p>
                        <p className="font-mono text-[11px] text-[#8C7B70]">{bundle.id}</p>
                      </td>
                      <td className="py-3.5 pr-4 align-top text-xs text-[#6E6058]">
                        {(bundle.items || []).map((item) => (
                          <p key={item.productId}>{item.name} × {item.quantity}</p>
                        ))}
                      </td>
                      <td className="py-3.5 pr-4 align-top font-mono">
                        <p className="font-semibold text-[#B35B48]">{money(Number(bundle.price))}</p>
                        <p className="text-[11px] text-[#8C7B70]">單買 {money(original)}</p>
                      </td>
                      <td className="py-3.5 align-top text-xs">{bundle.active ? '上架中' : '已下架'}</td>
                      <td className="py-3.5 text-right align-top">
                        <div className="flex justify-end gap-2">
                          <button type="button" onClick={() => loadBundle(bundle)} className="cursor-pointer rounded-md border border-[#EBE5DF] px-3 py-1 text-xs text-[#382E2B]">編輯</button>
                          <button type="button" onClick={() => setActive(bundle, !bundle.active)} className="cursor-pointer rounded-md border border-[#EBE5DF] px-3 py-1 text-xs text-[#382E2B]">{bundle.active ? '下架' : '上架'}</button>
                          <button type="button" onClick={() => removeBundle(bundle)} className="cursor-pointer rounded-md border border-rose-200 bg-rose-50 px-3 py-1 text-xs text-rose-700">刪除</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {toast && (
        <div className="fixed bottom-8 left-1/2 z-4000 -translate-x-1/2 rounded-full bg-[#382E2B] px-6 py-3 text-[13px] text-[#FAF7F2]">{toast}</div>
      )}

      {modal.open && (
        <div className="fixed inset-0 z-5000 flex items-center justify-center bg-[#382E2B]/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl border border-[#EBE5DF] bg-[#FAF7F2] p-6">
            <h3 className="mb-2 font-serif text-base font-semibold text-[#382E2B]">{modal.title}</h3>
            <p className="mb-6 text-xs leading-relaxed text-[#6E6058]">{modal.message}</p>
            <div className="flex justify-end gap-3">
              {modal.confirm && (
                <button type="button" onClick={() => setModal((current) => ({ ...current, open: false }))} className="cursor-pointer rounded-lg border border-[#EBE5DF] bg-[#F4F0EA] px-4 py-2 text-xs font-semibold">取消</button>
              )}
              <button
                type="button"
                onClick={() => {
                  const action = modal.confirm;
                  setModal((current) => ({ ...current, open: false }));
                  action?.();
                }}
                className="cursor-pointer rounded-lg bg-[#B35B48] px-4 py-2 text-xs font-semibold text-white"
              >
                確定
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
