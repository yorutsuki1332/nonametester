'use client';

import { useEffect, useState } from 'react';
import firebase from 'firebase/compat/app';
import { db } from '@/lib/firebase';
import { errorMessage } from '@/lib/errors';
import {
  LOOK_PANELS,
  LOOKS,
  normalizeLook,
  sortLooks,
  type Look,
  type LookPanel,
} from '@/lib/lookbook';

const FIELD =
  'w-full rounded-lg border border-[#EBE5DF] bg-[#FAF7F2] px-4 py-3 text-sm outline-none transition focus:border-[#B35B48]';

const EMPTY = {
  id: '',
  order: '1',
  season: 'AUTUMN / WINTER 2026',
  title: '',
  body: '',
  colors: '',
  panel: 'cream' as LookPanel,
  href: '/categories',
};

export default function AdminLookbookPage() {
  const [looks, setLooks] = useState<Look[]>([]);
  const [ready, setReady] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  useEffect(() => {
    return db.collection('looks').onSnapshot((snapshot) => {
      const list = snapshot.docs
        .map((doc) => normalizeLook(doc.id, doc.data() as Record<string, unknown>))
        .filter((look): look is Look => look !== null);
      setLooks(sortLooks(list));
      setReady(true);
    });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(''), 2800);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const update = (key: keyof typeof EMPTY, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const resetForm = () => {
    setEditingId(null);
    setForm({ ...EMPTY, order: String((looks.at(-1)?.order ?? 0) + 1) });
  };

  const editLook = (look: Look) => {
    setEditingId(look.id);
    setForm({
      id: look.id,
      order: String(look.order),
      season: look.season,
      title: look.title,
      body: look.body,
      colors: look.colors,
      panel: look.panel,
      href: look.href,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const id = form.id.trim();
    if (!/^[a-zA-Z0-9-]{1,12}$/.test(id)) {
      setToast('編號只能使用英數與連字號，最多 12 字');
      return;
    }
    if (!form.title.trim() || !form.body.trim()) {
      setToast('請填造型名稱與說明');
      return;
    }

    setSaving(true);
    try {
      await db.collection('looks').doc(id).set(
        {
          order: Number(form.order) || 0,
          season: form.season.trim() || 'AUTUMN / WINTER 2026',
          title: form.title.trim(),
          body: form.body.trim(),
          colors: form.colors.trim(),
          panel: form.panel,
          href: form.href.trim() || '/categories',
          ...(editingId ? {} : { createdAt: firebase.firestore.FieldValue.serverTimestamp() }),
        },
        { merge: true },
      );
      setToast(editingId ? '造型已更新' : '造型已發佈');
      resetForm();
    } catch (error: unknown) {
      setToast(`儲存失敗：${errorMessage(error)}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!pendingDelete) return;
    const id = pendingDelete;
    setPendingDelete(null);
    try {
      await db.collection('looks').doc(id).delete();
      if (editingId === id) resetForm();
      setToast('造型已刪除');
    } catch (error: unknown) {
      setToast(`刪除失敗：${errorMessage(error)}`);
    }
  };

  const importSeed = async () => {
    const existing = new Set(looks.map((look) => look.id));
    const missing = LOOKS.filter((look) => !existing.has(look.id));
    if (missing.length === 0) {
      setToast('現有造型已在資料庫');
      return;
    }
    setSaving(true);
    try {
      const batch = db.batch();
      missing.forEach((look) => {
        batch.set(db.collection('looks').doc(look.id), {
          order: look.order,
          season: look.season,
          title: look.title,
          body: look.body,
          colors: look.colors,
          panel: look.panel,
          href: look.href,
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        });
      });
      await batch.commit();
      setToast(`已載入 ${missing.length} 組現有造型`);
    } catch (error: unknown) {
      setToast(`載入失敗：${errorMessage(error)}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="mb-1 font-serif text-2xl font-semibold text-[#382E2B]">造型集</h1>
          <p className="text-sm text-[#7A6E65]">建立前台「造型集」的穿搭卡片。資料庫為空時，前台仍會顯示內建的三組造型。</p>
        </div>
        <button
          type="button"
          onClick={importSeed}
          disabled={saving}
          className="rounded-full border border-[#EBE5DF] bg-white px-4 py-2 text-[13px] font-medium text-[#382E2B] transition hover:border-[#B35B48] hover:text-[#B35B48] disabled:opacity-50"
        >
          載入現有造型
        </button>
      </div>

      <div className="mb-8 rounded-2xl border border-[#EBE5DF] bg-white p-5 shadow-[0_4px_20px_rgba(56,46,43,0.03)] md:p-10">
        <div className="mb-5 flex items-center justify-between border-b border-[#EBE5DF] pb-2.5">
          <h2 className="text-base font-semibold text-[#382E2B]">{editingId ? '編輯造型' : '新增造型'}</h2>
          {editingId && (
            <button type="button" onClick={resetForm} className="text-[13px] text-[#7A6E65] hover:text-[#B35B48]">
              改為新增
            </button>
          )}
        </div>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <label className="flex flex-col gap-2 text-xs font-semibold text-[#6E6058]">
            編號
            <input
              className={FIELD}
              value={form.id}
              onChange={(event) => update('id', event.target.value)}
              placeholder="04"
              required
              disabled={Boolean(editingId)}
            />
          </label>
          <label className="flex flex-col gap-2 text-xs font-semibold text-[#6E6058]">
            排序
            <input className={FIELD} type="number" value={form.order} onChange={(event) => update('order', event.target.value)} required />
          </label>
          <label className="flex flex-col gap-2 text-xs font-semibold text-[#6E6058]">
            季節標
            <input className={FIELD} value={form.season} onChange={(event) => update('season', event.target.value)} />
          </label>
          <label className="flex flex-col gap-2 text-xs font-semibold text-[#6E6058]">
            色票
            <select className={FIELD} value={form.panel} onChange={(event) => update('panel', event.target.value)}>
              {(Object.keys(LOOK_PANELS) as LookPanel[]).map((key) => (
                <option key={key} value={key}>{LOOK_PANELS[key].label}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-2 text-xs font-semibold text-[#6E6058] md:col-span-2">
            造型名稱
            <input className={FIELD} value={form.title} onChange={(event) => update('title', event.target.value)} required />
          </label>
          <label className="flex flex-col gap-2 text-xs font-semibold text-[#6E6058] md:col-span-2">
            色彩說明
            <input className={FIELD} value={form.colors} onChange={(event) => update('colors', event.target.value)} placeholder="PALETTE · 燕麥米 · 暖沙色" />
          </label>
          <label className="flex flex-col gap-2 text-xs font-semibold text-[#6E6058] md:col-span-2">
            說明
            <textarea className={`${FIELD} min-h-28`} value={form.body} onChange={(event) => update('body', event.target.value)} required />
          </label>
          <label className="flex flex-col gap-2 text-xs font-semibold text-[#6E6058] md:col-span-2">
            選品連結
            <input className={FIELD} value={form.href} onChange={(event) => update('href', event.target.value)} placeholder="/categories?category=BAGS" />
          </label>
          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-full bg-[#B35B48] px-6 py-3 text-[13px] font-semibold text-white transition hover:bg-[#9B4C3A] disabled:opacity-50"
            >
              {saving ? '儲存中' : editingId ? '更新造型' : '發佈造型'}
            </button>
          </div>
        </form>
      </div>

      <div className="rounded-2xl border border-[#EBE5DF] bg-white p-5 md:p-8">
        <h2 className="mb-4 text-base font-semibold text-[#382E2B]">已發佈 {ready ? looks.length : '…'} 組</h2>
        {ready && looks.length === 0 && (
          <p className="text-sm text-[#7A6E65]">資料庫還沒有造型。可以先載入目前網站上的三組，再逐組修改。</p>
        )}
        <ul className="flex flex-col">
          {looks.map((look) => (
            <li key={look.id} className="flex flex-col gap-3 border-b border-[#EBE5DF] py-4 last:border-b-0 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[11px] tracking-[1px] text-[#B35B48]">LOOK {look.id} · {LOOK_PANELS[look.panel].label}</p>
                <p className="font-serif text-[16px] text-[#382E2B]">{look.title}</p>
                <p className="text-[12px] text-[#A3958B]">{look.season}</p>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => editLook(look)} className="rounded-full border border-[#EBE5DF] px-4 py-2 text-[12px] text-[#382E2B] hover:border-[#B35B48]">
                  編輯
                </button>
                <button type="button" onClick={() => setPendingDelete(look.id)} className="rounded-full border border-[#EBE5DF] px-4 py-2 text-[12px] text-[#B35B48] hover:border-[#B35B48]">
                  刪除
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-2000 -translate-x-1/2 rounded-full bg-[#382E2B] px-5 py-3 text-[13px] text-white shadow-lg">
          {toast}
        </div>
      )}

      {pendingDelete && (
        <div className="fixed inset-0 z-2000 flex items-center justify-center bg-[#382E2B]/40 px-6">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6">
            <h3 className="mb-2 font-serif text-[18px]">刪除造型</h3>
            <p className="mb-6 text-sm text-[#6E6058]">確定要刪除 LOOK {pendingDelete} 嗎？前台會立刻看不到這組。</p>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setPendingDelete(null)} className="rounded-full px-4 py-2 text-[13px] text-[#7A6E65]">
                取消
              </button>
              <button type="button" onClick={handleDelete} className="rounded-full bg-[#B35B48] px-4 py-2 text-[13px] font-semibold text-white">
                刪除
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
