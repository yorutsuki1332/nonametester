'use client';

import { useEffect, useState } from 'react';
import firebase from 'firebase/compat/app';
import { db } from '@/lib/firebase';
import { errorMessage } from '@/lib/errors';
import {
  JOURNEY_POSTS,
  normalizeJourneyPost,
  sortJourneyPosts,
  type JourneyPost,
} from '@/lib/journey';

const FIELD =
  'w-full rounded-lg border border-[#EBE5DF] bg-[#FAF7F2] px-4 py-3 text-sm outline-none transition focus:border-[#B35B48]';

const EMPTY = {
  slug: '',
  chapter: '',
  kicker: '',
  title: '',
  date: '',
  excerpt: '',
  quote: '',
  paragraphs: '',
  shopHref: '/categories',
  shopLabel: '瀏覽相關選品',
};

function toPayload(form: typeof EMPTY) {
  const paragraphs = form.paragraphs
    .split(/\n\s*\n/)
    .map((item) => item.trim())
    .filter(Boolean);

  return {
    chapter: form.chapter.trim(),
    kicker: form.kicker.trim(),
    title: form.title.trim(),
    date: form.date,
    excerpt: form.excerpt.trim(),
    quote: form.quote.trim(),
    paragraphs,
    shopHref: form.shopHref.trim() || '/categories',
    shopLabel: form.shopLabel.trim() || '瀏覽相關選品',
  };
}

