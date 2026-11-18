'use client';

import { useEffect, useState } from 'react';
import firebase from 'firebase/compat/app';
import { db } from '@/lib/firebase';
import { errorMessage, withoutDocumentId } from '@/lib/errors';

interface Inquiry {
  id: string;
  name?: string;
  email?: string;
  topic?: string;
  message?: string;
  createdAt?: firebase.firestore.Timestamp;
}

export default function AdminInquiriesPage() {
  const [list, setList] = useState<Inquiry[]>([]);
  const [ready, setReady] = useState(false);
  const [pendingId, setPendingId] = useState('');

  useEffect(() => {
    return db.collection('inquiries').orderBy('createdAt', 'desc').onSnapshot((snapshot) => {
      const next: Inquiry[] = [];
      snapshot.forEach((doc) => {
        next.push({ id: doc.id, ...withoutDocumentId(doc.data()) } as Inquiry);
      });
      setList(next);
      setReady(true);
    }, () => setReady(true));
  }, []);

  const remove = async (item: Inquiry) => {
    if (!window.confirm(`刪除「${item.name || '這則訊息'}」的來信？`)) return;
    setPendingId(item.id);
    try {
      await db.collection('inquiries').doc(item.id).delete();
    } catch (error) {
      window.alert(`刪除失敗：${errorMessage(error)}`);
    } finally {
      setPendingId('');
    }
  };

  return (
    <>
      <div className="mb-6.25">
        <h1 className="mb-1 font-serif text-[24px] font-semibold text-[#382E2B]">顧客來信</h1>
        <p className="text-[14px] text-[#7A6E65]">聯絡頁面送出的訊息會出現在這裡。回覆請直接寄到對方留下的電郵。</p>
      </div>
      {!ready ? (
        <p className="text-[14px] text-[#7A6E65]">正在讀取來信...</p>
      ) : list.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-[#EBE5DF] bg-white px-5 py-10 text-center text-[14px] text-[#7A6E65]">目前沒有顧客來信。</p>
      ) : (
        <div className="flex flex-col gap-4">
          {list.map((item) => (
            <article key={item.id} className="rounded-2xl border border-[#EBE5DF] bg-white p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[12px] tracking-[1px] text-[#B35B48]">{item.topic || '未分類'}</p>
                  <h2 className="mt-1 text-[16px] font-semibold text-[#382E2B]">{item.name || '未留名'}</h2>
                  <p className="text-[13px] text-[#6E6058]">{item.email || '未留電郵'}</p>
                </div>
                <button
                  type="button"
                  onClick={() => remove(item)}
                  disabled={pendingId === item.id}
                  className="cursor-pointer rounded-full border border-[#EBE5DF] px-3 py-1.5 text-[12px] text-[#7A6E65] hover:border-[#B35B48] hover:text-[#B35B48] disabled:opacity-50"
                >
                  刪除
                </button>
              </div>
              <p className="mt-4 text-[14px] leading-[1.8] whitespace-pre-wrap text-[#382E2B]">{item.message}</p>
              <p className="mt-3 text-[12px] text-[#A3958B]">
                {item.createdAt?.toDate ? item.createdAt.toDate().toLocaleString('zh-HK') : ''}
              </p>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
