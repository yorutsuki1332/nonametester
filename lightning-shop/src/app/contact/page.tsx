'use client';

import { useState } from 'react';
import Link from 'next/link';
import firebase from 'firebase/compat/app';
import StudioPage from '@/components/StudioPage';
import { db } from '@/lib/firebase';
import { errorMessage } from '@/lib/errors';

const TOPICS = ['訂單查詢', '商品與尺寸', '配送', '合作', '其他'];

export default function ContactPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [topic, setTopic] = useState(TOPICS[0]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const trimmedMessage = message.trim();
    if (!trimmedName) {
      setError('請留下稱呼。');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError('請留下可以回信的電郵。');
      return;
    }
    if (trimmedMessage.length < 8) {
      setError('請把想問的事寫清楚一點。');
      return;
    }
    setSending(true);
    setError('');
    try {
      await db.collection('inquiries').add({
        name: trimmedName,
        email: trimmedEmail,
        topic,
        message: trimmedMessage,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
      setSent(true);
      setName('');
      setEmail('');
      setTopic(TOPICS[0]);
      setMessage('');
    } catch (caught) {
      setError(`訊息沒有送出：${errorMessage(caught)}`);
    } finally {
      setSending(false);
    }
  };

  return (
    <StudioPage
      kicker="CONTACT · 聯絡我們"
      title="有訂單、尺寸或合作，寫在這裡"
      lede="雲棧以網店經營，沒有門市櫃檯。留下電郵與訊息，賣家會回到這個信箱回你。"
    >
      <div className="grid grid-cols-1 gap-8 md:grid-cols-5">
        <aside className="rounded-2xl border border-[#EBE5DF] bg-[#F4F0EA] p-6 md:col-span-2">
          <h2 className="mb-3 font-serif text-[18px] text-[#382E2B]">先看一眼也許就有答案</h2>
          <ul className="space-y-3 text-[13px] leading-relaxed text-[#5C4D42]">
            <li><Link href="/qa#shipping" className="font-semibold text-[#B35B48] no-underline hover:underline">運費與配送</Link>：滿 HKD 600 免運，未滿可選順豐自取或住宅配送。</li>
            <li><Link href="/qa#tracking" className="font-semibold text-[#B35B48] no-underline hover:underline">物流編號</Link>：出貨後出現在會員中心。</li>
            <li><Link href="/account" className="font-semibold text-[#B35B48] no-underline hover:underline">會員中心</Link>：查看自己的訂單。</li>
          </ul>
        </aside>

        <form onSubmit={submit} className="rounded-2xl border border-[#EBE5DF] bg-white p-6 md:col-span-3">
          {sent ? (
            <p className="rounded-xl bg-[#F4F0EA] px-4 py-3 text-[14px] leading-relaxed text-[#382E2B]" role="status">
              已收到。我們會寄回你留下的電郵。
            </p>
          ) : null}
          <label className="mt-4 block text-[12px] text-[#7A6E65]" htmlFor="contact-name">稱呼</label>
          <input id="contact-name" value={name} onChange={(event) => setName(event.target.value)} className="mt-1 w-full rounded-lg border border-[#EBE5DF] bg-white p-3 text-[14px] outline-none focus:border-[#B35B48]" />
          <label className="mt-4 block text-[12px] text-[#7A6E65]" htmlFor="contact-email">電郵</label>
          <input id="contact-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-1 w-full rounded-lg border border-[#EBE5DF] bg-white p-3 text-[14px] outline-none focus:border-[#B35B48]" placeholder="example@email.com" />
          <label className="mt-4 block text-[12px] text-[#7A6E65]" htmlFor="contact-topic">主題</label>
          <select id="contact-topic" value={topic} onChange={(event) => setTopic(event.target.value)} className="mt-1 w-full cursor-pointer rounded-lg border border-[#EBE5DF] bg-white p-3 text-[14px] outline-none focus:border-[#B35B48]">
            {TOPICS.map((item) => <option key={item}>{item}</option>)}
          </select>
          <label className="mt-4 block text-[12px] text-[#7A6E65]" htmlFor="contact-message">訊息</label>
          <textarea id="contact-message" value={message} onChange={(event) => setMessage(event.target.value)} rows={6} className="mt-1 w-full resize-y rounded-lg border border-[#EBE5DF] bg-white p-3 text-[14px] outline-none focus:border-[#B35B48]" placeholder="如果是訂單，請附上訂單編號。" />
          {error ? <p className="mt-3 text-[13px] text-[#B35B48]" role="alert">{error}</p> : null}
          <button type="submit" disabled={sending} className="affordance mt-5 cursor-pointer rounded-full bg-[#B35B48] px-6 py-3 text-[13px] font-semibold text-white hover:bg-[#9B4C3A] disabled:cursor-not-allowed disabled:opacity-60">
            {sending ? '送出中...' : '送出訊息'}
          </button>
        </form>
      </div>
    </StudioPage>
  );
}
