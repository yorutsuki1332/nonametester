import { Suspense } from 'react';
import { connection } from 'next/server';
import ProductDetailClient from './product-detail-client';
import { ProductDetailSkeleton } from '@/components/ProductSkeleton';
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
  await connection();

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
      fallback={<ProductDetailSkeleton />}
    >
      <ProductContent params={params} />
    </Suspense>
  );
}