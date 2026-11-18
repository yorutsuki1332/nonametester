export function ProductCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-[#EBE5DF] bg-white" aria-hidden="true">
      <div className="h-64 animate-pulse bg-[#E7E0D8] sm:h-85" />
      <div className="space-y-3 p-4">
        <div className="h-4 w-3/4 animate-pulse rounded bg-[#E7E0D8]" />
        <div className="h-4 w-1/3 animate-pulse rounded bg-[#E7E0D8]" />
        <div className="flex gap-2">
          <div className="h-4 w-4 animate-pulse rounded-full bg-[#E7E0D8]" />
          <div className="h-4 w-4 animate-pulse rounded-full bg-[#E7E0D8]" />
          <div className="h-4 w-4 animate-pulse rounded-full bg-[#E7E0D8]" />
        </div>
      </div>
    </div>
  );
}

export function ProductSkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }, (_, index) => (
        <ProductCardSkeleton key={index} />
      ))}
    </>
  );
}

export function ProductDetailSkeleton() {
  return (
    <div className="min-h-screen bg-[#FAF7F2] px-[5%] pt-33.75 font-sans" aria-busy="true" aria-label="正在載入選品">
      <div className="mx-auto grid max-w-275 grid-cols-1 gap-10 md:grid-cols-2">
        <div className="h-87.5 animate-pulse rounded-2xl bg-[#E7E0D8] md:h-125" />
        <div className="space-y-4 py-2.5">
          <div className="h-4 w-40 animate-pulse rounded bg-[#E7E0D8]" />
          <div className="h-8 w-4/5 animate-pulse rounded bg-[#E7E0D8]" />
          <div className="h-6 w-32 animate-pulse rounded bg-[#E7E0D8]" />
          <div className="flex gap-2">
            <div className="h-5 w-5 animate-pulse rounded-full bg-[#E7E0D8]" />
            <div className="h-5 w-5 animate-pulse rounded-full bg-[#E7E0D8]" />
            <div className="h-5 w-5 animate-pulse rounded-full bg-[#E7E0D8]" />
          </div>
          <div className="h-24 animate-pulse rounded bg-[#E7E0D8]" />
          <div className="h-12 animate-pulse rounded-xl bg-[#E7E0D8]" />
        </div>
      </div>
    </div>
  );
}
