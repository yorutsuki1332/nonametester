import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';

export async function POST(request) {
  const searchParams = request.nextUrl.searchParams;
  const filename = searchParams.get('filename');

  if (!filename) {
    return NextResponse.json({ error: '請提供檔名' }, { status: 400 });
  }

  try {
    // 將檔案上傳至 Vercel Blob，設定為公開存取
    const blob = await put(filename, request.body, {
      access: 'public',
    });

    return NextResponse.json(blob);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}