export default function AdminJourneyPage() {
  const [posts, setPosts] = useState<JourneyPost[]>([]);
  const [ready, setReady] = useState(false);
  const [editingSlug, setEditingSlug] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  useEffect(() => {
    return db.collection('journeyPosts').onSnapshot((snapshot) => {
      const list = snapshot.docs
        .map((doc) => normalizeJourneyPost(doc.id, doc.data() as Record<string, unknown>))
        .filter((post): post is JourneyPost => post !== null);
      setPosts(sortJourneyPosts(list));
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
    setEditingSlug(null);
    setForm(EMPTY);
  };

  const editPost = (post: JourneyPost) => {
    setEditingSlug(post.slug);
    setForm({
      slug: post.slug,
      chapter: post.chapter,
      kicker: post.kicker,
      title: post.title,
      date: post.date,
      excerpt: post.excerpt,
      quote: post.quote,
      paragraphs: post.paragraphs.join('\n\n'),
      shopHref: post.shopHref,
      shopLabel: post.shopLabel,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const slug = form.slug.trim().toLowerCase();
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      setToast('網址代稱只能使用小寫英文、數字與連字號');
      return;
    }
    const payload = toPayload(form);
    if (!payload.title || !payload.date || payload.paragraphs.length === 0) {
      setToast('請填標題、日期，以及至少一段內文');
      return;
    }

    setSaving(true);
    try {
      const doc = db.collection('journeyPosts').doc(slug);
      await doc.set(
        {
          ...payload,
          ...(editingSlug ? {} : { createdAt: firebase.firestore.FieldValue.serverTimestamp() }),
        },
        { merge: true },
      );
      setToast(editingSlug ? '手記已更新' : '手記已發佈');
      resetForm();
    } catch (error: unknown) {
      setToast(`儲存失敗：${errorMessage(error)}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!pendingDelete) return;
    const slug = pendingDelete;
    setPendingDelete(null);
    try {
      await db.collection('journeyPosts').doc(slug).delete();
      if (editingSlug === slug) resetForm();
      setToast('手記已刪除');
    } catch (error: unknown) {
      setToast(`刪除失敗：${errorMessage(error)}`);
    }
  };

  const importSeed = async () => {
    const existing = new Set(posts.map((post) => post.slug));
    const missing = JOURNEY_POSTS.filter((post) => !existing.has(post.slug));
    if (missing.length === 0) {
      setToast('現有手記已在資料庫');
      return;
    }
    setSaving(true);
    try {
      const batch = db.batch();
      missing.forEach((post) => {
        batch.set(db.collection('journeyPosts').doc(post.slug), {
          chapter: post.chapter,
          kicker: post.kicker,
          title: post.title,
          date: post.date,
          excerpt: post.excerpt,
          quote: post.quote,
          paragraphs: post.paragraphs,
          shopHref: post.shopHref,
          shopLabel: post.shopLabel,
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        });
      });
      await batch.commit();
      setToast(`已載入 ${missing.length} 篇現有手記`);
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
          <h1 className="mb-1 font-serif text-2xl font-semibold text-[#382E2B]">品牌誌</h1>
          <p className="text-sm text-[#7A6E65]">撰寫、修改與下架前台「品牌誌」的手記。資料庫為空時，前台仍會顯示內建的五篇。</p>
        </div>
        <button
          type="button"
          onClick={importSeed}
          disabled={saving}
          className="rounded-full border border-[#EBE5DF] bg-white px-4 py-2 text-[13px] font-medium text-[#382E2B] transition hover:border-[#B35B48] hover:text-[#B35B48] disabled:opacity-50"
        >
          載入現有手記
        </button>
      </div>

      <div className="mb-8 rounded-2xl border border-[#EBE5DF] bg-white p-5 shadow-[0_4px_20px_rgba(56,46,43,0.03)] md:p-10">
        <div className="mb-5 flex items-center justify-between border-b border-[#EBE5DF] pb-2.5">
          <h2 className="text-base font-semibold text-[#382E2B]">{editingSlug ? '編輯手記' : '新增手記'}</h2>
          {editingSlug && (
            <button type="button" onClick={resetForm} className="text-[13px] text-[#7A6E65] hover:text-[#B35B48]">
              改為新增
            </button>
          )}
        </div>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <label className="flex flex-col gap-2 text-xs font-semibold text-[#6E6058]">
            網址代稱 <span className="font-normal text-[#A3958B]">例如 autumn-notes</span>
            <input
              className={FIELD}
              value={form.slug}
              onChange={(event) => update('slug', event.target.value)}
              placeholder="autumn-notes"
              required
              disabled={Boolean(editingSlug)}
            />
          </label>
          <label className="flex flex-col gap-2 text-xs font-semibold text-[#6E6058]">
            日期
            <input className={FIELD} type="date" value={form.date} onChange={(event) => update('date', event.target.value)} required />
          </label>
          <label className="flex flex-col gap-2 text-xs font-semibold text-[#6E6058]">
            章節
            <input className={FIELD} value={form.chapter} onChange={(event) => update('chapter', event.target.value)} placeholder="JOURNAL 06" required />
          </label>
          <label className="flex flex-col gap-2 text-xs font-semibold text-[#6E6058]">
            分類標
            <input className={FIELD} value={form.kicker} onChange={(event) => update('kicker', event.target.value)} placeholder="SEASONAL NOTES" />
          </label>
          <label className="flex flex-col gap-2 text-xs font-semibold text-[#6E6058] md:col-span-2">
            標題
            <input className={FIELD} value={form.title} onChange={(event) => update('title', event.target.value)} required />
          </label>
          <label className="flex flex-col gap-2 text-xs font-semibold text-[#6E6058] md:col-span-2">
            摘要
            <textarea className={`${FIELD} min-h-20`} value={form.excerpt} onChange={(event) => update('excerpt', event.target.value)} required />
          </label>
          <label className="flex flex-col gap-2 text-xs font-semibold text-[#6E6058] md:col-span-2">
            內文 <span className="font-normal text-[#A3958B]">段落之間空一行</span>
            <textarea className={`${FIELD} min-h-48`} value={form.paragraphs} onChange={(event) => update('paragraphs', event.target.value)} required />
          </label>
          <label className="flex flex-col gap-2 text-xs font-semibold text-[#6E6058] md:col-span-2">
            引言
            <textarea className={`${FIELD} min-h-20`} value={form.quote} onChange={(event) => update('quote', event.target.value)} />
          </label>
          <label className="flex flex-col gap-2 text-xs font-semibold text-[#6E6058]">
            選品連結
            <input className={FIELD} value={form.shopHref} onChange={(event) => update('shopHref', event.target.value)} placeholder="/categories" />
          </label>
          <label className="flex flex-col gap-2 text-xs font-semibold text-[#6E6058]">
            按鈕文字
            <input className={FIELD} value={form.shopLabel} onChange={(event) => update('shopLabel', event.target.value)} placeholder="瀏覽相關選品" />
          </label>
          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-full bg-[#B35B48] px-6 py-3 text-[13px] font-semibold text-white transition hover:bg-[#9B4C3A] disabled:opacity-50"
            >
              {saving ? '儲存中' : editingSlug ? '更新手記' : '發佈手記'}
            </button>
          </div>
        </form>
      </div>

      <div className="rounded-2xl border border-[#EBE5DF] bg-white p-5 md:p-8">
        <h2 className="mb-4 text-base font-semibold text-[#382E2B]">已發佈 {ready ? posts.length : '…'} 篇</h2>
        {ready && posts.length === 0 && (
          <p className="text-sm text-[#7A6E65]">資料庫還沒有手記。可以先載入目前網站上的五篇，再逐篇修改。</p>
        )}
        <ul className="flex flex-col">
          {posts.map((post) => (
            <li key={post.slug} className="flex flex-col gap-3 border-b border-[#EBE5DF] py-4 last:border-b-0 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[11px] tracking-[1px] text-[#B35B48]">{post.chapter} · {post.dateLabel}</p>
                <p className="font-serif text-[16px] text-[#382E2B]">{post.title}</p>
                <p className="text-[12px] text-[#A3958B]">/journey/{post.slug}</p>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => editPost(post)} className="rounded-full border border-[#EBE5DF] px-4 py-2 text-[12px] text-[#382E2B] hover:border-[#B35B48]">
                  編輯
                </button>
                <button type="button" onClick={() => setPendingDelete(post.slug)} className="rounded-full border border-[#EBE5DF] px-4 py-2 text-[12px] text-[#B35B48] hover:border-[#B35B48]">
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
            <h3 className="mb-2 font-serif text-[18px]">刪除手記</h3>
            <p className="mb-6 text-sm text-[#6E6058]">確定要刪除 /journey/{pendingDelete} 嗎？前台會立刻看不到這篇。</p>
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
