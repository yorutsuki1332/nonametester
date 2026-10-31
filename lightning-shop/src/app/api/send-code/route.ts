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

    const resend = new Resend(apiKey);
    const { email, accountId } = await request.json();
    
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const host = request.headers.get('host') || 'localhost:3000';
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const verifyUrl = `${protocol}://${host}/verify?email=${encodeURIComponent(email)}&code=${verificationCode}`;

    // 🌟 加入隨機 ID 避免 Gmail 自動折疊郵件內容 (Threading)
    const randomSeed = Math.random().toString(36).substring(7);

    const { data, error } = await resend.emails.send({
      from: 'LIGHTNING LIFESTYLE <onboarding@resend.dev>',
      to: [email],
      subject: `【LIGHTNING LIFESTYLE】您的帳號驗證信 (${verificationCode})`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; background-color: #ffffff; color: #111111; border: 1px solid #f0f0f0; border-radius: 12px;">
          <h2 style="font-size: 20px; font-weight: bold; margin-bottom: 20px; color: #111111;">歡迎加入 LIGHTNING LIFESTYLE</h2>
          <p style="font-size: 14px; color: #555555; line-height: 1.6;">您好 <strong>${accountId}</strong>，感謝您的註冊！請選擇以下其中一種方式完成電子郵件驗證：</p>
          
          <!-- 方式一：6 位數驗證碼 (強制深色文字與亮色背景) -->
          <div style="background-color: #fafafa; padding: 24px; border-radius: 8px; margin: 24px 0; text-align: center; border: 1px solid #f0f0f0;">
            <p style="font-size: 13px; color: #666666; margin-top: 0; margin-bottom: 12px;">方式一：在註冊頁面輸入 6 位數驗證碼</p>
            <div style="font-size: 32px; font-weight: 800; background-color: #FEF9C3; color: #111111 !important; padding: 14px 28px; display: inline-block; border-radius: 8px; letter-spacing: 8px; border: 1px solid #f0e9aa;">
              ${verificationCode}
            </div>
          </div>

          <p style="text-align: center; font-size: 13px; color: #999999; margin: 20px 0;">—— 或者 ——</p>

          <!-- 方式二：點擊按鈕驗證 -->
          <div style="text-align: center; margin: 24px 0;">
            <p style="font-size: 13px; color: #666666; margin-top: 0; margin-bottom: 12px;">方式二：直接點擊下方按鈕</p>
            <a href="${verifyUrl}" style="background-color: #111111; color: #ffffff !important; padding: 14px 32px; text-decoration: none; border-radius: 8px; display: inline-block; font-size: 14px; font-weight: 600;">
              立即驗證帳號
            </a>
          </div>

          <p style="font-size: 12px; color: #aaaaaa; margin-top: 32px; border-top: 1px solid #eeeeee; padding-top: 20px; text-align: center;">
            如果這不是您的本人操作，請忽略此郵件。
          </p>
          <span style="display:none; font-size: 1px; color: #ffffff; opacity: 0;">Ref: ${randomSeed}</span>
        </div>
      `,
    });

    if (error) {
      return NextResponse.json({ success: false, error }, { status: 400 });
    }

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