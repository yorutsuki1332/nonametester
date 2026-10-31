import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { db } from '@/lib/firebase';
import firebase from 'firebase/compat/app';

export async function POST(request: Request) {
  try {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: { message: '系統未設定 RESEND_API_KEY 環境變數。' } },
        { status: 500 }
      );
    }

    // 🌟 在 Request 觸發時才進行初始化，避免 build 階段因為找不到金鑰而報錯
    const resend = new Resend(apiKey);
    const { email, accountId } = await request.json();
    
    // 1. 產生 6 位數驗證碼
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    // 2. 產生驗證網址
    const verifyUrl = `http://localhost:3000/verify?email=${encodeURIComponent(email)}&code=${verificationCode}`;

    // 3. 透過 Resend 發送信件
    const { data, error } = await resend.emails.send({
      from: 'LIGHTNING LIFESTYLE <onboarding@resend.dev>',
      to: [email],
      subject: '【LIGHTNING LIFESTYLE】您的帳號驗證信',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; background: #ffffff; color: #333333; border: 1px solid #f0f0f0; border-radius: 12px;">
          <h2 style="font-size: 20px; font-weight: bold; margin-bottom: 20px;">歡迎加入 LIGHTNING LIFESTYLE</h2>
          <p style="font-size: 14px; color: #666; line-height: 1.6;">您好 ${accountId}，感謝您的註冊！請選擇以下其中一種方式完成電子郵件驗證：</p>
          
          <!-- 方式一：6 位數驗證碼 -->
          <div style="background: #fafafa; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
            <p style="font-size: 13px; color: #888; margin-bottom: 10px;">方式一：在註冊頁面輸入 6 位數驗證碼</p>
            <div style="font-size: 28px; font-weight: bold; background: #FEF9C3; padding: 12px 24px; display: inline-block; border-radius: 6px; letter-spacing: 6px; color: #111;">
              ${verificationCode}
            </div>
          </div>

          <p style="text-align: center; font-size: 13px; color: #aaa; margin: 15px 0;">—— 或者 ——</p>

          <!-- 方式二：點擊按鈕驗證 -->
          <div style="text-align: center; margin: 20px 0;">
            <p style="font-size: 13px; color: #888; margin-bottom: 10px;">方式二：直接點擊下方按鈕</p>
            <a href="${verifyUrl}" style="background: #111111; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; display: inline-block; font-size: 14px; font-weight: 600;">
              立即驗證帳號
            </a>
          </div>

          <p style="font-size: 12px; color: #aaa; margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px;">
            如果這不是您的本人操作，請忽略此郵件。
          </p>
        </div>
      `,
    });

    if (error) {
      return NextResponse.json({ success: false, error }, { status: 400 });
    }

    // 4. 將驗證碼存入 Firestore (以 email 為文件 ID)
    await db.collection('verifications').doc(email).set({
      code: verificationCode,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      verified: false
    });

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: { message: err.message } }, { status: 500 });
  }
}