import { NextResponse } from 'next/server';
import { sendOrderMail } from '@/lib/email';

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: '無法讀取信件內容' }, { status: 400 });
  }

  const result = await sendOrderMail(body);
  if (!result.ok) {
    return NextResponse.json({ success: false, error: result.error }, { status: result.status });
  }
  return NextResponse.json({ success: true });
}
