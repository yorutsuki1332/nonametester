import { Suspense } from 'react';
import CategoriesClient from './categories-client';

export default function CategoriesPage() {
  return (
    <Suspense fallback={<div className="bg-[#FAF7F2] pt-40 text-center text-[#7A6E65]">正在載入目錄...</div>}>
      <CategoriesClient />
    </Suspense>
  );
}
