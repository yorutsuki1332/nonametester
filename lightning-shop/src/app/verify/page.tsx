'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import firebase from 'firebase/compat/app';
import Link from 'next/link';

function VerifyContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const email = searchParams.get('email');
  const code = searchParams.get('code');
  const urlAccountId = searchParams.get('accountId');
  const urlUid = searchParams.get('uid'); // 取得網址帶的 uid

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('正在驗證您的電子郵件...');

  useEffect(() => {
    async function verify() {
      if (!email || !code) {
        setStatus('error');
        setMessage('無效的驗證連結，缺少必要參數。');
        return;
      }

      try {
        const docRef = db.collection('verifications').doc(email);
        const docSnap = await docRef.get();

        if (!docSnap.exists) {
          setStatus('error');
          setMessage('找不到驗證紀錄或驗證碼已過期。');
          return;
        }

        const verificationData = docSnap.data();
        const serverCode = verificationData?.code;
        const finalAccountId = verificationData?.accountId || urlAccountId || (email.split('@')[0] + '_user');
        const finalUid = verificationData?.uid || urlUid || ''; // 取得最終 uid

        if (serverCode === code) {
          const userDocRef = db.collection('users').doc(finalAccountId);
          const userDocSnap = await userDocRef.get();

          if (!userDocSnap.exists) {
            // 🌟 寫入完整的會員資料，包含 uid
            await userDocRef.set({
              accountId: finalAccountId,
              email: email,
              uid: finalUid, // 成功帶入 uid！
              storeCredit: 0,
              createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
          }

          // 清除驗證紀錄
          await docRef.delete();

          setStatus('success');
          setMessage(`✨ 電子郵件驗證成功！會員帳號 (${finalAccountId}) 已建立，您現在可以回到首頁登入。`);
        } else {
          setStatus('error');
          setMessage('❌ 驗證碼不正確或已失效。');
        }
      } catch (err: any) {
        setStatus('error');
        setMessage('驗證過程發生錯誤：' + err.message);
      }
    }

    verify();
  }, [email, code, urlAccountId, urlUid]);

  return (
    <div className="min-h-screen bg-[#fafafa] flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-[#f0f0f0] max-w-md w-full text-center">
        <h1 className="text-xl font-bold mb-4 uppercase tracking-wider">LIGHTNING LIFESTYLE</h1>
        <div className="my-6">
          {status === 'loading' && <p className="text-stone-600">{message}</p>}
          {status === 'success' && (
            <div className="space-y-4">
              <div className="text-4xl">🎉</div>
              <p className="text-emerald-600 font-medium">{message}</p>
              <button 
                onClick={() => router.push('/')}
                className="w-full bg-[#111] text-white py-3 rounded-lg font-medium hover:bg-[#333] transition cursor-pointer"
              >
                前往首頁登入
              </button>
            </div>
          )}
          {status === 'error' && (
            <div className="space-y-4">
              <div className="text-4xl">⚠️</div>
              <p className="text-red-500 font-medium">{message}</p>
              <Link href="/" className="inline-block text-sm text-stone-500 underline">
                返回首頁
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={<div className="text-center p-10">讀取中...</div>}>
      <VerifyContent />
    </Suspense>
  );
}