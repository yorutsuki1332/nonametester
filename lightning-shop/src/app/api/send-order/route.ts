import { NextResponse } from 'next/server';
import { Resend } from 'resend';

export async function POST(request: Request) {
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    
    const { email, orderId, total, items } = await request.json();

    const itemsListHtml = items
      .map((item: any) => `<li>${item.name} x ${item.quantity} - HKD $${item.price * item.quantity}</li>`)
      .join('');

    const data = await resend.emails.send({
      from: 'LIGHTNING LIFESTYLE <onboarding@resend.dev>',
      to: [email],
      subject: `【LIGHTNING】您的訂單 #${orderId} 已成功成立`,
      html: `
        <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <h2 style="color: #111; border-bottom: 2px solid #FEF9C3; padding-bottom: 10px;">LIGHTNING LIFESTYLE</h2>
          <p>親愛的會員您好，感謝您的購買！</p>
          <p>您的訂單已成功建立，以下是您的訂單詳細資訊：</p>
          
          <div style="background: #fafafa; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>訂單編號：</strong> #${orderId}</p>
            <p style="margin: 5px 0;"><strong>訂單總計：</strong> HKD $${Number(total).toFixed(1)}</p>
          </div>

          <h3>購買品項：</h3>
          <ul>
            ${itemsListHtml}
          </ul>

          <p style="margin-top: 30px; font-size: 12px; color: #888;">此為系統自動發送信件，請勿直接回覆。</p>
        </div>
      `,
    });

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('發送訂單郵件失敗:', error);
    return NextResponse.json({ success: false, error }, { status: 500 });
  }
}