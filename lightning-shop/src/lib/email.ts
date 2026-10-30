import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendOrderConfirmationEmail(toEmail: string, orderId: string, total: number, items: any[]) {
  try {
    const itemsListHtml = items.map(item => `<li>${item.name} x ${item.quantity} - HKD $${item.price * item.quantity}</li>`).join('');

    const data = await resend.emails.send({
      from: 'LIGHTNING LIFESTYLE <onboarding@resend.dev>', // 正式上線後可換成你的網域信箱
      to: [toEmail], // 會員綁定的電郵地址
      subject: `【LIGHTNING】您的訂單 #${orderId} 已成功成立`,
      html: `
        <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <h2 style="color: #111; border-bottom: 2px solid #FEF9C3; padding-bottom: 10px;">LIGHTNING LIFESTYLE</h2>
          <p>親愛的會員您好，感謝您的購買！</p>
          <p>您的訂單已成功建立，以下是您的訂單詳細資訊：</p>
          
          <div style="background: #fafafa; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>訂單編號：</strong> #${orderId}</p>
            <p style="margin: 5px 0;"><strong>訂單總計：</strong> HKD $${total.toFixed(1)}</p>
          </div>

          <h3>購買品項：</h3>
          <ul>
            ${itemsListHtml}
          </ul>

          <p style="margin-top: 30px; font-size: 12px; color: #888;">此為系統自動發送信件請勿直接回覆。如有任何問題請隨時與我們聯繫。</p>
        </div>
      `,
    });

    return { success: true, data };
  } catch (error) {
    console.error('發送郵件失敗:', error);
    return { success: false, error };
  }
}