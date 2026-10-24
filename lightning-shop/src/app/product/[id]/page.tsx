import { Suspense } from 'react';
import { connection } from 'next/server';
import ProductDetailClient from './product-detail-client';
import { db } from '@/lib/firebase';

interface PageProps {
  params: Promise<{ id: string }>;
}

async function getProductData(id: string) {
  try {
    const doc = await db.collection("products").doc(id).get();
    if (doc.exists) {
      return { id: doc.id, ...doc.data() };
    }
  } catch (error) {
    console.error("伺服器端讀取錯誤:", error);
  }
  return null;
}

async function ProductContent({ params }: PageProps) {
  await connection(); // 🌟 將動態連線與參數讀取移至 <Suspense> 內的子元件

  const { id } = await params;
  const rawProduct = await getProductData(id);
  
  const initialProduct = rawProduct ? JSON.parse(JSON.stringify(rawProduct)) : null;
  if (initialProduct && initialProduct.createdAt) {
    delete initialProduct.createdAt;
  }

  return <ProductDetailClient initialId={id} initialProduct={initialProduct} />;
}

export default function ProductPage({ params }: PageProps) {
  return (
    <Suspense
      fallback={
        <div className="bg-white text-[#333333] min-h-screen flex items-center justify-center font-sans">
          <div className="text-[18px] text-[#888]">正在載入商品資料...</div>
        </div>
      }
    >
      <ProductContent params={params} />
    </Suspense>
  );
}