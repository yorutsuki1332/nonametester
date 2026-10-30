import { NextResponse } from 'next/server';
import { Resend } from 'resend';

export async function POST(request: Request) {
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    
    const { email, accountId } = await request.json();

    const data = await resend.emails.send({
      from: 'LIGHTNING LIFESTYLE <onboarding@resend.dev>', // 正式上線後可替換為你的網域信箱
      to: [email], // 會員註冊時填寫的信箱
      subject: '【LIGHTNING】歡迎加入會員！註冊成功通知',
      html: `
        <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <h2 style="color: #111; border-bottom: 2px solid #FEF9C3; padding-bottom: 10px;">LIGHTNING LIFESTYLE</h2>
          <p>親愛的 <strong>${accountId}</strong> 會員您好，</p>
          <p>感謝您註冊成為 LIGHTNING LIFESTYLE 的會員！您的帳戶已經成功建立。</p>
          
          <div style="background: #fafafa; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>會員帳戶 ID：</strong> ${accountId}</p>
            <p style="margin: 5px 0;"><strong>綁定電子郵件：</strong> ${email}</p>
          </div>

          <p>現在您可以隨時登入會員中心，查看訂單記錄、追蹤物流進度或領取專屬優惠券！</p>
          <p>祝您有個美好的一天，購物愉快！</p>

          <p style="margin-top: 30px; font-size: 12px; color: #888;">此為系統自動發送信件，請勿直接回覆。</p>
        </div>
      `,
    });

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('發送註冊歡迎信失敗:', error);
    return NextResponse.json({ success: false, error }, { status: 500 });
  }
}